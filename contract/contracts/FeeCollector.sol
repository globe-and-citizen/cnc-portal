// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import '@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol';
import '@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol';
import '@openzeppelin/contracts-upgradeable/utils/ReentrancyGuardUpgradeable.sol';
import '@openzeppelin/contracts/token/ERC20/IERC20.sol';
import '@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol';
import './base/TokenSupport.sol';

/**
 * @title FeeCollector
 * @notice Global vault for native tokens and ERC20 tokens + immutable per-contract-type fee configuration.
 *         Upgradeable and protected with reentrancy guard.
 */
contract FeeCollector is
  Initializable,
  OwnableUpgradeable,
  ReentrancyGuardUpgradeable,
  TokenSupport
{
  using SafeERC20 for IERC20;

  struct FeeConfig {
    string contractType; // e.g. "BANK"
    uint16 feeBps; // e.g. 50 = 0.5%
  }

  FeeConfig[] private feeConfigs;

  /// @notice Emitted when ERC20 tokens are withdrawn
  event TokenWithdrawn(address indexed owner, address indexed token, uint256 amount);

  event FeeConfigUpdated(string indexed contractType, uint16 feeBps);

  /// @dev A required address argument was the zero address.
  error ZeroAddress();
  /// @dev The contractType string was empty.
  error EmptyContractType();
  /// @dev The fee basis points value is invalid (> 10000).
  /// @param feeBps The invalid fee value.
  error InvalidBps(uint16 feeBps);
  /// @dev Duplicate contractType entries are not allowed.
  /// @param contractType The duplicated contract type.
  error DuplicateContractType(string contractType);
  /// @dev The contract's balance is less than the requested amount.
  /// @param required The amount requested.
  /// @param available The current contract balance.
  error InsufficientBalance(uint256 required, uint256 available);
  /// @dev A low-level native token transfer failed.
  error WithdrawalFailed();
  /// @dev The token is not supported by this fee collector.
  /// @param token The unsupported token.
  error TokenNotSupported(address token);
  /// @dev The amount must be greater than zero.
  error ZeroAmount();
  /// @dev The contract's token balance is less than the requested amount.
  /// @param token The ERC20 token.
  /// @param required The amount requested.
  /// @param available The current token balance.
  error InsufficientTokenBalance(address token, uint256 required, uint256 available);

  /**
   * @notice Initializes the FeeCollector with owner, fee configs, and supported tokens
   * @param _owner The address that will own this contract
   * @param _configs Array of fee configurations for different contract types
   * @param _tokenAddresses Array of ERC20 token addresses to be supported initially
   * @dev Can only be called once due to initializer modifier
   */
  function initialize(
    address _owner,
    FeeConfig[] memory _configs,
    address[] calldata _tokenAddresses
  ) public initializer {
    if (_owner == address(0)) revert ZeroAddress();

    __Ownable_init(_owner);
    __ReentrancyGuard_init();

    // Store fee configs
    for (uint256 i = 0; i < _configs.length; i++) {
      if (bytes(_configs[i].contractType).length == 0) revert EmptyContractType();
      if (_configs[i].feeBps > 10000) revert InvalidBps(_configs[i].feeBps);

      // No duplicates allowed
      for (uint256 j = 0; j < i; j++) {
        if (
          keccak256(bytes(feeConfigs[j].contractType)) ==
          keccak256(bytes(_configs[i].contractType))
        ) {
          revert DuplicateContractType(_configs[i].contractType);
        }
      }

      feeConfigs.push(
        FeeConfig({contractType: _configs[i].contractType, feeBps: _configs[i].feeBps})
      );
    }

    // Set the initial supported tokens (same pattern as Bank contract)
    for (uint256 i = 0; i < _tokenAddresses.length; i++) {
      if (_tokenAddresses[i] == address(0)) revert ZeroAddress();
      _addTokenSupport(_tokenAddresses[i]);
    }
    // Emit events after they're already added to avoid duplicate events
    for (uint256 i = 0; i < _tokenAddresses.length; i++) {
      emit TokenSupportAdded(_tokenAddresses[i]);
    }
  }

  /**
   * @notice Adds a supported token to the contract
   * @param _tokenAddress The address of the token contract
   * @dev Can only be called by the contract owner
   */
  function addTokenSupport(address _tokenAddress) external override onlyOwner {
    _addTokenSupport(_tokenAddress);
  }

  /**
   * @notice Removes a supported token from the contract
   * @param _tokenAddress The address of the token to remove
   * @dev Can only be called by the contract owner
   */
  function removeTokenSupport(address _tokenAddress) external override onlyOwner {
    _removeTokenSupport(_tokenAddress);
  }

  /**
   * @notice Allows contract to receive native tokens
   */
  receive() external payable {}

  /**
   * @notice Withdraw native token to owner
   * @param amount The amount to withdraw
   * @dev Protected by nonReentrant due to external call
   */
  function withdraw(uint256 amount) external onlyOwner nonReentrant {
    if (address(this).balance < amount) revert InsufficientBalance(amount, address(this).balance);

    (bool sent, ) = owner().call{value: amount}('');
    if (!sent) revert WithdrawalFailed();
  }

  /**
   * @notice Withdraw ERC20 tokens to owner
   * @param _token The address of the token to withdraw
   * @param _amount The amount of tokens to withdraw
   * @dev Protected by nonReentrant and only owner can call
   */
  function withdrawToken(address _token, uint256 _amount) external onlyOwner nonReentrant {
    if (!_isTokenSupported(_token)) revert TokenNotSupported(_token);
    if (_amount == 0) revert ZeroAmount();

    uint256 contractBalance = IERC20(_token).balanceOf(address(this));
    if (contractBalance < _amount) {
      revert InsufficientTokenBalance(_token, _amount, contractBalance);
    }

    IERC20(_token).safeTransfer(owner(), _amount);
    emit TokenWithdrawn(owner(), _token, _amount);
  }

  /**
   * @notice Get the fee in basis points for a specific contract type
   * @param contractType The type of contract (e.g., "BANK")
   * @return The fee in basis points (e.g., 50 = 0.5%)
   */
  function getFeeFor(string memory contractType) public view returns (uint16) {
    bytes32 key = keccak256(bytes(contractType));
    (bool exists, uint256 idx) = _findFeeIndex(key);

    if (!exists) return 0;

    return feeConfigs[idx].feeBps;
  }

  /**
   * @notice Get the contract's native token balance
   * @return The balance in wei
   */
  function getBalance() external view returns (uint256) {
    return address(this).balance;
  }

  /**
   * @notice Get the contract's ERC20 token balance
   * @param _token The address of the token contract
   * @return The token balance
   */
  function getTokenBalance(address _token) external view returns (uint256) {
    if (!_isTokenSupported(_token)) revert TokenNotSupported(_token);
    return IERC20(_token).balanceOf(address(this));
  }

  /**
   * @notice Add or update a single fee configuration
   */
  function setFee(string memory contractType, uint16 feeBps) external onlyOwner {
    if (bytes(contractType).length == 0) revert EmptyContractType();
    if (feeBps > 10000) revert InvalidBps(feeBps);

    bytes32 key = keccak256(bytes(contractType));

    (bool exists, uint256 idx) = _findFeeIndex(key);

    if (exists) {
      // Update
      feeConfigs[idx].feeBps = feeBps;
      emit FeeConfigUpdated(contractType, feeBps);
      return;
    }

    // Add new
    feeConfigs.push(FeeConfig(contractType, feeBps));
    emit FeeConfigUpdated(contractType, feeBps);
  }

  /**
   * @notice Get all fee configurations
   * @return Array of fee configurations
   */
  function getAllFeeConfigs() external view returns (FeeConfig[] memory) {
    return feeConfigs;
  }

  function _findFeeIndex(bytes32 key) private view returns (bool, uint256) {
    for (uint256 i = 0; i < feeConfigs.length; i++) {
      if (keccak256(bytes(feeConfigs[i].contractType)) == key) {
        return (true, i);
      }
    }
    return (false, 0);
  }
}
