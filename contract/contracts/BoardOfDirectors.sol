// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import '@openzeppelin/contracts-upgradeable/utils/ReentrancyGuardUpgradeable.sol';
import '@openzeppelin/contracts/utils/structs/EnumerableSet.sol';

/**
 * @title BoardOfDirectors
 * @dev A contract that manages a board of directors and their actions.
 */
contract BoardOfDirectors is ReentrancyGuardUpgradeable {
  using EnumerableSet for EnumerableSet.AddressSet;

  EnumerableSet.AddressSet private owners;
  EnumerableSet.AddressSet private boardOfDirectors;
  uint256 public actionCount;

  mapping(uint256 => Action) public actions;

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

  event BoardOfDirectorsChanged(address[] boardOfDirectors);
  event OwnersChanged(address[] owners);
  event ActionAdded(uint256 indexed id, address indexed target, string _description, bytes data);
  event ActionExecuted(uint256 indexed id, address indexed target, string _description, bytes data);
  event Approval(uint256 indexed id, address indexed approver);
  event Revocation(uint256 indexed id, address indexed approver);

  /**
   * @dev Initializes the contract with the initial set of owners.
   * @param _owners The initial set of owners.
   */
  function initialize(address[] memory _owners) public initializer {
    uint256 length = _owners.length;
    for (uint256 i = 0; i < length; i++) {
      require(_owners[i] != address(0), 'Invalid owner address');
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
    require(_target != address(0), 'Invalid target address');

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
    require(!actions[_actionId].isExecuted, 'Action already executed');
    require(!actions[_actionId].approvals[msg.sender], 'Already approved');

    actions[_actionId].approvals[msg.sender] = true;
    actions[_actionId].approvalCount++;
    emit Approval(_actionId, msg.sender);

    if (actions[_actionId].approvalCount >= boardOfDirectors.length() / 2) {
      call(_actionId);
    }
  }

  /**
   * @dev Revokes approval for an action.
   * @param _actionId The id of the action to revoke approval for.
   */
  function revoke(uint256 _actionId) external onlyBoardOfDirectors {
    require(!actions[_actionId].isExecuted, 'Action already executed');
    require(actions[_actionId].approvals[msg.sender], 'Not approved');

    actions[_actionId].approvals[msg.sender] = false;
    actions[_actionId].approvalCount--;

    emit Revocation(_actionId, msg.sender);
  }

  /**
   * @dev Sets the board of directors.
   * @param _boardOfDirectors The new board of directors.
   */
  function setBoardOfDirectors(address[] memory _boardOfDirectors) external onlyOwner {
    require(_boardOfDirectors.length > 0, 'Board of directors required');

    // Remove all existing board of directors
    while (boardOfDirectors.length() > 0) {
      address lastBoardOfDirector = boardOfDirectors.at(boardOfDirectors.length() - 1);
      boardOfDirectors.remove(lastBoardOfDirector);
    }

    // Set the new board of directors
    uint256 length = _boardOfDirectors.length;
    for (uint256 i = 0; i < length; i++) {
      require(_boardOfDirectors[i] != address(0), 'Invalid board of directors address');
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

  // Private functions

  /**
   * @dev Executes an action.
   * @param _actionId The id of the action to execute.
   */
  function call(uint256 _actionId) private nonReentrant {
    Action storage _action = actions[_actionId];

    (bool success, ) = _action.target.call(_action.data);
    require(success, 'Call failed');

    _action.isExecuted = true;

    emit ActionExecuted(_actionId, _action.target, _action.description, _action.data);
  }

  /**
   * @dev Sets the owners of the contract.
   * @param _owners The new owners.
   */
  function setOwners(address[] memory _owners) external onlySelf {
    require(_owners.length > 0, 'Owners required');

    // Remove all existing owners
    while (owners.length() > 0) {
      address lastOwner = owners.at(owners.length() - 1);
      owners.remove(lastOwner);
    }

    // Set the new owners
    uint256 length = _owners.length;
    for (uint256 i = 0; i < length; i++) {
      require(_owners[i] != address(0), 'Invalid owner address');
      owners.add(_owners[i]);
    }

    emit OwnersChanged(_owners);
  }

  /**
   * @dev Adds a new owner to the contract.
   * @param _owner The new owner.
   */
  function addOwner(address _owner) external onlySelf {
    require(_owner != address(0), 'Invalid owner address');

    if (owners.contains(_owner)) {
      revert('Owner already exists');
    }
    owners.add(_owner);

    emit OwnersChanged(owners.values());
  }

  /**
   * @dev Removes an owner from the contract.
   * @param _owner The owner to remove.
   */
  function removeOwner(address _owner) external onlySelf {
    require(owners.contains(_owner), 'Owner not found');

    owners.remove(_owner);
    emit OwnersChanged(owners.values());
  }

  /**
   * @dev Checks if an address is a board member.
   * @param account The address to check.
   * @return A boolean indicating if the address is a board member.
   */
  function isBoardMember(address account) external view returns (bool) {
    return boardOfDirectors.contains(account);
  }

  modifier onlyOwner() {
    require(owners.contains(msg.sender), 'Only owner can call this function');
    _;
  }

  modifier onlyBoardOfDirectors() {
    require(boardOfDirectors.contains(msg.sender), 'Only board of directors can call this function');
    _;
  }

  modifier onlySelf() {
    require(msg.sender == address(this), 'Only self can call this function');
    _;
  }
}
