// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import '@openzeppelin/contracts-upgradeable/utils/ReentrancyGuardUpgradeable.sol';
import '@openzeppelin/contracts/utils/structs/EnumerableSet.sol';
import {IBoardOfDirectors} from './interfaces/IBoardOfDirectors.sol';

/**
 * @title BoardOfDirectors
 * @dev A contract that manages a board of directors and their actions.
 */
contract BoardOfDirectors is ReentrancyGuardUpgradeable, IBoardOfDirectors {
  using EnumerableSet for EnumerableSet.AddressSet;

  /// @dev Set of owner addresses allowed to manage board membership.
  EnumerableSet.AddressSet private owners;
  /// @dev Set of current board-of-directors members.
  EnumerableSet.AddressSet private boardOfDirectors;
  /// @notice Total number of actions that have been added.
  uint256 public actionCount;

  /// @notice Maps an action id to its action record.
  mapping(uint256 => Action) public actions;

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
    mapping(address => bool) approvals;
  }

  /// @notice Emitted when the board-of-directors set is replaced.
  event BoardOfDirectorsChanged(address[] boardOfDirectors);
  /// @notice Emitted when the owner set changes.
  event OwnersChanged(address[] owners);
  /**
   * @notice Emitted when a new action is added to the board.
   * @param id Action id.
   * @param target Target contract.
   * @param _description Description of the action.
   * @param data Calldata payload for the action.
   */
  event ActionAdded(uint256 indexed id, address indexed target, string _description, bytes data);
  /**
   * @notice Emitted when an action is executed.
   * @param id Action id.
   * @param target Target contract that was called.
   * @param _description Description of the action.
   * @param data Calldata that was executed.
   */
  event ActionExecuted(uint256 indexed id, address indexed target, string _description, bytes data);
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
  error ZeroAddress();
  /// @dev The action has already been executed and cannot be modified.
  /// @param actionId The action id.
  error ActionAlreadyExecuted(uint256 actionId);
  /// @dev The caller has already approved this action.
  error AlreadyApproved();
  /// @dev The caller has not approved this action.
  error NotApproved();
  /// @dev The list must not be empty.
  error EmptyList();
  /// @dev The owner is already registered.
  /// @param owner The owner address.
  error OwnerAlreadyExists(address owner);
  /// @dev The owner was not found in the owners set.
  /// @param owner The owner address.
  error OwnerNotFound(address owner);
  /// @dev The low-level call to the target contract failed.
  /// @param target The call target.
  error CallFailed(address target);
  /// @dev The caller is not in the owners set.
  /// @param caller The caller address.
  error NotOwner(address caller);
  /// @dev The caller is not a board of directors member.
  /// @param caller The caller address.
  error NotBoardMember(address caller);
  /// @dev The function can only be called by the contract itself.
  error NotSelf();

  /// @custom:oz-upgrades-unsafe-allow constructor
  constructor() {
    _disableInitializers();
  }

  /**
   * @dev Initializes the contract with the initial set of owners.
   * @param _owners The initial set of owners.
   */
  function initialize(address[] memory _owners) public initializer {
    uint256 length = _owners.length;
    for (uint256 i = 0; i < length; i++) {
      if (_owners[i] == address(0)) revert ZeroAddress();
      owners.add(_owners[i]);
    }
    __ReentrancyGuard_init();
  }

  /**
   * @dev Adds a new action to the board.
   * @param _target The target address of the action.
   * @param _description The description of the action.
   * @param _data The function signature associated with the action target.
   */
  function addAction(
    address _target,
    string memory _description,
    bytes memory _data
  ) external onlyBoardOfDirectors {
    if (_target == address(0)) revert ZeroAddress();

    Action storage _action = actions[actionCount];
    _action.id = actionCount;
    _action.target = _target;
    _action.description = _description;
    _action.data = _data;
    _action.createdBy = msg.sender;

    // Add the first approval
    _action.approvalCount = 1;
    _action.approvals[msg.sender] = true;
    emit ActionAdded(actionCount, _target, _description, _data);

    actionCount++;
  }

  /**
   * @dev Approves an action.
   * @param _actionId The id of the action to approve.
   */
  function approve(uint256 _actionId) external onlyBoardOfDirectors {
    if (actions[_actionId].isExecuted) revert ActionAlreadyExecuted(_actionId);
    if (actions[_actionId].approvals[msg.sender]) revert AlreadyApproved();

    actions[_actionId].approvals[msg.sender] = true;
    actions[_actionId].approvalCount++;
    emit Approval(_actionId, msg.sender);

    if (actions[_actionId].approvalCount >= (boardOfDirectors.length() / 2) + 1) {
      call(_actionId);
    }
  }

  /**
   * @dev Revokes approval for an action.
   * @param _actionId The id of the action to revoke approval for.
   */
  function revoke(uint256 _actionId) external onlyBoardOfDirectors {
    if (actions[_actionId].isExecuted) revert ActionAlreadyExecuted(_actionId);
    if (!actions[_actionId].approvals[msg.sender]) revert NotApproved();

    actions[_actionId].approvals[msg.sender] = false;
    actions[_actionId].approvalCount--;

    emit Revocation(_actionId, msg.sender);
  }

  /**
   * @dev Sets the board of directors.
   * @param _boardOfDirectors The new board of directors.
   */
  function setBoardOfDirectors(address[] memory _boardOfDirectors) external onlyOwner {
    if (_boardOfDirectors.length == 0) revert EmptyList();

    // Remove all existing board of directors
    while (boardOfDirectors.length() > 0) {
      address lastBoardOfDirector = boardOfDirectors.at(boardOfDirectors.length() - 1);
      boardOfDirectors.remove(lastBoardOfDirector);
    }

    // Set the new board of directors
    uint256 length = _boardOfDirectors.length;
    for (uint256 i = 0; i < length; i++) {
      if (_boardOfDirectors[i] == address(0)) revert ZeroAddress();
      boardOfDirectors.add(_boardOfDirectors[i]);
    }

    emit BoardOfDirectorsChanged(_boardOfDirectors);
  }

  /**
   * @dev Checks if an action has been executed.
   * @param _actionId The id of the action.
   * @return A boolean indicating if the action has been executed.
   */
  function isActionExecuted(uint256 _actionId) external view returns (bool) {
    return actions[_actionId].isExecuted;
  }

  /**
   * @dev Checks if an action has been approved by an address.
   * @param _actionId The id of the action.
   * @param _address The address to check approval for.
   * @return A boolean indicating if the action has been approved.
   */
  function isApproved(uint256 _actionId, address _address) external view returns (bool) {
    return actions[_actionId].approvals[_address];
  }

  /**
   * @dev Returns the approval count for an action.
   * @param _actionId The id of the action.
   * @return The approval count.
   */
  function approvalCount(uint256 _actionId) external view returns (uint256) {
    return actions[_actionId].approvalCount;
  }

  /**
   * @dev Returns the array of owners.
   * @return An array of owners.
   */
  function getOwners() external view returns (address[] memory) {
    return owners.values();
  }

  /**
   * @dev Returns the array of board of directors.
   * @return An array of board of directors.
   */
  function getBoardOfDirectors() external view returns (address[] memory) {
    return boardOfDirectors.values();
  }

  /**
   * @dev Checks if an address is a member of the board of directors.
   * @param _address The address to check.
   * @return A boolean indicating if the address is a member.
   */
  function isMember(address _address) external view returns (bool) {
    return boardOfDirectors.contains(_address);
  }

  // Private functions

  /**
   * @dev Executes an action.
   * @param _actionId The id of the action to execute.
   */
  function call(uint256 _actionId) private nonReentrant {
    Action storage _action = actions[_actionId];

    (bool success, ) = _action.target.call(_action.data);
    if (!success) revert CallFailed(_action.target);

    _action.isExecuted = true;

    emit ActionExecuted(_actionId, _action.target, _action.description, _action.data);
  }

  /**
   * @dev Sets the owners of the contract.
   * @param _owners The new owners.
   */
  function setOwners(address[] memory _owners) external onlySelf {
    if (_owners.length == 0) revert EmptyList();

    // Remove all existing owners
    while (owners.length() > 0) {
      address lastOwner = owners.at(owners.length() - 1);
      owners.remove(lastOwner);
    }

    // Set the new owners
    uint256 length = _owners.length;
    for (uint256 i = 0; i < length; i++) {
      if (_owners[i] == address(0)) revert ZeroAddress();
      owners.add(_owners[i]);
    }

    emit OwnersChanged(_owners);
  }

  /**
   * @dev Adds a new owner to the contract.
   * @param _owner The new owner.
   */
  function addOwner(address _owner) external onlySelf {
    if (_owner == address(0)) revert ZeroAddress();

    if (owners.contains(_owner)) {
      revert OwnerAlreadyExists(_owner);
    }
    owners.add(_owner);

    emit OwnersChanged(owners.values());
  }

  /**
   * @dev Removes an owner from the contract.
   * @param _owner The owner to remove.
   */
  function removeOwner(address _owner) external onlySelf {
    if (!owners.contains(_owner)) revert OwnerNotFound(_owner);

    owners.remove(_owner);
    emit OwnersChanged(owners.values());
  }

  modifier onlyOwner() {
    if (!owners.contains(msg.sender)) revert NotOwner(msg.sender);
    _;
  }

  modifier onlyBoardOfDirectors() {
    if (!boardOfDirectors.contains(msg.sender)) revert NotBoardMember(msg.sender);
    _;
  }

  modifier onlySelf() {
    if (msg.sender != address(this)) revert NotSelf();
    _;
  }
}
