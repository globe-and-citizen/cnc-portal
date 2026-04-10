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

  /**
   * @dev Fee configuration entry for one contract type.
   * @param contractType Identifier of the contract type (e.g. "BANK").
   * @param feeBps Fee in basis points (e.g. 50 = 0.5%).
   */
  struct FeeConfig {
    string contractType; // e.g. "BANK"
    uint16 feeBps; // e.g. 50 = 0.5%
  }

  /// @dev Stored fee configurations, one entry per contract type.
  FeeConfig[] private feeConfigs;

  /**
   * @notice Address that receives funds when `withdraw` / `withdrawToken` is called.
   * @dev If unset (address(0)), withdrawals fall back to `owner()`.
   */
  address public feeBeneficiary;

  /// @notice Emitted when ERC20 tokens are withdrawn
  event TokenWithdrawn(address indexed recipient, address indexed token, uint256 amount);

  /// @notice Emitted when native tokens are withdrawn
  event Withdrawn(address indexed recipient, uint256 amount);

  /**
   * @notice Emitted when a fee is paid into the collector.
   * @param contractType The contract type the fee applies to (e.g. "BANK").
   * @param payer The address that paid the fee (typically the charging contract).
   * @param token The token paid; address(0) for native.
   * @param amount The fee amount.
   */
  event FeePaid(
    string indexed contractType,
    address indexed payer,
    address indexed token,
    uint256 amount
  );

  /**
   * @notice Emitted when the fee beneficiary is changed.
   * @param previous The previous beneficiary (address(0) if unset).
   * @param current The new beneficiary (address(0) clears it; withdrawals fall back to owner).
   */
  event FeeBeneficiaryUpdated(address indexed previous, address indexed current);

  /**
   * @notice Emitted when a fee configuration entry is added or updated.
   * @param contractType The contract type the fee applies to.
   * @param feeBps The new fee in basis points.
   */
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

  /// @custom:oz-upgrades-unsafe-allow constructor
  constructor() {
    _disableInitializers();
  }

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
          keccak256(bytes(feeConfigs[j].contractType)) == keccak256(bytes(_configs[i].contractType))
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
   * @notice Accept a native fee payment and emit a FeePaid event.
   * @dev Funds are held in this contract until swept via `withdraw`.
   * @param contractType Identifier of the contract type charging the fee (e.g. "BANK").
   */
  function payFee(string calldata contractType) external payable {
    if (bytes(contractType).length == 0) revert EmptyContractType();
    if (msg.value == 0) revert ZeroAmount();
    emit FeePaid(contractType, msg.sender, address(0), msg.value);
  }

  /**
   * @notice Accept an ERC20 fee payment and emit a FeePaid event.
   * @dev Pulls `amount` from `msg.sender` via transferFrom; the caller must approve first.
   *      Funds are held in this contract until swept via `withdrawToken`.
   * @param contractType Identifier of the contract type charging the fee (e.g. "BANK").
   * @param token ERC20 token address (must be supported).
   * @param amount Fee amount to pull from the caller.
   */
  function payFeeToken(
    string calldata contractType,
    address token,
    uint256 amount
  ) external nonReentrant {
    if (bytes(contractType).length == 0) revert EmptyContractType();
    if (!_isTokenSupported(token)) revert TokenNotSupported(token);
    if (amount == 0) revert ZeroAmount();

    IERC20(token).safeTransferFrom(msg.sender, address(this), amount);
    emit FeePaid(contractType, msg.sender, token, amount);
  }

  /**
   * @notice Set the address that receives swept fees on withdrawals.
   * @param _beneficiary New beneficiary; address(0) clears it and falls back to owner().
   */
  function setFeeBeneficiary(address _beneficiary) external onlyOwner {
    address previous = feeBeneficiary;
    feeBeneficiary = _beneficiary;
    emit FeeBeneficiaryUpdated(previous, _beneficiary);
  }

  /**
   * @dev Resolves the effective recipient for withdrawals: beneficiary if set, otherwise owner.
   */
  function _withdrawRecipient() internal view returns (address) {
    address beneficiary = feeBeneficiary;
    return beneficiary == address(0) ? owner() : beneficiary;
  }

  /**
   * @notice Withdraw native token to the fee beneficiary (or owner if unset)
   * @param amount The amount to withdraw
   * @dev Protected by nonReentrant due to external call
   */
  function withdraw(uint256 amount) external onlyOwner nonReentrant {
    if (address(this).balance < amount) revert InsufficientBalance(amount, address(this).balance);

    address recipient = _withdrawRecipient();
    (bool sent, ) = recipient.call{value: amount}('');
    if (!sent) revert WithdrawalFailed();
    emit Withdrawn(recipient, amount);
  }

  /**
   * @notice Withdraw ERC20 tokens to the fee beneficiary (or owner if unset)
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

    address recipient = _withdrawRecipient();
    IERC20(_token).safeTransfer(recipient, _amount);
    emit TokenWithdrawn(recipient, _token, _amount);
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
   * @param contractType The contract type this fee applies to.
   * @param feeBps Fee in basis points (must be <= 10000).
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
