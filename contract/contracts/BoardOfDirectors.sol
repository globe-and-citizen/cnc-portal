// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Initializable} from "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {EnumerableSet} from "@openzeppelin/contracts/utils/structs/EnumerableSet.sol";
import {IBoardOfDirectors} from "./interfaces/IBoardOfDirectors.sol";

/**
 * @title BoardOfDirectors
 * @dev A contract that manages a board of directors and their actions.
 */
contract BoardOfDirectors is Initializable, ReentrancyGuard, IBoardOfDirectors {
  using EnumerableSet for EnumerableSet.AddressSet;

  /**
   * @dev An action submitted for board approval and execution.
   * @param id Action identifier.
   * @param target Contract address the action calls into.
   * @param description Human-readable description.
   * @param approvalCount Number of current approvals.
   * @param isExecuted Whether the action has been executed.
   * @param data Calldata to be forwarded to the target.
   * @param createdBy Address that submitted the action.
   * @param approvals Approval state per approver.
   */
  struct Action {
    uint256 id;
    address target;
    string description;
    uint8 approvalCount;
    bool isExecuted;
    bytes data;
    address createdBy;
    mapping(address approver => bool approved) approvals;
  }

  /// @dev Set of owner addresses allowed to manage board membership.
  EnumerableSet.AddressSet private s_ownersSet;
  /// @dev Set of current board-of-directors members.
  EnumerableSet.AddressSet private s_boardOfDirectorsSet;
  /// @notice Total number of actions that have been added.
  uint256 private s_actionCount;

  /// @notice Maps an action id to its action record.
  mapping(uint256 actionId => Action action) private s_actions;

  /// @dev Storage gap reserving 50 slots for future upgrades. Decrement when adding
  ///      new state variables above so the reserve stays constant and proxy slots don't shift.
  // solhint-disable-next-line chainlink-solidity/prefix-storage-variables-with-s-underscore
  uint256[50] private __gap;

  /// @notice Emitted when the board-of-directors set is replaced.
  event BoardOfDirectorsChanged(address[] boardOfDirectors);
  /// @notice Emitted when the owner set changes.
  event OwnersChanged(address[] owners);
  /**
   * @notice Emitted when a new action is added to the board.
   * @param id Action id.
   * @param target Target contract.
   * @param description Description of the action.
   * @param data Calldata payload for the action.
   */
  event ActionAdded(uint256 indexed id, address indexed target, string description, bytes data);
  /**
   * @notice Emitted when an action is executed.
   * @param id Action id.
   * @param target Target contract that was called.
   * @param description Description of the action.
   * @param data Calldata that was executed.
   */
  event ActionExecuted(uint256 indexed id, address indexed target, string description, bytes data);
  /**
   * @notice Emitted when a board member approves an action.
   * @param id Action id.
   * @param approver The approving board member.
   */
  event Approval(uint256 indexed id, address indexed approver);
  /**
   * @notice Emitted when a board member revokes their approval.
   * @param id Action id.
   * @param approver The approver revoking their vote.
   */
  event Revocation(uint256 indexed id, address indexed approver);

  /// @dev A required address argument was the zero address.
  error BoardOfDirectors__ZeroAddress();
  /// @dev The action has already been executed and cannot be modified.
  /// @param actionId The action id.
  error BoardOfDirectors__ActionAlreadyExecuted(uint256 actionId);
  /// @dev The caller has already approved this action.
  error BoardOfDirectors__AlreadyApproved();
  /// @dev The caller has not approved this action.
  error BoardOfDirectors__NotApproved();
  /// @dev The list must not be empty.
  error BoardOfDirectors__EmptyList();
  /// @dev The owner is already registered.
  /// @param owner The owner address.
  error BoardOfDirectors__OwnerAlreadyExists(address owner);
  /// @dev The owner was not found in the owners set.
  /// @param owner The owner address.
  error BoardOfDirectors__OwnerNotFound(address owner);
  /// @dev The low-level call to the target contract failed.
  /// @param target The call target.
  error BoardOfDirectors__CallFailed(address target);
  /// @dev The caller is not in the owners set.
  /// @param caller The caller address.
  error BoardOfDirectors__NotOwner(address caller);
  /// @dev The caller is not a board of directors member.
  /// @param caller The caller address.
  error BoardOfDirectors__NotBoardMember(address caller);
  /// @dev The function can only be called by the contract itself.
  error BoardOfDirectors__NotSelf();

  modifier onlyOwner() {
    if (!s_ownersSet.contains(msg.sender)) revert BoardOfDirectors__NotOwner(msg.sender);
    _;
  }

  modifier onlyBoardOfDirectors() {
    if (!s_boardOfDirectorsSet.contains(msg.sender))
      revert BoardOfDirectors__NotBoardMember(msg.sender);
    _;
  }

  modifier onlySelf() {
    if (msg.sender != address(this)) revert BoardOfDirectors__NotSelf();
    _;
  }

  /// @custom:oz-upgrades-unsafe-allow constructor
  constructor() {
    _disableInitializers();
  }

  /**
   * @dev Adds a new action to the board.
   * @param target The target address of the action.
   * @param description The description of the action.
   * @param data The function signature associated with the action target.
   */
  function addAction(
    address target,
    string memory description,
    bytes memory data
  ) external onlyBoardOfDirectors {
    if (target == address(0)) revert BoardOfDirectors__ZeroAddress();

    Action storage action = s_actions[s_actionCount];
    action.id = s_actionCount;
    action.target = target;
    action.description = description;
    action.data = data;
    action.createdBy = msg.sender;

    // Add the first approval
    action.approvalCount = 1;
    action.approvals[msg.sender] = true;
    emit ActionAdded(s_actionCount, target, description, data);

    s_actionCount++;
  }

  /**
   * @dev Approves an action.
   * @param actionId The id of the action to approve.
   */
  function approve(uint256 actionId) external onlyBoardOfDirectors {
    Action storage action = s_actions[actionId];
    if (action.isExecuted) revert BoardOfDirectors__ActionAlreadyExecuted(actionId);
    if (action.approvals[msg.sender]) revert BoardOfDirectors__AlreadyApproved();

    action.approvals[msg.sender] = true;
    uint8 newCount = action.approvalCount + 1;
    action.approvalCount = newCount;
    emit Approval(actionId, msg.sender);

    if (newCount >= (s_boardOfDirectorsSet.length() / 2) + 1) {
      _call(actionId);
    }
  }

  /**
   * @dev Revokes approval for an action.
   * @param actionId The id of the action to revoke approval for.
   */
  function revoke(uint256 actionId) external onlyBoardOfDirectors {
    Action storage action = s_actions[actionId];
    if (action.isExecuted) revert BoardOfDirectors__ActionAlreadyExecuted(actionId);
    if (!action.approvals[msg.sender]) revert BoardOfDirectors__NotApproved();

    action.approvals[msg.sender] = false;
    action.approvalCount--;

    emit Revocation(actionId, msg.sender);
  }

  /**
   * @dev Sets the board of directors.
   * @param boardOfDirectors The new board of directors.
   */
  function setBoardOfDirectors(address[] memory boardOfDirectors) external onlyOwner {
    if (boardOfDirectors.length == 0) revert BoardOfDirectors__EmptyList();

    // Remove all existing board of directors
    while (s_boardOfDirectorsSet.length() > 0) {
      address lastBoardOfDirector = s_boardOfDirectorsSet.at(s_boardOfDirectorsSet.length() - 1);
      s_boardOfDirectorsSet.remove(lastBoardOfDirector);
    }

    // Set the new board of directors
    uint256 length = boardOfDirectors.length;
    for (uint256 i = 0; i < length; i++) {
      if (boardOfDirectors[i] == address(0)) revert BoardOfDirectors__ZeroAddress();
      s_boardOfDirectorsSet.add(boardOfDirectors[i]);
    }

    emit BoardOfDirectorsChanged(boardOfDirectors);
  }

  /**
   * @dev Sets the owners of the contract.
   * @param owners The new owners.
   */
  function setOwners(address[] memory owners) external onlySelf {
    if (owners.length == 0) revert BoardOfDirectors__EmptyList();

    // Remove all existing owners
    while (s_ownersSet.length() > 0) {
      address lastOwner = s_ownersSet.at(s_ownersSet.length() - 1);
      s_ownersSet.remove(lastOwner);
    }

    // Set the new owners
    uint256 length = owners.length;
    for (uint256 i = 0; i < length; i++) {
      if (owners[i] == address(0)) revert BoardOfDirectors__ZeroAddress();
      s_ownersSet.add(owners[i]);
    }

    emit OwnersChanged(owners);
  }

  /**
   * @dev Adds a new owner to the contract.
   * @param owner The new owner.
   */
  function addOwner(address owner) external onlySelf {
    if (owner == address(0)) revert BoardOfDirectors__ZeroAddress();

    if (s_ownersSet.contains(owner)) revert BoardOfDirectors__OwnerAlreadyExists(owner);
    s_ownersSet.add(owner);

    emit OwnersChanged(s_ownersSet.values());
  }

  /**
   * @dev Removes an owner from the contract.
   * @param owner The owner to remove.
   */
  function removeOwner(address owner) external onlySelf {
    if (!s_ownersSet.contains(owner)) revert BoardOfDirectors__OwnerNotFound(owner);

    s_ownersSet.remove(owner);
    emit OwnersChanged(s_ownersSet.values());
  }

  /**
   * @dev Checks if an action has been executed.
   * @param actionId The id of the action.
   * @return A boolean indicating if the action has been executed.
   */
  function isActionExecuted(uint256 actionId) external view returns (bool) {
    return s_actions[actionId].isExecuted;
  }

  /**
   * @dev Returns the total number of actions that have been added.
   * @return The action count.
   */
  function getActionCount() external view returns (uint256) {
    return s_actionCount;
  }

  /**
   * @dev Returns the stored fields of an action (excluding the per-approver mapping).
   * @param actionId The id of the action.
   */
  function getActions(
    uint256 actionId
  )
    external
    view
    returns (
      uint256 id,
      address target,
      string memory description,
      uint8 approvalCount_,
      bool isExecuted,
      bytes memory data,
      address createdBy
    )
  {
    Action storage action = s_actions[actionId];
    return (
      action.id,
      action.target,
      action.description,
      action.approvalCount,
      action.isExecuted,
      action.data,
      action.createdBy
    );
  }

  /**
   * @dev Checks if an action has been approved by an address.
   * @param actionId The id of the action.
   * @param account The address to check approval for.
   * @return A boolean indicating if the action has been approved.
   */
  function isApproved(uint256 actionId, address account) external view returns (bool) {
    return s_actions[actionId].approvals[account];
  }

  /**
   * @dev Returns the approval count for an action.
   * @param actionId The id of the action.
   * @return The approval count.
   */
  function approvalCount(uint256 actionId) external view returns (uint256) {
    return s_actions[actionId].approvalCount;
  }

  /**
   * @dev Returns the array of owners.
   * @return An array of owners.
   */
  function getOwners() external view returns (address[] memory) {
    return s_ownersSet.values();
  }

  /**
   * @dev Returns the array of board of directors.
   * @return An array of board of directors.
   */
  function getBoardOfDirectors() external view returns (address[] memory) {
    return s_boardOfDirectorsSet.values();
  }

  /**
   * @dev Checks if an address is a member of the board of directors.
   * @param account The address to check.
   * @return A boolean indicating if the address is a member.
   */
  function isMember(address account) external view returns (bool) {
    return s_boardOfDirectorsSet.contains(account);
  }

  /**
   * @dev Initializes the contract with the initial set of owners.
   * @param owners The initial set of owners.
   */
  function initialize(address[] memory owners) public initializer {
    uint256 length = owners.length;
    for (uint256 i = 0; i < length; i++) {
      if (owners[i] == address(0)) revert BoardOfDirectors__ZeroAddress();
      s_ownersSet.add(owners[i]);
    }
  }

  // Private functions

  /// @notice Current contract version, per semver.
  function version() public pure returns (string memory) {
    return "2.0.0";
  }

  /**
   * @dev Executes an action.
   * @param actionId The id of the action to execute.
   */
  function _call(uint256 actionId) private nonReentrant {
    Action storage action = s_actions[actionId];

    (bool success, ) = action.target.call(action.data);
    if (!success) revert BoardOfDirectors__CallFailed(action.target);

    action.isExecuted = true;

    emit ActionExecuted(actionId, action.target, action.description, action.data);
  }
}
