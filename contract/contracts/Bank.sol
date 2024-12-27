// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import '@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol';
import '@openzeppelin/contracts-upgradeable/utils/PausableUpgradeable.sol';
import '@openzeppelin/contracts-upgradeable/utils/ReentrancyGuardUpgradeable.sol';

contract Bank is OwnableUpgradeable, ReentrancyGuardUpgradeable, PausableUpgradeable {
  mapping(address => uint256) private balance;
  uint8 public pushLimit;
  uint8 public constant MAX_PUSH_LIMIT = 100;
  uint256 remainder;

  event Deposited(address indexed depositor, uint256 amount);
  event Transfer(address indexed sender, address indexed to, uint256 amount);
  event PushTip(
    address indexed from,
    address[] teamMembers,
    uint256 totalAmount,
    uint256 amountPerAddress
  );
  event SendTip(
    address indexed from,
    address[] teamMembers,
    uint256 totalAmount,
    uint256 amountPerAddress
  );
  event TipWithdrawal(address indexed to, uint256 amount);

  function initialize(address _sender) public initializer {
    __Ownable_init(_sender);
    __ReentrancyGuard_init();
    __Pausable_init();
    pushLimit = 10;
  }

  receive() external payable {
    emit Deposited(msg.sender, msg.value);
  }

  function transfer(
    address _to,
    uint256 _amount
  ) external payable onlyOwner nonReentrant whenNotPaused {
    require(_to != address(0), 'Address cannot be zero');
    require(_amount > 0, 'Amount must be greater than zero');

    (bool sent, ) = _to.call{value: _amount}('');
    require(sent, 'Failed to transfer');

    emit Transfer(msg.sender, _to, _amount);
  }

  function pushTip(
    address[] calldata _teamMembersAddresses,
    uint256 _amount
  ) external payable onlyOwner whenNotPaused {
    require(_teamMembersAddresses.length > 0, "Must have at least one team member");
    require(
      pushLimit >= _teamMembersAddresses.length,
      "You have too much team members"
    );
    uint totalAmount = _amount + remainder;
    uint256 amountPerAddress = totalAmount / _teamMembersAddresses.length;
    
    // Update the remainder
    remainder = totalAmount % _teamMembersAddresses.length;

    // Should fail if the contract balance is insufficient
    for (uint256 i = 0; i < _teamMembersAddresses.length; i++) {
      // Check for zero addresses
      require(_teamMembersAddresses[i] != address(0), "Invalid address");
      require(
        address(this).balance >= amountPerAddress,
        "Insufficient contract balance"
      );
      
      (bool sent, ) = _teamMembersAddresses[i].call{value: amountPerAddress}("");
      require(sent, "Failed to send ETH");
    }

    emit PushTip(msg.sender, _teamMembersAddresses, _amount, amountPerAddress);
  }

  function sendTip(
    address[] calldata _teamMembersAddresses,
    uint256 _amount
  ) external payable onlyOwner whenNotPaused {
    require(_teamMembersAddresses.length > 0, "Must have at least one team member");
    uint totalAmount = _amount + remainder;
    uint256 amountPerAddress = totalAmount / _teamMembersAddresses.length;
    
    // Update the remainder
    remainder = totalAmount % _teamMembersAddresses.length;

    for (uint256 i = 0; i < _teamMembersAddresses.length; i++) {
      // Check for zero addresses
      require(_teamMembersAddresses[i] != address(0), "Invalid address");
      balance[_teamMembersAddresses[i]] += amountPerAddress;
    }

    emit SendTip(msg.sender, _teamMembersAddresses, _amount, amountPerAddress);
  }

  function withdraw() external nonReentrant whenNotPaused {
    uint256 senderBalance = balance[msg.sender];
    require(senderBalance > 0, "No tips to withdraw.");

    (bool sent,) = msg.sender.call{value: senderBalance}("");
    require(sent, "Failed to withdraw tips.");

    balance[msg.sender] = 0;
    require(balance[msg.sender] == 0, "Failed to zero out balance");

    emit TipWithdrawal(msg.sender, senderBalance);
  }

  function getBalance(address _address) external view returns (uint256) {
    return balance[_address];
  }

  function updatePushLimit(uint8 value) external onlyOwner {
    require(value != pushLimit, "New limit is the same as the old one");
    require(value <= MAX_PUSH_LIMIT, "Push limit is too high, must be less or equal to 100");
    pushLimit = value;
  }

  function getContractBalance() external view onlyOwner returns (uint256) {
    return address(this).balance;
  }

  function pause() external onlyOwner {
    _pause();
  }

  function unpause() external onlyOwner {
    _unpause();
  }
}
