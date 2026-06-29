// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import '@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol';
import '@openzeppelin/contracts-upgradeable/utils/ReentrancyGuardUpgradeable.sol';
import '@openzeppelin/contracts-upgradeable/utils/PausableUpgradeable.sol';
import {IInvestorV1} from './interfaces/IInvestorV1.sol';
import {IOfficer} from './interfaces/IOfficer.sol';

/**
 * @title Vesting
 * @notice Per-team share vesting with cliff, linear release, and owner-initiated stop.
 * @dev Deployed per team via the Officer beacon registry. A vesting schedule is an
 *      *agreement only* — no tokens move when it is created. The team's `InvestorV1`
 *      share token is minted on demand, capped to the amount that has actually vested,
 *      at the moment the member calls {release} (or when the owner {stopVesting}s).
 *      The Investor address is resolved through the Officer, so this contract holds
 *      no `tokenAddress` and requires no pre-funding or ERC20 approvals.
 */
contract Vesting is OwnableUpgradeable, ReentrancyGuardUpgradeable, PausableUpgradeable {
  /**
   * @dev Vesting schedule parameters for a single member.
   * @param start Vesting start timestamp.
   * @param duration Total vesting duration in seconds.
   * @param cliff Cliff period in seconds (counted from start).
   * @param totalAmount Total tokens promised to vest.
   * @param released Amount of tokens already minted to the member.
   * @param active Whether the vesting is active.
   */
  struct VestingInfo {
    uint64 start; // Vesting start time
    uint64 duration; // Vesting duration
    uint64 cliff; // Cliff period
    uint256 totalAmount; // Total tokens promised to vest
    uint256 released; // Already minted
    bool active; // Whether the vesting is active
  }

  /// @notice Active vesting schedule for each member.
  mapping(address => VestingInfo) public vestings;
  /// @notice Stopped/replaced schedules kept for history, per member.
  mapping(address => VestingInfo[]) public archivedVestings;
  /// @notice Every member that has ever had a schedule.
  address[] public members;
  /// @notice Whether an address is tracked in {members}.
  mapping(address => bool) public isMember;
  /// @notice Officer contract address (set at init); source of the Investor address.
  address public officerAddress;

  /**
   * @notice Emitted when a new vesting schedule is created for a member.
   * @param member The member receiving the vesting.
   * @param amount Total amount promised to vest.
   */
  event VestingCreated(address indexed member, uint256 amount);
  /**
   * @notice Emitted when vested share tokens are minted to a member.
   * @param member The member receiving the tokens.
   * @param amount Amount minted.
   */
  event TokensReleased(address indexed member, uint256 amount);
  /**
   * @notice Emitted when a vesting schedule is stopped.
   * @param member The member whose vesting was stopped.
   */
  event VestingStopped(address indexed member);

  /// @dev A required address argument was the zero address.
  error ZeroAddress();
  /// @dev The caller (msg.sender) was the zero address when assigning officerAddress.
  error ZeroSender();
  /// @dev The cliff duration exceeds the vesting duration.
  error CliffExceedsDuration();
  /// @dev A vesting already exists for this member.
  /// @param member The member address.
  error VestingAlreadyExists(address member);
  /// @dev There is no active vesting for this member.
  error VestingNotActive();
  /// @dev The releasable amount is zero.
  error NothingToRelease();
  /// @dev The officer contract address has not been configured on this contract.
  error OfficerAddressNotSet();
  /// @dev The InvestorV1 contract could not be located via the Officer.
  error InvestorContractNotFound();
  /// @dev This contract does not hold MINTER_ROLE on InvestorV1.
  error InsufficientMinterRole();

  /// @custom:oz-upgrades-unsafe-allow constructor
  constructor() {
    _disableInitializers();
  }

  /**
   * @notice Initializer instead of constructor for proxy compatibility.
   * @dev `officerAddress` is taken from `msg.sender`, which is the Officer deploying
   *      this proxy via its beacon registry (mirrors SafeDepositRouter).
   */
  function initialize() public initializer {
    __Ownable_init(msg.sender);
    __ReentrancyGuard_init();
    __Pausable_init();

    if (msg.sender == address(0)) revert ZeroSender();
    officerAddress = msg.sender;
  }

  /**
   * @notice Create a vesting schedule for a member. Agreement only — no tokens move.
   * @param member Address receiving the vesting.
   * @param start Vesting start timestamp.
   * @param duration Total vesting duration in seconds.
   * @param cliff Cliff period in seconds (counted from start).
   * @param totalAmount Total tokens promised to vest.
   */
  function addVesting(
    address member,
    uint64 start,
    uint64 duration,
    uint64 cliff,
    uint256 totalAmount
  ) external onlyOwner whenNotPaused {
    if (member == address(0)) revert ZeroAddress();
    if (duration < cliff) revert CliffExceedsDuration();
    if (vestings[member].active) revert VestingAlreadyExists(member);

    vestings[member] = VestingInfo({
      start: start,
      duration: duration,
      cliff: cliff,
      totalAmount: totalAmount,
      released: 0,
      active: true
    });

    if (!isMember[member]) {
      members.push(member);
      isMember[member] = true;
    }

    emit VestingCreated(member, totalAmount);
  }

  /**
   * @notice Mint the caller's releasable share tokens on demand.
   * @dev Updates `released` before minting (checks-effects-interactions).
   */
  function release() external nonReentrant whenNotPaused {
    VestingInfo storage v = vestings[msg.sender];
    if (!v.active) revert VestingNotActive();

    uint256 amount = releasable(msg.sender);
    if (amount == 0) revert NothingToRelease();

    v.released += amount;
    _mintShares(msg.sender, amount);

    emit TokensReleased(msg.sender, amount);
  }

  /**
   * @notice Stop a member's vesting. Mints whatever is already releasable to the member,
   *         archives the schedule, and drops the rest. No "return unvested" path is needed.
   * @param member Address whose vesting is stopped.
   */
  function stopVesting(address member) external onlyOwner nonReentrant whenNotPaused {
    VestingInfo storage v = vestings[member];
    if (!v.active) revert VestingNotActive();

    uint256 releasableAmount = releasable(member);
    if (releasableAmount > 0) {
      v.released += releasableAmount;
      _mintShares(member, releasableAmount);
      emit TokensReleased(member, releasableAmount);
    }

    v.active = false;
    archivedVestings[member].push(v);
    delete vestings[member];

    emit VestingStopped(member);
  }

  /**
   * @dev Resolve the team's InvestorV1 share token through the Officer and mint to `to`.
   *      Mirrors SafeDepositRouter: explicit officer/investor lookup and an upfront
   *      MINTER_ROLE check so a missing grant reverts with a clear error.
   */
  function _mintShares(address to, uint256 amount) internal {
    IInvestorV1 investor = IInvestorV1(_getInvestor());
    if (!investor.hasRole(investor.MINTER_ROLE(), address(this))) {
      revert InsufficientMinterRole();
    }
    investor.individualMint(to, amount);
  }

  /**
   * @dev Resolve the team's InvestorV1 address via the Officer registry.
   *      Mirrors SafeDepositRouter._getInvestorAddress.
   */
  function _getInvestor() internal view returns (address) {
    if (officerAddress == address(0)) revert OfficerAddressNotSet();
    address investorAddress = IOfficer(officerAddress).findDeployedContract('InvestorV1');
    if (investorAddress == address(0)) revert InvestorContractNotFound();
    return investorAddress;
  }

  /**
   * @dev Calculates the amount of tokens vested at a given timestamp.
   * Tokens are locked until the cliff period ends. After the cliff,
   * vesting is linear until the full duration is reached.
   *
   * @param totalAllocation Total amount of tokens allocated for vesting
   * @param start Timestamp when vesting starts
   * @param cliff Duration (in seconds) of the cliff period
   * @param duration Total vesting duration (in seconds)
   * @param timestamp Current timestamp to calculate vested amount
   * @return Amount of tokens vested at the given timestamp
   */
  function _vestingSchedule(
    uint256 totalAllocation,
    uint256 start,
    uint256 cliff,
    uint256 duration,
    uint256 timestamp
  ) internal pure returns (uint256) {
    if (timestamp < start + cliff) {
      return 0;
    } else if (timestamp >= start + duration) {
      return totalAllocation;
    } else {
      return (totalAllocation * (timestamp - start)) / duration;
    }
  }

  /// @notice Get the amount vested for a member at the current time.
  function vestedAmount(address member) public view returns (uint256) {
    VestingInfo memory v = vestings[member];
    if (!v.active) return 0;

    return _vestingSchedule(v.totalAmount, v.start, v.cliff, v.duration, uint64(block.timestamp));
  }

  /// @notice Get the releasable (vested minus already minted) amount for a member.
  function releasable(address member) public view returns (uint256) {
    uint256 vested = vestedAmount(member);
    return vested - vestings[member].released;
  }

  /// @notice Get every member that has ever had a schedule.
  function getMembers() external view returns (address[] memory) {
    return members;
  }

  /**
   * @notice Returns members with an active vesting and their schedules.
   * @return activeMembers Array of member addresses with an active vesting.
   * @return infos Array of VestingInfo structs, parallel to `activeMembers`.
   */
  function getVestingsWithMembers()
    external
    view
    returns (address[] memory activeMembers, VestingInfo[] memory infos)
  {
    uint256 count = 0;
    for (uint256 i = 0; i < members.length; i++) {
      if (vestings[members[i]].active) {
        count++;
      }
    }

    activeMembers = new address[](count);
    infos = new VestingInfo[](count);

    uint256 j = 0;
    for (uint256 i = 0; i < members.length; i++) {
      VestingInfo memory v = vestings[members[i]];
      if (v.active) {
        activeMembers[j] = members[i];
        infos[j] = v;
        j++;
      }
    }

    return (activeMembers, infos);
  }

  /**
   * @notice Returns all archived vestings, flattened. The two arrays are parallel:
   *         each index is one archived vesting, even if a member appears multiple times.
   * @return archivedMembers Array of member addresses, one per archived vesting.
   * @return archivedInfos Array of VestingInfo structs, one per archived vesting.
   */
  function getAllArchivedVestingsFlat()
    external
    view
    returns (address[] memory archivedMembers, VestingInfo[] memory archivedInfos)
  {
    uint256 totalArchived = 0;
    for (uint256 i = 0; i < members.length; i++) {
      totalArchived += archivedVestings[members[i]].length;
    }

    archivedMembers = new address[](totalArchived);
    archivedInfos = new VestingInfo[](totalArchived);

    uint256 idx = 0;
    for (uint256 i = 0; i < members.length; i++) {
      VestingInfo[] storage archived = archivedVestings[members[i]];
      for (uint256 j = 0; j < archived.length; j++) {
        archivedMembers[idx] = members[i];
        archivedInfos[idx] = archived[j];
        idx++;
      }
    }

    return (archivedMembers, archivedInfos);
  }

  /// @notice Returns the current block timestamp.
  function getCurrentTimestamp() external view returns (uint256) {
    return block.timestamp;
  }

  /// @notice Pauses the contract, blocking vesting operations.
  function pause() external onlyOwner {
    _pause();
  }

  /// @notice Unpauses the contract, restoring normal operation.
  function unpause() external onlyOwner {
    _unpause();
  }

  /// @dev Reserved storage slots for future upgrades.
  uint256[50] private __gap;
}
