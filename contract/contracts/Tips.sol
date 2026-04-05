// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import '@openzeppelin/contracts-upgradeable/utils/ReentrancyGuardUpgradeable.sol';
import '@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol';
import '@openzeppelin/contracts-upgradeable/utils/PausableUpgradeable.sol';

/**
 * @title Tips
 * @notice Allows a sender to tip a list of team members, either by immediate push payout
 *         or by crediting per-recipient balances they can withdraw themselves.
 * @dev Upgradeable; includes push limit, reentrancy protection, and pause support.
 */
contract Tips is OwnableUpgradeable, ReentrancyGuardUpgradeable, PausableUpgradeable {
  /// @dev Credited tip balances per recipient, withdrawable via {withdraw}.
  mapping(address => uint256) private balance;
  /// @notice Maximum team members allowed in a single pushTip call.
  uint8 public pushLimit;
  /// @notice Hard cap on the configurable push limit.
  uint8 public constant MAX_PUSH_LIMIT = 100;
  /// @dev Leftover wei from previous tip splits, carried into the next distribution.
  uint256 remainder;

  /**
   * @notice Emitted when tips are pushed directly to team members.
   * @param from The tipper.
   * @param teamMembers Recipients of the push tip.
   * @param totalAmount Total value pushed (excluding prior remainder).
   * @param amountPerAddress Amount each recipient received.
   */
  event PushTip(address from, address[] teamMembers, uint256 totalAmount, uint256 amountPerAddress);
  /**
   * @notice Emitted when tips are credited to team members for later withdrawal.
   * @param from The tipper.
   * @param teamMembers Recipients credited with tips.
   * @param totalAmount Total value sent (excluding prior remainder).
   * @param amountPerAddress Amount credited to each recipient.
   */
  event SendTip(address from, address[] teamMembers, uint256 totalAmount, uint256 amountPerAddress);
  /**
   * @notice Emitted when a recipient withdraws their accumulated tips.
   * @param to The withdrawing recipient.
   * @param amount Amount withdrawn.
   */
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

  /**
   * @notice Initializes the contract owner, reentrancy guard, pause state and default push limit.
   * @dev Proxy initializer; sets the caller as owner and pushLimit to 10.
   */
  function initialize() public initializer {
    __Ownable_init(msg.sender);
    __ReentrancyGuard_init();
    __Pausable_init();
    pushLimit = 10;
  }

  /**
   * @notice Splits msg.value (+ any remainder) equally and pushes it directly to the given members.
   * @param _teamMembersAddresses Recipients of the push tip.
   */
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

  /**
   * @notice Splits msg.value (+ any remainder) equally and credits it to each member's balance.
   * @param _teamMembersAddresses Recipients to credit.
   */
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
  /**
   * @notice Withdraws the caller's accumulated tip balance.
   */
  function withdraw() external nonReentrant whenNotPaused {
    uint256 senderBalance = balance[msg.sender];
    if (senderBalance == 0) revert NothingToWithdraw();

    (bool sent, ) = msg.sender.call{value: senderBalance}('');
    if (!sent) revert SendFailed();

    balance[msg.sender] = 0;
    if (balance[msg.sender] != 0) revert BalanceNotCleared();

    emit TipWithdrawal(msg.sender, senderBalance);
  }

  /**
   * @notice Returns the tip balance credited to an address (awaiting withdrawal).
   * @param _address The account to query.
   * @return The credited tip balance in wei.
   */
  function getBalance(address _address) external view returns (uint256) {
    return balance[_address];
  }

  /**
   * @notice Updates the maximum number of recipients accepted by {pushTip}.
   * @param value The new push limit (must be <= MAX_PUSH_LIMIT and different from the current).
   */
  function updatePushLimit(uint8 value) external onlyOwner {
    if (value == pushLimit) revert SameLimit();
    if (value > MAX_PUSH_LIMIT) revert LimitTooHigh(value, MAX_PUSH_LIMIT);
    pushLimit = value;
  }

  modifier positiveAmountRequired() {
    if (msg.value == 0) revert ZeroValue();
    _;
  }

  /// @notice Pauses the contract, blocking tipping and withdrawals.
  function pause() external onlyOwner {
    _pause();
  }

  /// @notice Unpauses the contract, restoring normal operation.
  function unpause() external onlyOwner {
    _unpause();
  }

  /**
   * @notice Returns the total native balance held by the contract (owner only).
   * @return Current contract balance in wei.
   */
  function getContractBalance() external view onlyOwner returns (uint256) {
    return address(this).balance;
  }
}
