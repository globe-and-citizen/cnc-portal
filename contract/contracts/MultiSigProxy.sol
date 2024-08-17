// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import '@openzeppelin/contracts-upgradeable/utils/ReentrancyGuardUpgradeable.sol';

contract MultiSigProxy is ReentrancyGuardUpgradeable {
  address public votingAddress;
  address[] public boardOfDirectors;
  uint256 public actionCount;

  mapping(uint256 => Action) public actions;
  mapping(uint256 => mapping(address => bool)) public actionApprovals;
  mapping(uint256 => address[]) public actionApprovers;

  struct Action {
    address target;
    string description;
    uint256 approvalCount;
    bool isExecuted;
    bytes data;
  }

  event BoardOfDirectorsChanged(address[] boardOfDirectors);
  event ActionAdded(uint256 indexed id, address indexed target, string _description, bytes data);
  event ActionExecuted(uint256 indexed id, address indexed target, string _description, bytes data);
  event Approval(uint256 indexed id, address indexed approver);

  function initialize(address _votingAddress) public initializer {
    __ReentrancyGuard_init();

    votingAddress = _votingAddress;
  }

  function getActions(uint256 _startId, uint256 _limit) external view returns (Action[] memory) {
    require(_startId < actionCount, 'Start id out of bounds');

    uint256 endId = _startId + _limit;
    if (endId > actionCount) {
      endId = actionCount;
    }

    Action[] memory paginatedActions = new Action[](endId - _startId);

    for (uint256 i = _startId; i < endId; i++) {
      paginatedActions[i - _startId] = actions[i];
    }

    return paginatedActions;
  }

  function addAction(
    address _target,
    string memory _description,
    bytes memory _data
  ) external onlyBoardOfDirectors {
    require(_target != address(0), 'Invalid target address');

    actions[actionCount] = Action(_target, _description, 1, false, _data);

    // Add the first approval
    actionApprovers[actionCount].push(msg.sender);
    actionApprovals[actionCount][msg.sender] = true;
    emit ActionAdded(actionCount, _target, _description, _data);

    actionCount++;
  }

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

  function setBoardOfDirectors(address[] memory _boardOfDirectors) external onlyVoting {
    boardOfDirectors = _boardOfDirectors;

    emit BoardOfDirectorsChanged(_boardOfDirectors);
  }

  function isActionExecuted(uint256 _actionId) external view returns (bool) {
    return actions[_actionId].isExecuted;
  }

  function approvalCount(uint256 _actionId) external view returns (uint256) {
    return actions[_actionId].approvalCount;
  }

  function getBoardOfDirectors() external view returns (address[] memory) {
    return boardOfDirectors;
  }

  function getActionApprovers(uint256 _actionId) external view returns (address[] memory) {
    return actionApprovers[_actionId];
  }

  // Private functions

  function call(uint256 _actionId) private nonReentrant {
    Action storage _action = actions[_actionId];

    (bool success, ) = _action.target.call(_action.data);
    require(success, 'Call failed');

    _action.isExecuted = true;
    emit ActionExecuted(_actionId, _action.target, _action.description, _action.data);
  }

  modifier onlyVoting() {
    require(msg.sender == votingAddress, 'Only voting contract can call this function');
    _;
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
}
