// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import '@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol';
import '@openzeppelin/contracts-upgradeable/utils/PausableUpgradeable.sol';
import '@openzeppelin/contracts-upgradeable/utils/ReentrancyGuardUpgradeable.sol';
import '@openzeppelin/contracts/token/ERC20/IERC20.sol';
import '@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol';
import './base/TokenSupport.sol';
import {IOfficer} from './interfaces/IOfficer.sol';
import {IInvestorV1} from './interfaces/IInvestorV1.sol';

/**
 * @title Bank
 * @notice Treasury contract holding native and ERC20 funds for a team, with fee-aware transfers
 *         and dividend distribution via the Investor contract.
 * @dev Upgradeable, pausable and reentrancy-guarded. Resolves Investor/FeeCollector via Officer.
 */
contract Bank is OwnableUpgradeable, ReentrancyGuardUpgradeable, PausableUpgradeable, TokenSupport {
  using SafeERC20 for IERC20;

  /**
   * @dev Address of the Officer contract (set during initialization)
   */
  address public officerAddress;

  /**
   * @dev Emitted when ETH/native tokens are deposited into the contract.
   * @param depositor The address that made the deposit.
   * @param amount The amount of ETH/native tokens deposited.
   */
  event Deposited(address indexed depositor, uint256 amount);

  /**
   * @dev Emitted when ERC20 tokens are deposited into the contract.
   * @param depositor The address that made the deposit.
   * @param token The address of the ERC20 token contract.
   * @param amount The amount of tokens deposited.
   */
  event TokenDeposited(address indexed depositor, address indexed token, uint256 amount);

  /**
   * @dev Emitted when ETH/native tokens are transferred from the contract.
   * @param sender The address that initiated the transfer (contract owner).
   * @param to The recipient address.
   * @param amount The amount of ETH/native tokens transferred.
   */
  event Transfer(address indexed sender, address indexed to, uint256 amount);

  /**
   * @notice Emitted when a fee is paid to the fee collector.
   * @param feeCollector Recipient of the fee.
   * @param amount The fee amount paid.
   */
  event FeePaid(address indexed feeCollector, uint256 amount);
  /**
   * @notice Emitted when a dividend distribution is triggered via the Investor contract.
   * @param investor The Investor contract address that received/forwarded funds.
   * @param token Token distributed, or address(0) for native.
   * @param totalAmount Total amount sent to the investor for distribution.
   */
  event DividendDistributionTriggered(
    address indexed investor,
    address indexed token,
    uint256 totalAmount
  );
  /**
   * @dev Emitted when ERC20 tokens are transferred from the contract.
   * @param sender The address that initiated the transfer (contract owner).
   * @param to The recipient address.
   * @param token The address of the ERC20 token contract.
   * @param amount The amount of tokens transferred.
   */
  event TokenTransfer(
    address indexed sender,
    address indexed to,
    address indexed token,
    uint256 amount
  );

  /// @dev A required address argument was the zero address.
  error ZeroAddress();
  /// @dev The officer contract address has not been configured on this bank.
  error OfficerAddressNotSet();
  /// @dev The Investor contract could not be located via the Officer.
  error InvestorContractNotFound();
  /// @dev The token is not supported by this bank.
  /// @param token The unsupported token address.
  error UnsupportedToken(address token);
  /// @dev The amount must be greater than zero.
  error ZeroAmount();
  /// @dev The contract's balance is less than the requested amount.
  /// @param required The amount requested.
  /// @param available The current contract balance.
  error InsufficientBalance(uint256 required, uint256 available);
  /// @dev The fee basis points value exceeds 100% (10000 bps).
  /// @param feeBps The invalid fee value.
  error InvalidFeeBps(uint16 feeBps);
  /// @dev The fee collector address has not been configured on the officer.
  error FeeCollectorNotConfigured();
  /// @dev A low-level native token send to the fee collector failed.
  error FeeTransferFailed();
  /// @dev A low-level native token transfer failed.
  error TransferFailed();

  /**
   * @dev Resolves the deployed Investor contract from Officer.
   * Tries "InvestorV1" first and falls back to "Investor" for compatibility.
   */
  function _getInvestorAddress() internal view returns (address) {
    if (officerAddress == address(0)) revert OfficerAddressNotSet();

    address investorAddress = IOfficer(officerAddress).findDeployedContract('InvestorV1');
    if (investorAddress == address(0)) {
      investorAddress = IOfficer(officerAddress).findDeployedContract('Investor');
    }

    if (investorAddress == address(0)) revert InvestorContractNotFound();
    return investorAddress;
  }

  /// @custom:oz-upgrades-unsafe-allow constructor
  constructor() {
    _disableInitializers();
  }

  /**
   * @notice Initializes the Bank contract with supported tokens and owner
   * @dev This function replaces the constructor for upgradeable contracts
   * @param _tokenAddresses Array of ERC20 token addresses to be supported initially
   * @param _sender Address that will become the owner of the contract
   * @custom:security Only callable once due to initializer modifier
   */
  function initialize(address[] calldata _tokenAddresses, address _sender) public initializer {
    if (_sender == address(0)) revert ZeroAddress();
    __Ownable_init(_sender);
    __ReentrancyGuard_init();
    __Pausable_init();
    // Set the initial supported tokens
    uint256 length = _tokenAddresses.length;
    for (uint256 i = 0; i < length; ++i) {
      if (_tokenAddresses[i] == address(0)) revert ZeroAddress();
      _addTokenSupport(_tokenAddresses[i]);
    }
    // Emit events after they're already added to avoid duplicate events
    for (uint256 i = 0; i < length; ++i) {
      emit TokenSupportAdded(_tokenAddresses[i]);
    }
    if (msg.sender == address(0)) revert ZeroAddress();
    officerAddress = msg.sender;
  }

  /**
   * @notice Adds a supported token to the contract.
   * @param _tokenAddress The address of the token contract.
   * @dev Can only be called by the contract owner.
   */
  function addTokenSupport(address _tokenAddress) external override onlyOwner {
    _addTokenSupport(_tokenAddress);
  }

  /**
   * @notice Removes a supported token from the contract.
   * @param _tokenAddress The address of the token contract.
   * @dev Can only be called by the contract owner.
   */
  function removeTokenSupport(address _tokenAddress) external override onlyOwner {
    _removeTokenSupport(_tokenAddress);
  }

  /**
   * @notice Returns the current ETH/native token balance held by the contract.
   * @return Current balance in wei.
   */
  function getBalance() public view returns (uint256) {
    return address(this).balance;
  }

  /**
   * @notice Returns the current ERC20 token balance held by the contract.
   * @param _token The address of the ERC20 token contract.
   * @return Current token balance.
   */
  function getTokenBalance(address _token) public view returns (uint256) {
    if (!_isTokenSupported(_token)) revert UnsupportedToken(_token);
    return IERC20(_token).balanceOf(address(this));
  }

  /**
   * @notice Fallback function to receive ETH deposits
   * @dev Automatically emits Deposited event when ETH is sent to the contract
   */
  receive() external payable {
    emit Deposited(msg.sender, msg.value);
  }

  /**
   * @notice Allows users to deposit ERC20 tokens into the contract
   * @dev Transfers tokens from sender to contract using transferFrom
   * @param _token The address of the ERC20 token to deposit
   * @param _amount The amount of tokens to deposit
   * @custom:security Protected against reentrancy and requires contract to be unpaused
   */
  function depositToken(address _token, uint256 _amount) external nonReentrant whenNotPaused {
    if (!_isTokenSupported(_token)) revert UnsupportedToken(_token);
    if (_amount == 0) revert ZeroAmount();

    IERC20(_token).safeTransferFrom(msg.sender, address(this), _amount);
    emit TokenDeposited(msg.sender, _token, _amount);
  }

  /**
   * @notice Transfers ETH/native tokens from the contract to a specified address
   * @dev Only owner can call this function and can transfer available balance
   * @param _to The recipient address
   * @param _amount The amount of ETH/native tokens to transfer
   * @custom:security Protected against reentrancy and requires contract to be unpaused
   */
  function transfer(address _to, uint256 _amount) external onlyOwner nonReentrant whenNotPaused {
    if (_to == address(0)) revert ZeroAddress();
    if (_amount == 0) revert ZeroAmount();
    if (_amount > address(this).balance) revert InsufficientBalance(_amount, address(this).balance);

    // --- Step 1: Get fee configuration ---
    uint16 feeBps = _getFeeBps(); // e.g., 50 = 0.5%
    if (feeBps > 10_000) revert InvalidFeeBps(feeBps);

    uint256 fee = 0;
    uint256 net = _amount;

    // --- Step 2: Calculate and process fee if configured ---
    if (feeBps > 0) {
      fee = (_amount * feeBps) / 10_000;
      net = _amount - fee;

      // Get fee collector address
      address feeCollector = IOfficer(officerAddress).getFeeCollector();
      if (feeCollector == address(0)) revert FeeCollectorNotConfigured();

      // Send fee to fee collector
      (bool sentFee, ) = feeCollector.call{value: fee}('');
      if (!sentFee) revert FeeTransferFailed();
      emit FeePaid(feeCollector, fee);
    }

    // --- Step 3: Send net amount to recipient ---
    (bool sentNet, ) = _to.call{value: net}('');
    if (!sentNet) revert TransferFailed();

    emit Transfer(msg.sender, _to, net);
  }

  /**
   * @notice Transfers ERC20 tokens from the contract to a specified address
   * @dev Only owner can call this function. Fees are only charged for FeeCollector-supported tokens
   * @param _token The address of the ERC20 token contract
   * @param _to The recipient address
   * @param _amount The amount of tokens to transfer (before fees)
   * @custom:security Protected against reentrancy and requires contract to be unpaused
   */
  function transferToken(
    address _token,
    address _to,
    uint256 _amount
  ) external onlyOwner nonReentrant whenNotPaused {
    if (!_isTokenSupported(_token)) revert UnsupportedToken(_token);
    if (_to == address(0)) revert ZeroAddress();
    if (_amount == 0) revert ZeroAmount();
    {
      uint256 tokenBal = getTokenBalance(_token);
      if (_amount > tokenBal) revert InsufficientBalance(_amount, tokenBal);
    }

    // Check if this is a fee-supported token (USDC or USDT)
    bool shouldChargeFee = _isSupportedFeeToken(_token);

    uint256 fee = 0;
    uint256 net = _amount;

    // Only charge fee for FeeCollector-supported tokens
    if (shouldChargeFee) {
      uint16 feeBps = _getFeeBps(); // e.g., 50 = 0.5%
      if (feeBps > 10_000) revert InvalidFeeBps(feeBps);

      if (feeBps > 0) {
        fee = (_amount * feeBps) / 10_000;
        net = _amount - fee;

        // Get fee collector address
        address feeCollector = IOfficer(officerAddress).getFeeCollector();
        if (feeCollector == address(0)) revert FeeCollectorNotConfigured();

        // Transfer fee to fee collector
        IERC20(_token).safeTransfer(feeCollector, fee);
        emit FeePaid(feeCollector, fee);
      }
    }

    // Transfer net amount to recipient
    IERC20(_token).safeTransfer(_to, net);
    emit TokenTransfer(msg.sender, _to, _token, net);
  }

  /**
   * @notice Funds Investor and triggers native ETH dividend distribution
   * @param _amount Total ETH amount to distribute
   */
  function distributeNativeDividends(
    uint256 _amount
  ) external onlyOwner nonReentrant whenNotPaused {
    if (_amount == 0) revert ZeroAmount();
    if (_amount > address(this).balance) revert InsufficientBalance(_amount, address(this).balance);

    address investorAddress = _getInvestorAddress();
    IInvestorV1(investorAddress).distributeNativeDividends{value: _amount}(_amount);

    emit DividendDistributionTriggered(investorAddress, address(0), _amount);
  }

  /**
   * @notice Funds Investor and triggers ERC20 dividend distribution
   * @param _token Token address to distribute
   * @param _amount Total token amount to distribute
   */
  function distributeTokenDividends(
    address _token,
    uint256 _amount
  ) external onlyOwner nonReentrant whenNotPaused {
    if (!_isTokenSupported(_token)) revert UnsupportedToken(_token);
    if (_amount == 0) revert ZeroAmount();
    {
      uint256 tokenBal = getTokenBalance(_token);
      if (_amount > tokenBal) revert InsufficientBalance(_amount, tokenBal);
    }

    address investorAddress = _getInvestorAddress();
    IERC20(_token).safeTransfer(investorAddress, _amount);
    IInvestorV1(investorAddress).distributeTokenDividends(_token, _amount);

    emit DividendDistributionTriggered(investorAddress, _token, _amount);
  }

  /**
   * @dev Internal function to get the fee basis points from Officer contract
   * @return The fee in basis points (e.g., 50 = 0.5%)
   */
  function _getFeeBps() internal view returns (uint16) {
    return IOfficer(officerAddress).getFeeFor('BANK');
  }

  /**
   * @dev Internal function to check if a token is supported by the FeeCollector
   * @param _token The token address to check
   * @return bool True if the token is supported by the FeeCollector
   */
  function _isSupportedFeeToken(address _token) internal view returns (bool) {
    return IOfficer(officerAddress).isFeeCollectorToken(_token);
  }

  /**
   * @notice Pauses the contract, disabling most functionality
   * @dev Only the contract owner can pause the contract
   * @custom:security Emergency stop mechanism to halt operations if needed
   */
  function pause() external onlyOwner {
    _pause();
  }

  /**
   * @notice Unpauses the contract, re-enabling functionality
   * @dev Only the contract owner can unpause the contract
   * @custom:security Allows resuming operations after emergency pause
   */
  function unpause() external onlyOwner {
    _unpause();
  }
}
