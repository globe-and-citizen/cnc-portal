// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import '@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol';
import '@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol';
import '@openzeppelin/contracts-upgradeable/utils/ReentrancyGuardUpgradeable.sol';
import '@openzeppelin/contracts-upgradeable/utils/PausableUpgradeable.sol';
import '@openzeppelin/contracts/token/ERC20/IERC20.sol';
import '@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol';
import '@openzeppelin/contracts/utils/structs/EnumerableSet.sol';
import './interfaces/IInvestorV1.sol';
import './interfaces/IOfficer.sol';

interface IERC20Metadata {
  function decimals() external view returns (uint8);
}

/**
 * @title SafeDepositRouter
 * @author CNC Portal Team
 * @notice Allows users to deposit tokens and receive SHER tokens with a configurable multiplier
 * @dev Disabled by default - owner must enable deposits. Emergency pause available for security.
 *
 * Multiplier is **fixed-point** using SHER token decimals ($10^{sherDec}$ scale).
 *
 * Formula:
 * - Let `normalized` = deposited token amount normalized to `sherDec`
 * - SHER minted = `normalized × multiplier ÷ 10^sherDec`
 *
 * Examples (assuming SHER has 18 decimals):
 * - `multiplier = 1e18` (1.0x): 100 USDC → 100 SHER
 * - `multiplier = 2e18` (2.0x): 100 USDC → 200 SHER
 */
contract SafeDepositRouter is
  Initializable,
  OwnableUpgradeable,
  ReentrancyGuardUpgradeable,
  PausableUpgradeable
{
  using SafeERC20 for IERC20;
  using EnumerableSet for EnumerableSet.AddressSet;

  /*//////////////////////////////////////////////////////////////
                              CONSTANTS
    //////////////////////////////////////////////////////////////*/

  /// @notice Minimum multiplier value (must be at least 1)
  uint256 public constant MIN_MULTIPLIER = 1;

  /*//////////////////////////////////////////////////////////////
                                STORAGE
    //////////////////////////////////////////////////////////////*/

  /// @notice Safe address where deposited tokens are sent
  address public safeAddress;

  /// @notice Officer contract address (set during initialization)
  address public officerAddress;

  /// @notice Simple multiplier (1 = 1:1, 2 = 2:1, etc.)
  /// @dev SHER minted = (normalized token amount) × multiplier
  uint256 public multiplier;

  /// @notice Whether deposits are enabled (separate from paused state)
  /// @dev Disabled by default - owner must call enableDeposits() to allow deposits
  bool public depositsEnabled;

  /// @notice Set of supported token addresses for enumeration
  EnumerableSet.AddressSet private _supportedTokens;

  /// @notice Stored decimals for each token (prevents manipulation)
  mapping(address => uint8) public tokenDecimals;

  /*//////////////////////////////////////////////////////////////
                                EVENTS
    //////////////////////////////////////////////////////////////*/

  event Deposited(
    address indexed depositor,
    address indexed token,
    uint256 tokenAmount,
    uint256 sherAmount,
    uint256 timestamp
  );

  event DepositsEnabled(address indexed enabledBy);
  event DepositsDisabled(address indexed disabledBy);
  event SafeAddressUpdated(address indexed oldSafe, address indexed newSafe);
  event MultiplierUpdated(uint256 oldMultiplier, uint256 newMultiplier);
  event TokenSupportAdded(address indexed tokenAddress, uint8 decimals);
  event TokenSupportRemoved(address indexed tokenAddress);
  event TokensRecovered(address indexed token, address indexed to, uint256 amount);

  /*//////////////////////////////////////////////////////////////
                                ERRORS
    //////////////////////////////////////////////////////////////*/

  error InvalidOwner();
  error InvalidSafeAddress();
  error InvalidInvestorAddress();
  error InvalidTokenAddress();
  error InvalidTokenDecimals();
  error MultiplierTooLow();
  error ZeroAmount();
  error InsufficientMinterRole();
  error TokenNotSupported();
  error TokenAlreadySupported();
  error SlippageExceeded(uint256 expected, uint256 actual);
  error DepositsNotEnabled();

  /*//////////////////////////////////////////////////////////////
                              MODIFIERS
    //////////////////////////////////////////////////////////////*/

  /**
   * @notice Ensures deposits are enabled and contract is not paused
   * @dev Two-level check:
   *      1. depositsEnabled must be true (normal operation)
   *      2. Contract must not be paused (emergency override)
   */
  modifier whenDepositsEnabled() {
    if (!depositsEnabled) revert DepositsNotEnabled();
    _;
  }

  /*//////////////////////////////////////////////////////////////
                              CONSTRUCTOR
    //////////////////////////////////////////////////////////////*/

  /// @custom:oz-upgrades-unsafe-allow constructor
  constructor() {
    _disableInitializers();
  }

  /*//////////////////////////////////////////////////////////////
                              INITIALIZATION
    //////////////////////////////////////////////////////////////*/

  /**
   * @notice Initialize the SafeDepositRouter
   * @param _safeAddress Safe wallet address where deposits are sent
   * @param _tokenAddresses Initial supported tokens
   * @param _multiplier SHER multiplier (1 = 1:1, 2 = 2:1, etc.)
   *
   * @dev Deposits disabled by default - call enableDeposits() to start
   * @dev officerAddress is set from msg.sender (Officer contract)
   */
  function initialize(
    address _safeAddress,
    address[] calldata _tokenAddresses,
    uint256 _multiplier
  ) public initializer {
    if (_safeAddress == address(0)) revert InvalidSafeAddress();
    if (_multiplier < MIN_MULTIPLIER) revert MultiplierTooLow();

    __Ownable_init(msg.sender);
    __ReentrancyGuard_init();
    __Pausable_init();

    safeAddress = _safeAddress;
    require(msg.sender != address(0), 'msg.sender cannot be zero');
    officerAddress = msg.sender;
    multiplier = _multiplier;
    depositsEnabled = false; // Disabled by default

    // Whitelist initial tokens
    for (uint256 i = 0; i < _tokenAddresses.length; ++i) {
      address tokenAddress = _tokenAddresses[i];
      if (tokenAddress == address(0)) revert InvalidTokenAddress();

      uint8 decimals = IERC20Metadata(tokenAddress).decimals();
      if (decimals > 18) revert InvalidTokenDecimals();

      _supportedTokens.add(tokenAddress);
      tokenDecimals[tokenAddress] = decimals;

      emit TokenSupportAdded(tokenAddress, decimals);
    }
  }

  /*//////////////////////////////////////////////////////////////
                          DEPOSIT FUNCTIONS
    //////////////////////////////////////////////////////////////*/

  /**
   * @notice Deposit tokens and receive SHER
   * @param tokenAddress Token to deposit
   * @param amount Amount to deposit
   * @dev Requires deposits to be enabled and contract not paused
   */
  function deposit(
    address tokenAddress,
    uint256 amount
  ) external nonReentrant whenDepositsEnabled whenNotPaused {
    _deposit(tokenAddress, amount, 0);
  }

  /**
   * @notice Deposit tokens with slippage protection
   * @param tokenAddress Token to deposit
   * @param amount Amount to deposit
   * @param minSherOut Minimum SHER expected
   * @dev Requires deposits to be enabled and contract not paused
   */
  function depositWithSlippage(
    address tokenAddress,
    uint256 amount,
    uint256 minSherOut
  ) external nonReentrant whenDepositsEnabled whenNotPaused {
    _deposit(tokenAddress, amount, minSherOut);
  }

  /**
   * @notice Internal helper to get InvestorV1 contract address from Officer
   * @return Address of the InvestorV1 contract
   */
  function _getInvestorAddress() internal view returns (address) {
    require(officerAddress != address(0), 'Officer address not configured');
    address investorAddress = IOfficer(officerAddress).findDeployedContract('InvestorV1');
    require(investorAddress != address(0), 'InvestorV1 contract not found');
    return investorAddress;
  }

  /**
   * @notice Internal deposit implementation
   * @param tokenAddress Address of the token to deposit
   * @param amount Amount of tokens to deposit
   * @param minSherOut Minimum SHER to receive (0 for no slippage protection)
   */
  function _deposit(address tokenAddress, uint256 amount, uint256 minSherOut) internal {
    if (!_supportedTokens.contains(tokenAddress)) revert TokenNotSupported();
    if (amount == 0) revert ZeroAmount();

    address investorAddress = _getInvestorAddress();

    // Check MINTER_ROLE before attempting to mint
    IInvestorV1 investor = IInvestorV1(investorAddress);
    if (!investor.hasRole(investor.MINTER_ROLE(), address(this))) {
      revert InsufficientMinterRole();
    }

    // Calculate SHER compensation
    uint256 sherAmount = calculateCompensation(tokenAddress, amount);

    // Check slippage if specified
    if (minSherOut > 0 && sherAmount < minSherOut) {
      revert SlippageExceeded(minSherOut, sherAmount);
    }

    // Transfer tokens to Safe
    IERC20(tokenAddress).safeTransferFrom(msg.sender, safeAddress, amount);

    // Mint SHER to depositor
    investor.individualMint(msg.sender, sherAmount);

    emit Deposited(msg.sender, tokenAddress, amount, sherAmount, block.number);
  }

  function _normalizeDecimals(
    uint256 amount,
    uint8 fromDec,
    uint8 toDec
  ) internal pure returns (uint256) {
    if (fromDec == toDec) return amount;

    if (fromDec < toDec) {
      return amount * (10 ** (toDec - fromDec));
    } else {
      return amount / (10 ** (fromDec - toDec));
    }
  }

  /*//////////////////////////////////////////////////////////////
                        CALCULATION FUNCTIONS
    //////////////////////////////////////////////////////////////*/

  /**
   * @notice Calculate SHER compensation for token amount
   * @param tokenAddress Token address
   * @param tokenAmount Amount in token's decimals
   * @return SHER amount (in SHER token decimals)
   *
   * @dev Multiplier is fixed-point using SHER decimals.
   *      Formula:
   *      - `normalized = tokenAmount` normalized to `sherDec`
   *      - `sherOut = normalized × multiplier ÷ 10^sherDec`
   */
  function calculateCompensation(
    address tokenAddress,
    uint256 tokenAmount
  ) public view returns (uint256) {
    if (!_supportedTokens.contains(tokenAddress)) revert TokenNotSupported();
    if (tokenAmount == 0) revert ZeroAmount();

    address investorAddress = _getInvestorAddress();

    uint8 tokenDec = tokenDecimals[tokenAddress];
    uint8 sherDec = IERC20Metadata(investorAddress).decimals();

    uint256 normalizedAmount = _normalizeDecimals(tokenAmount, tokenDec, sherDec);

    return (normalizedAmount * multiplier) / (10 ** sherDec);
  }

  /*//////////////////////////////////////////////////////////////
                      TOKEN MANAGEMENT FUNCTIONS
    //////////////////////////////////////////////////////////////*/

  /**
   * @notice Add token to deposit whitelist
   * @param tokenAddress Token address to add
   */
  function addTokenSupport(address tokenAddress) external onlyOwner {
    if (tokenAddress == address(0)) revert InvalidTokenAddress();
    if (!_supportedTokens.add(tokenAddress)) revert TokenAlreadySupported();

    uint8 decimals = IERC20Metadata(tokenAddress).decimals();
    if (decimals > 18) revert InvalidTokenDecimals();

    tokenDecimals[tokenAddress] = decimals;

    emit TokenSupportAdded(tokenAddress, decimals);
  }

  /**
   * @notice Remove token from deposit whitelist
   * @param tokenAddress Token address to remove
   */
  function removeTokenSupport(address tokenAddress) external onlyOwner {
    if (tokenAddress == address(0)) revert InvalidTokenAddress();
    if (!_supportedTokens.remove(tokenAddress)) revert TokenNotSupported();

    emit TokenSupportRemoved(tokenAddress);
  }

  /**
   * @notice Returns all supported token addresses
   * @return Array of supported token addresses
   */
  function getSupportedTokens() external view returns (address[] memory) {
    return _supportedTokens.values();
  }

  /**
   * @notice Returns the count of supported tokens
   * @return Number of supported tokens
   */
  function getSupportedTokenCount() external view returns (uint256) {
    return _supportedTokens.length();
  }

  /*//////////////////////////////////////////////////////////////
                    DEPOSIT CONTROL FUNCTIONS
    //////////////////////////////////////////////////////////////*/

  /**
   * @notice Enable deposits (normal operation)
   * @dev This is the primary way to allow deposits
   * @dev Can only be called by owner
   */
  function enableDeposits() external onlyOwner {
    depositsEnabled = true;
    emit DepositsEnabled(msg.sender);
  }

  /**
   * @notice Disable deposits (stop accepting new deposits)
   * @dev This does NOT affect existing balances or other operations
   * @dev Can only be called by owner
   */
  function disableDeposits() external onlyOwner {
    depositsEnabled = false;
    emit DepositsDisabled(msg.sender);
  }

  /*//////////////////////////////////////////////////////////////
                    EMERGENCY PAUSE FUNCTIONS
    //////////////////////////////////////////////////////////////*/

  /**
   * @notice Pause contract (emergency stop)
   * @dev Overrides depositsEnabled - even if enabled, deposits are blocked when paused
   * @dev Use this for security emergencies, NOT for normal operation
   * @dev Can only be called by owner
   */
  function pause() external onlyOwner {
    _pause();
  }

  /**
   * @notice Unpause contract (resume after emergency)
   * @dev This does NOT automatically enable deposits
   * @dev Deposits must also be enabled via enableDeposits()
   * @dev Can only be called by owner
   */
  function unpause() external onlyOwner {
    _unpause();
  }

  /*//////////////////////////////////////////////////////////////
                            ADMIN FUNCTIONS
    //////////////////////////////////////////////////////////////*/

  /**
   * @notice Update Safe address
   * @param _newSafe New Safe address
   */
  function setSafeAddress(address _newSafe) external onlyOwner {
    if (_newSafe == address(0)) revert InvalidSafeAddress();
    emit SafeAddressUpdated(safeAddress, _newSafe);
    safeAddress = _newSafe;
  }

  /**
   * @notice Update multiplier
   * @param _newMultiplier New multiplier as fixed-point using SHER decimals
   *
   * @dev Interpretation:
   *      - `1.0x` = `10^sherDec`
   *      - `2.0x` = `2 * 10^sherDec`
   *
   * Minimum:
   *      - Enforced to be at least `0.000001x` (i.e. `10^(sherDec-6)`).
   *
   * Examples (assuming SHER has 18 decimals):
   *      - `1e18` = 1.0x (1 token → 1 SHER, after normalization)
   *      - `2e18` = 2.0x (1 token → 2 SHER, after normalization)
   *      - `1e12` = 0.000001x
   */
  function setMultiplier(uint256 _newMultiplier) external onlyOwner {
    address investorAddress = _getInvestorAddress();

    uint8 sherDec = IERC20Metadata(investorAddress).decimals();

    // Ensure SHER has enough decimals to support 0.000001
    if (sherDec < 6) revert InvalidTokenDecimals();

    uint256 minMultiplier = 10 ** (sherDec - 6);

    if (_newMultiplier < minMultiplier) revert MultiplierTooLow();

    emit MultiplierUpdated(multiplier, _newMultiplier);
    multiplier = _newMultiplier;
  }

  /**
   * @notice Recover accidentally sent tokens
   * @param token Token address
   * @param amount Amount to recover
   * @dev Always sends to Safe
   */
  function recoverERC20(address token, uint256 amount) external onlyOwner {
    if (token == address(0)) revert InvalidTokenAddress();
    if (amount == 0) revert ZeroAmount();

    IERC20(token).safeTransfer(safeAddress, amount);
    emit TokensRecovered(token, safeAddress, amount);
  }

  /*//////////////////////////////////////////////////////////////
                          UPGRADE STORAGE GAP
    //////////////////////////////////////////////////////////////*/

  uint256[50] private __gap;
}
