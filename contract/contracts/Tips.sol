// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import '@openzeppelin/contracts-upgradeable/utils/ReentrancyGuardUpgradeable.sol';
import '@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol';
import '@openzeppelin/contracts-upgradeable/utils/PausableUpgradeable.sol';

contract Tips is OwnableUpgradeable, ReentrancyGuardUpgradeable, PausableUpgradeable {
  mapping(address => uint256) private balance;
  uint8 public pushLimit;
  uint8 public constant MAX_PUSH_LIMIT = 100;
  uint256 remainder;

  event PushTip(address from, address[] teamMembers, uint256 totalAmount, uint256 amountPerAddress);
  event SendTip(address from, address[] teamMembers, uint256 totalAmount, uint256 amountPerAddress);
  event TipWithdrawal(address to, uint256 amount);

  /// @dev No team member addresses were provided.
  error NoTeamMembers();
  /// @dev Too many team members were provided.
  /// @param provided The provided count.
  /// @param limit The current push limit.
  error TooManyTeamMembers(uint256 provided, uint256 limit);
  /// @dev A required address argument was the zero address.
  error ZeroAddress();
  /// @dev The contract's balance is less than the required amount.
  /// @param required The amount required.
  /// @param available The current contract balance.
  error InsufficientBalance(uint256 required, uint256 available);
  /// @dev A low-level native token send failed.
  error SendFailed();
  /// @dev The caller has no tips available to withdraw.
  error NothingToWithdraw();
  /// @dev Withdraw failed to zero the caller's balance.
  error BalanceNotCleared();
  /// @dev msg.value must be greater than zero.
  error ZeroValue();
  /// @dev The new push limit is the same as the current one.
  error SameLimit();
  /// @dev The push limit exceeds the allowed maximum.
  /// @param requested The requested limit.
  /// @param maximum The max push limit allowed.
  error LimitTooHigh(uint8 requested, uint8 maximum);

  function initialize() public initializer {
    __Ownable_init(msg.sender);
    __ReentrancyGuard_init();
    __Pausable_init();
    pushLimit = 10;
  }

  function pushTip(
    address[] calldata _teamMembersAddresses
  ) external payable positiveAmountRequired whenNotPaused {
    if (_teamMembersAddresses.length == 0) revert NoTeamMembers();
    if (pushLimit < _teamMembersAddresses.length) {
      revert TooManyTeamMembers(_teamMembersAddresses.length, pushLimit);
    }
    uint totalAmount = msg.value + remainder;
    uint256 amountPerAddress = totalAmount / _teamMembersAddresses.length;

    // Update the remainder
    remainder = totalAmount % _teamMembersAddresses.length;

    // Should fail if the contract balance is insufficient
    for (uint256 i = 0; i < _teamMembersAddresses.length; i++) {
      // Check for zero addresses
      if (_teamMembersAddresses[i] == address(0)) revert ZeroAddress();
      if (address(this).balance < amountPerAddress) {
        revert InsufficientBalance(amountPerAddress, address(this).balance);
      }

      (bool sent, ) = _teamMembersAddresses[i].call{value: amountPerAddress}('');
      if (!sent) revert SendFailed();
    }

    emit PushTip(msg.sender, _teamMembersAddresses, msg.value, amountPerAddress);
  }

  function sendTip(
    address[] calldata _teamMembersAddresses
  ) external payable positiveAmountRequired whenNotPaused {
    if (_teamMembersAddresses.length == 0) revert NoTeamMembers();
    uint totalAmount = msg.value + remainder;
    uint256 amountPerAddress = totalAmount / _teamMembersAddresses.length;

    // Update the remainder
    remainder = totalAmount % _teamMembersAddresses.length;

    for (uint256 i = 0; i < _teamMembersAddresses.length; i++) {
      // Check for zero addresses
      if (_teamMembersAddresses[i] == address(0)) revert ZeroAddress();
      balance[_teamMembersAddresses[i]] += amountPerAddress;
    }

    emit SendTip(msg.sender, _teamMembersAddresses, msg.value, amountPerAddress);
  }

  // TODO: Protection for reentrancy attack
  function withdraw() external nonReentrant whenNotPaused {
    uint256 senderBalance = balance[msg.sender];
    if (senderBalance == 0) revert NothingToWithdraw();

    (bool sent, ) = msg.sender.call{value: senderBalance}('');
    if (!sent) revert SendFailed();

    balance[msg.sender] = 0;
    if (balance[msg.sender] != 0) revert BalanceNotCleared();

    emit TipWithdrawal(msg.sender, senderBalance);
  }

  function getBalance(address _address) external view returns (uint256) {
    return balance[_address];
  }

  function updatePushLimit(uint8 value) external onlyOwner {
    if (value == pushLimit) revert SameLimit();
    if (value > MAX_PUSH_LIMIT) revert LimitTooHigh(value, MAX_PUSH_LIMIT);
    pushLimit = value;
  }

  modifier positiveAmountRequired() {
    if (msg.value == 0) revert ZeroValue();
    _;
  }

  function pause() external onlyOwner {
    _pause();
  }

  function unpause() external onlyOwner {
    _unpause();
  }

  function getContractBalance() external view onlyOwner returns (uint256) {
    return address(this).balance;
  }
}
