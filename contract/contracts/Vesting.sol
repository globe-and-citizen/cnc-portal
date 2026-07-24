// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {OwnableUpgradeable} from "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import {PausableUpgradeable} from "@openzeppelin/contracts-upgradeable/utils/PausableUpgradeable.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {IInvestor} from "./interfaces/IInvestor.sol";
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
contract Vesting is OwnableUpgradeable, ReentrancyGuard, PausableUpgradeable {
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

  /// @dev All vesting schedules per member, addressed by index (append-only).
  mapping(address member => VestingInfo[] schedules) private s_vestings;
  /// @dev Every member that has ever had a schedule.
  address[] private s_members;
  /// @dev Whether an address is tracked in {s_members}.
  mapping(address account => bool tracked) private s_isMember;
  /// @dev Officer contract address (set at init); source of the Investor address.
  address private s_officerAddress;

  /// @dev Reserved storage slots for future upgrades.
  uint256[50] private __gap; // solhint-disable-line chainlink-solidity/prefix-storage-variables-with-s-underscore

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
  error Vesting__ZeroAddress();
  /// @dev The caller (msg.sender) was the zero address when assigning officerAddress.
  error Vesting__ZeroSender();
  /// @dev The cliff duration exceeds the vesting duration.
  error Vesting__CliffExceedsDuration();
  /// @dev No schedule exists at the given index for this member.
  error Vesting__IndexOutOfBounds();
  /// @dev The targeted schedule is not active.
  error Vesting__VestingNotActive();
  /// @dev The releasable amount is zero.
  error Vesting__NothingToRelease();
  /// @dev The officer contract address has not been configured on this contract.
  error Vesting__OfficerAddressNotSet();
  /// @dev The InvestorV1 contract could not be located via the Officer.
  error Vesting__InvestorContractNotFound();
  /// @dev This contract does not hold MINTER_ROLE on InvestorV1.
  error Vesting__InsufficientMinterRole();

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
    if (member == address(0)) revert Vesting__ZeroAddress();
    if (duration < cliff) revert Vesting__CliffExceedsDuration();

    uint256 index = s_vestings[member].length;
    s_vestings[member].push(
      VestingInfo({
        start: start,
        duration: duration,
        cliff: cliff,
        totalAmount: totalAmount,
        released: 0,
        active: true
      })
    );

    if (!s_isMember[member]) {
      s_members.push(member);
      s_isMember[member] = true;
    }

    emit VestingCreated(member, index, totalAmount);
  }

  /**
   * @notice Mint the caller's releasable share tokens for one of their schedules.
   * @dev Updates `released` before minting (checks-effects-interactions).
   * @param index The schedule's index in the caller's `vestings` array.
   */
  function release(uint256 index) external nonReentrant whenNotPaused {
    if (index >= s_vestings[msg.sender].length) revert Vesting__IndexOutOfBounds();
    VestingInfo storage v = s_vestings[msg.sender][index];
    if (!v.active) revert Vesting__VestingNotActive();

    uint256 amount = releasable(msg.sender, index);
    if (amount == 0) revert Vesting__NothingToRelease();

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
    if (index >= s_vestings[member].length) revert Vesting__IndexOutOfBounds();
    VestingInfo storage v = s_vestings[member][index];
    if (!v.active) revert Vesting__VestingNotActive();

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
    return s_vestings[member].length;
  }

  /// @notice Get all vesting schedules for a member (active + stopped).
  /// @param member The member whose schedules are returned.
  function getVestings(address member) external view returns (VestingInfo[] memory) {
    return s_vestings[member];
  }

  /// @notice Whether an address is tracked as a member.
  /// @param account The address to query.
  function getIsMember(address account) external view returns (bool) {
    return s_isMember[account];
  }

  /// @notice Returns the Officer contract address.
  function getOfficerAddress() external view returns (address) {
    return s_officerAddress;
  }

  /// @notice Get every member that has ever had a schedule.
  function getMembers() external view returns (address[] memory) {
    return s_members;
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
    __Pausable_init();

    if (msg.sender == address(0)) revert Vesting__ZeroSender();
    s_officerAddress = msg.sender;
  }

  /// @notice Get the amount vested for one of a member's schedules at the current time.
  function vestedAmount(address member, uint256 index) public view returns (uint256) {
    if (index >= s_vestings[member].length) revert Vesting__IndexOutOfBounds();
    VestingInfo memory v = s_vestings[member][index];
    if (!v.active) return 0;

    return
      _vestingSchedule({
        totalAllocation: v.totalAmount,
        start: v.start,
        cliff: v.cliff,
        duration: v.duration,
        timestamp: uint64(block.timestamp)
      });
  }

  /// @notice Get the releasable (vested minus already minted) amount for one schedule.
  function releasable(address member, uint256 index) public view returns (uint256) {
    uint256 vested = vestedAmount(member, index);
    return vested - s_vestings[member][index].released;
  }

  /// @notice Current contract version, per semver.
  function version() public pure returns (string memory) {
    return "2.0.0";
  }

  /**
   * @dev Resolve the team's InvestorV1 share token through the Officer and mint to `to`.
   *      Mirrors SafeDepositRouter: explicit officer/investor lookup and an upfront
   *      MINTER_ROLE check so a missing grant reverts with a clear error.
   */
  function _mintShares(address to, uint256 amount) internal {
    IInvestor investor = IInvestor(_getInvestor());
    if (!investor.hasRole(investor.MINTER_ROLE(), address(this)))
      revert Vesting__InsufficientMinterRole();
    investor.individualMint(to, amount);
  }

  /**
   * @dev Resolve the team's Investor (V2) address via the Officer registry.
   */
  function _getInvestor() internal view returns (address) {
    if (s_officerAddress == address(0)) revert Vesting__OfficerAddressNotSet();
    address investorAddress = IOfficer(s_officerAddress).findDeployedContract("Investor");
    if (investorAddress == address(0)) revert Vesting__InvestorContractNotFound();
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
    uint256 membersLength = s_members.length;
    uint256 count = 0;
    for (uint256 i = 0; i < membersLength; i++) {
      VestingInfo[] storage schedules = s_vestings[s_members[i]];
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
      VestingInfo[] storage schedules = s_vestings[s_members[i]];
      uint256 schedulesLength = schedules.length;
      for (uint256 j = 0; j < schedulesLength; j++) {
        if (schedules[j].active == wantActive) {
          outMembers[k] = s_members[i];
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
}
