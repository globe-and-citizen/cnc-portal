// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import '@openzeppelin/contracts-upgradeable/utils/ReentrancyGuardUpgradeable.sol';

/**
 * @title BoardOfDirectors
 * @dev A contract that manages a board of directors and their actions.
 */
contract BoardOfDirectors is ReentrancyGuardUpgradeable {
  address[] public owners;
  address[] public boardOfDirectors;
  uint256 public actionCount;
  uint256 public pendingActionCount;
  uint256 public executedActionCount;

  mapping(uint256 => Action) public actions;
  mapping(uint256 => Action) public pendingActions;
  mapping(uint256 => Action) public executedActions;
  mapping(uint256 => mapping(address => bool)) public actionApprovals;
  mapping(uint256 => address[]) public actionApprovers;

  struct Action {
    uint256 id;
    address target;
    string description;
    uint256 approvalCount;
    bool isExecuted;
    bytes data;
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
    }
    __ReentrancyGuard_init();

    owners = _owners;
  }

  /**
   * @dev Returns an array of pending actions starting from a specific id.
   * @param _startId The starting id of the actions.
   * @param _limit The maximum number of actions to return.
   * @return An array of pending actions.
   */
  function getPendingActions(uint256 _startId, uint256 _limit) external view returns (Action[] memory) {
    require(_startId < pendingActionCount, 'Start id out of bounds');

    uint256 endId = _startId + _limit;
    if (endId > pendingActionCount) {
      endId = pendingActionCount;
    }

    Action[] memory paginatedActions = new Action[](endId - _startId);

    for (uint256 i = _startId; i < endId; i++) {
      paginatedActions[i - _startId] = pendingActions[i];
    }

    return paginatedActions;
  }

  /**
    * @dev Returns an array of executed actions starting from a specific id.
    * @param _startId The starting id of the actions.
    * @param _limit The maximum number of actions to return.
    * @return An array of executed actions.
    */
  function getExecutedActions(uint256 _startId, uint256 _limit) external view returns (Action[] memory) {
    require(_startId < executedActionCount, 'Start id out of bounds');

    uint256 endId = _startId + _limit;
    if (endId > executedActionCount) {
      endId = executedActionCount;
    }

    Action[] memory paginatedActions = new Action[](endId - _startId);

    for (uint256 i = _startId; i < endId; i++) {
      paginatedActions[i - _startId] = executedActions[i];
    }

    return paginatedActions;
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

    Action memory _action = Action(actionCount, _target, _description, 1, false, _data);
    actions[actionCount] = _action;
    pendingActions[actionCount] = _action;

    // Add the first approval
    actionApprovers[actionCount].push(msg.sender);
    actionApprovals[actionCount][msg.sender] = true;
    emit ActionAdded(actionCount, _target, _description, _data);

    actionCount++;
    pendingActionCount++;
  }

  /**
   * @dev Approves an action.
   * @param _actionId The id of the action to approve.
   */
  function approve(uint256 _actionId) external onlyBoardOfDirectors {
    require(!actions[_actionId].isExecuted, 'Action already executed');
    require(!actionApprovals[_actionId][msg.sender], 'Already approved');

    actionApprovals[_actionId][msg.sender] = true;
    actionApprovers[_actionId].push(msg.sender);
    actions[_actionId].approvalCount++;
    emit Approval(_actionId, msg.sender);

    if (actions[_actionId].approvalCount >= boardOfDirectors.length / 2) {
      call(_actionId);
    }
  }

  /**
   * @dev Revokes approval for an action.
   * @param _actionId The id of the action to revoke approval for.
   */
  function revoke(uint256 _actionId) external onlyBoardOfDirectors {
    require(!actions[_actionId].isExecuted, 'Action already executed');
    require(actionApprovals[_actionId][msg.sender], 'Not approved');

    actionApprovals[_actionId][msg.sender] = false;
    actions[_actionId].approvalCount--;

    emit Revocation(_actionId, msg.sender);
  }

  /**
   * @dev Sets the board of directors.
   * @param _boardOfDirectors The new board of directors.
   */
  function setBoardOfDirectors(address[] memory _boardOfDirectors) external onlyOwner {
    boardOfDirectors = _boardOfDirectors;

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
    return owners;
  }

  /**
   * @dev Returns the array of board of directors.
   * @return An array of board of directors.
   */
  function getBoardOfDirectors() external view returns (address[] memory) {
    return boardOfDirectors;
  }

  /**
   * @dev Returns the array of approvers for an action.
   * @param _actionId The id of the action.
   * @return An array of approvers.
   */
  function getActionApprovers(uint256 _actionId) external view returns (address[] memory) {
    return actionApprovers[_actionId];
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
    executedActions[_actionId] = _action;
    delete pendingActions[_actionId];
    pendingActionCount--;
    executedActionCount++;

    emit ActionExecuted(_actionId, _action.target, _action.description, _action.data);
  }

  /**
   * @dev Sets the owners of the contract.
   * @param _owners The new owners.
   */
  function setOwners(address[] memory _owners) external onlySelf {
    require(_owners.length > 0, 'Owners required');

    uint256 length = _owners.length;
    for (uint256 i = 0; i < length; i++) {
      require(_owners[i] != address(0), 'Invalid owner address');
    }
    owners = _owners;

    emit OwnersChanged(_owners);
  }

  /**
   * @dev Adds a new owner to the contract.
   * @param _owner The new owner.
   */
  function addOwner(address _owner) external onlySelf {
    require(_owner != address(0), 'Invalid owner address');

    uint256 length = owners.length;
    for (uint256 i = 0; i < length; i++) {
      require(owners[i] != _owner, 'Owner already exists');
    }
    owners.push(_owner);

    emit OwnersChanged(owners);
  }

  /**
   * @dev Removes an owner from the contract.
   * @param _owner The owner to remove.
   */
  function removeOwner(address _owner) external onlySelf {
    uint256 length = owners.length;
    for (uint256 i = 0; i < length; i++) {
      if (owners[i] == _owner) {
        owners[i] = owners[length - 1];
        owners.pop();

        emit OwnersChanged(owners);

        return;
      }
    }
    revert('Owner not found');
  }

  modifier onlyOwner() {
    uint256 length = owners.length;
    for (uint256 i = 0; i < length; i++) {
      if (msg.sender == owners[i]) {
        _;
        return;
      }
    }
    revert('Only owner can call this function');
  }

  modifier onlyBoardOfDirectors() {
    uint256 length = boardOfDirectors.length;
    for (uint256 i = 0; i < length; i++) {
      if (msg.sender == boardOfDirectors[i]) {
        _;
        return;
      }
    }
    revert('Only board of directors can call this function');
  }

  modifier onlySelf() {
    require(msg.sender == address(this), 'Only self can call this function');
    _;
  }
}
