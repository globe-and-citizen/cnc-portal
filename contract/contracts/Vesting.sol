// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {OwnableUpgradeable} from "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import {PausableUpgradeable} from "@openzeppelin/contracts-upgradeable/utils/PausableUpgradeable.sol";
import {ReentrancyGuardUpgradeable} from "@openzeppelin/contracts-upgradeable/utils/ReentrancyGuardUpgradeable.sol";
import {IInvestorV1} from "./interfaces/IInvestorV1.sol";
import {IOfficer} from "./interfaces/IOfficer.sol";

/**
 * @title Vesting
 * @notice Per-team share vesting with cliff, linear release, and owner-initiated stop.
 * @dev Deployed per team via the Officer beacon registry. A vesting schedule is an
 *      *agreement only* — no tokens move when it is created. The team's `InvestorV1`
 *      share token is minted on demand, capped to the amount that has actually vested,
 *      at the moment the member calls {release} (or when the owner {stopVesting}s).
 *      The Investor address is resolved through the Officer, so this contract holds
 *      no `tokenAddress` and requires no pre-funding or ERC20 approvals.
 *
 *      A member can hold **several** schedules at once (initial grant, refreshers,
 *      …): each is appended to the member's `vestings` array and addressed by its
 *      index. Schedules are never removed — a stopped one keeps its slot with
 *      `active = false`, a fully released one stays `active = true`.
 */
contract Vesting is OwnableUpgradeable, ReentrancyGuardUpgradeable, PausableUpgradeable {
  /**
   * @dev Vesting schedule parameters for a single grant.
   * @param start Vesting start timestamp.
   * @param duration Total vesting duration in seconds.
   * @param cliff Cliff period in seconds (counted from start).
   * @param totalAmount Total tokens promised to vest.
   * @param released Amount of tokens already minted to the member.
   * @param active Whether the schedule is live (false once stopped).
   */
  struct VestingInfo {
    uint64 start; // Vesting start time
    uint64 duration; // Vesting duration
    uint64 cliff; // Cliff period
    uint256 totalAmount; // Total tokens promised to vest
    uint256 released; // Already minted
    bool active; // Whether the schedule is live
  }

  /// @notice All vesting schedules per member, addressed by index (append-only).
  mapping(address member => VestingInfo[] schedules) public vestings;
  /// @notice Every member that has ever had a schedule.
  address[] public members;
  /// @notice Whether an address is tracked in {members}.
  mapping(address account => bool tracked) public isMember;
  /// @notice Officer contract address (set at init); source of the Investor address.
  address public officerAddress;

  /**
   * @notice Emitted when a new vesting schedule is created for a member.
   * @param member The member receiving the vesting.
   * @param index The schedule's index in the member's `vestings` array.
   * @param amount Total amount promised to vest.
   */
  event VestingCreated(address indexed member, uint256 index, uint256 amount);
  /**
   * @notice Emitted when vested share tokens are minted to a member.
   * @param member The member receiving the tokens.
   * @param index The schedule's index in the member's `vestings` array.
   * @param amount Amount minted.
   */
  event TokensReleased(address indexed member, uint256 index, uint256 amount);
  /**
   * @notice Emitted when a vesting schedule is stopped.
   * @param member The member whose vesting was stopped.
   * @param index The schedule's index in the member's `vestings` array.
   */
  event VestingStopped(address indexed member, uint256 index);

  /// @dev A required address argument was the zero address.
  error ZeroAddress();
  /// @dev The caller (msg.sender) was the zero address when assigning officerAddress.
  error ZeroSender();
  /// @dev The cliff duration exceeds the vesting duration.
  error CliffExceedsDuration();
  /// @dev No schedule exists at the given index for this member.
  error IndexOutOfBounds();
  /// @dev The targeted schedule is not active.
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
   * @notice Append a vesting schedule for a member. Agreement only — no tokens move.
   * @dev Members may hold multiple concurrent schedules; no uniqueness check.
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

    uint256 index = vestings[member].length;
    vestings[member].push(
      VestingInfo({
        start: start,
        duration: duration,
        cliff: cliff,
        totalAmount: totalAmount,
        released: 0,
        active: true
      })
    );

    if (!isMember[member]) {
      members.push(member);
      isMember[member] = true;
    }

    emit VestingCreated(member, index, totalAmount);
  }

  /**
   * @notice Mint the caller's releasable share tokens for one of their schedules.
   * @dev Updates `released` before minting (checks-effects-interactions).
   * @param index The schedule's index in the caller's `vestings` array.
   */
  function release(uint256 index) external nonReentrant whenNotPaused {
    if (index >= vestings[msg.sender].length) revert IndexOutOfBounds();
    VestingInfo storage v = vestings[msg.sender][index];
    if (!v.active) revert VestingNotActive();

    uint256 amount = releasable(msg.sender, index);
    if (amount == 0) revert NothingToRelease();

    v.released += amount;
    _mintShares(msg.sender, amount);

    emit TokensReleased(msg.sender, index, amount);
  }

  /**
   * @notice Stop one of a member's schedules. Mints whatever is already releasable to
   *         the member and drops the rest. The schedule is kept (active = false).
   * @param member Address whose schedule is stopped.
   * @param index The schedule's index in the member's `vestings` array.
   */
  function stopVesting(
    address member,
    uint256 index
  ) external onlyOwner nonReentrant whenNotPaused {
    if (index >= vestings[member].length) revert IndexOutOfBounds();
    VestingInfo storage v = vestings[member][index];
    if (!v.active) revert VestingNotActive();

    // Effects before interactions: deactivate and book the release before minting.
    uint256 releasableAmount = releasable(member, index);
    v.active = false;
    if (releasableAmount > 0) {
      v.released += releasableAmount;
      _mintShares(member, releasableAmount);
      emit TokensReleased(member, index, releasableAmount);
    }

    emit VestingStopped(member, index);
  }

  /// @notice Pauses the contract, blocking vesting operations.
  function pause() external onlyOwner {
    _pause();
  }

  /// @notice Unpauses the contract, restoring normal operation.
  function unpause() external onlyOwner {
    _unpause();
  }

  /// @notice Number of schedules a member holds (active + stopped).
  function getVestingCount(address member) external view returns (uint256) {
    return vestings[member].length;
  }

  /// @notice Get every member that has ever had a schedule.
  function getMembers() external view returns (address[] memory) {
    return members;
  }

  /**
   * @notice Returns every active schedule with its member and array index.
   * @dev The three arrays are parallel; `indices[i]` is the schedule's position in
   *      `vestings[activeMembers[i]]`, so a member appears once per active schedule.
   * @return activeMembers Member address for each active schedule.
   * @return indices Schedule index for each active schedule.
   * @return infos VestingInfo for each active schedule.
   */
  function getVestingsWithMembers()
    external
    view
    returns (address[] memory activeMembers, uint256[] memory indices, VestingInfo[] memory infos)
  {
    return _flatten(true);
  }

  /**
   * @notice Returns every stopped schedule with its member and array index.
   * @return archivedMembers Member address for each stopped schedule.
   * @return indices Schedule index for each stopped schedule.
   * @return archivedInfos VestingInfo for each stopped schedule.
   */
  function getAllArchivedVestingsFlat()
    external
    view
    returns (
      address[] memory archivedMembers,
      uint256[] memory indices,
      VestingInfo[] memory archivedInfos
    )
  {
    return _flatten(false);
  }

  /// @notice Returns the current block timestamp.
  function getCurrentTimestamp() external view returns (uint256) {
    return block.timestamp;
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

  /// @notice Get the amount vested for one of a member's schedules at the current time.
  function vestedAmount(address member, uint256 index) public view returns (uint256) {
    if (index >= vestings[member].length) revert IndexOutOfBounds();
    VestingInfo memory v = vestings[member][index];
    if (!v.active) return 0;

    return _vestingSchedule(v.totalAmount, v.start, v.cliff, v.duration, uint64(block.timestamp));
  }

  /// @notice Get the releasable (vested minus already minted) amount for one schedule.
  function releasable(address member, uint256 index) public view returns (uint256) {
    uint256 vested = vestedAmount(member, index);
    return vested - vestings[member][index].released;
  }

  /**
   * @dev Resolve the team's InvestorV1 share token through the Officer and mint to `to`.
   *      Mirrors SafeDepositRouter: explicit officer/investor lookup and an upfront
   *      MINTER_ROLE check so a missing grant reverts with a clear error.
   */
  function _mintShares(address to, uint256 amount) internal {
    IInvestorV1 investor = IInvestorV1(_getInvestor());
    if (!investor.hasRole(investor.MINTER_ROLE(), address(this))) revert InsufficientMinterRole();
    investor.individualMint(to, amount);
  }

  /**
   * @dev Resolve the team's InvestorV1 address via the Officer registry.
   *      Mirrors SafeDepositRouter._getInvestorAddress.
   */
  function _getInvestor() internal view returns (address) {
    if (officerAddress == address(0)) revert OfficerAddressNotSet();
    address investorAddress = IOfficer(officerAddress).findDeployedContract("InvestorV1");
    if (investorAddress == address(0)) revert InvestorContractNotFound();
    return investorAddress;
  }

  /// @dev Flatten every member's schedules whose `active` flag equals `wantActive`.
  function _flatten(
    bool wantActive
  )
    internal
    view
    returns (
      address[] memory outMembers,
      uint256[] memory outIndices,
      VestingInfo[] memory outInfos
    )
  {
    uint256 membersLength = members.length;
    uint256 count = 0;
    for (uint256 i = 0; i < membersLength; i++) {
      VestingInfo[] storage schedules = vestings[members[i]];
      uint256 schedulesLength = schedules.length;
      for (uint256 j = 0; j < schedulesLength; j++) {
        if (schedules[j].active == wantActive) {
          count++;
        }
      }
    }

    outMembers = new address[](count);
    outIndices = new uint256[](count);
    outInfos = new VestingInfo[](count);

    uint256 k = 0;
    for (uint256 i = 0; i < membersLength; i++) {
      VestingInfo[] storage schedules = vestings[members[i]];
      uint256 schedulesLength = schedules.length;
      for (uint256 j = 0; j < schedulesLength; j++) {
        if (schedules[j].active == wantActive) {
          outMembers[k] = members[i];
          outIndices[k] = j;
          outInfos[k] = schedules[j];
          k++;
        }
      }
    }
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

  /// @dev Reserved storage slots for future upgrades.
  // solhint-disable-next-line chainlink-solidity/prefix-storage-variables-with-s-underscore
  uint256[50] private __gap;
}
