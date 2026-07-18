// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {OwnableUpgradeable} from "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import {Initializable} from "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import {PausableUpgradeable} from "@openzeppelin/contracts-upgradeable/utils/PausableUpgradeable.sol";
import {ReentrancyGuardUpgradeable} from "@openzeppelin/contracts-upgradeable/utils/ReentrancyGuardUpgradeable.sol";
import {IERC20Metadata} from "@openzeppelin/contracts/token/ERC20/extensions/IERC20Metadata.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {TokenSupport} from "./base/TokenSupport.sol";
import {IInvestorV1} from "./interfaces/IInvestorV1.sol";
import {IOfficer} from "./interfaces/IOfficer.sol";

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
  PausableUpgradeable,
  TokenSupport
{
  using SafeERC20 for IERC20;

  /*//////////////////////////////////////////////////////////////
                              CONSTANTS
    //////////////////////////////////////////////////////////////*/

  /// @notice Minimum multiplier value (must be at least 1)
  uint256 public constant MIN_MULTIPLIER = 1;

  /*//////////////////////////////////////////////////////////////
                                STORAGE
    //////////////////////////////////////////////////////////////*/

  /// @dev Safe address where deposited tokens are sent
  address private s_safeAddress;

  /// @dev Officer contract address (set during initialization)
  address private s_officerAddress;

  /// @dev Simple multiplier (1 = 1:1, 2 = 2:1, etc.)
  /// @dev SHER minted = (normalized token amount) × multiplier
  uint256 private s_multiplier;

  /// @dev Whether deposits are enabled (separate from paused state)
  /// @dev Disabled by default - owner must call enableDeposits() to allow deposits
  bool private s_depositsEnabled;

  /// @dev Stored decimals for each token (prevents manipulation)
  mapping(address token => uint8 decimals) private s_tokenDecimals;

  /*//////////////////////////////////////////////////////////////
                          UPGRADE STORAGE GAP
    //////////////////////////////////////////////////////////////*/

  uint256[50] private __gap; // solhint-disable-line chainlink-solidity/prefix-storage-variables-with-s-underscore

  /*//////////////////////////////////////////////////////////////
                                EVENTS
    //////////////////////////////////////////////////////////////*/

  /**
   * @notice Emitted when a user deposits tokens and receives SHER.
   * @param depositor The depositor.
   * @param token The deposited ERC20 token.
   * @param tokenAmount Amount deposited (in token decimals).
   * @param sherAmount SHER minted in return.
   * @param timestamp Block number recorded for the deposit.
   */
  event Deposited(
    address indexed depositor,
    address indexed token,
    uint256 tokenAmount,
    uint256 sherAmount,
    uint256 timestamp
  );

  /// @notice Emitted when deposits are enabled.
  event DepositsEnabled(address indexed enabledBy);
  /// @notice Emitted when deposits are disabled.
  event DepositsDisabled(address indexed disabledBy);
  /// @notice Emitted when the Safe address is updated.
  event SafeAddressUpdated(address indexed oldSafe, address indexed newSafe);
  /// @notice Emitted when the multiplier is updated.
  event MultiplierUpdated(uint256 oldMultiplier, uint256 newMultiplier);
  /// @notice Emitted when a new token is whitelisted, along with its stored decimals.
  event TokenSupportAdded(address indexed tokenAddress, uint8 decimals);
  /// @notice Emitted when stray tokens are recovered to the Safe.
  event TokensRecovered(address indexed token, address indexed to, uint256 amount);

  /*//////////////////////////////////////////////////////////////
                                ERRORS
    //////////////////////////////////////////////////////////////*/

  /// @dev The owner address is invalid.
  error SafeDepositRouter__InvalidOwner();
  /// @dev The Safe address is invalid (e.g. zero address).
  error SafeDepositRouter__InvalidSafeAddress();
  /// @dev The Investor address is invalid.
  error SafeDepositRouter__InvalidInvestorAddress();
  /// @dev The token address is invalid.
  error SafeDepositRouter__InvalidTokenAddress();
  /// @dev The token decimals value is outside the supported range.
  error SafeDepositRouter__InvalidTokenDecimals();
  /// @dev The multiplier is below the allowed minimum.
  error SafeDepositRouter__MultiplierTooLow();
  /// @dev The amount must be greater than zero.
  error SafeDepositRouter__ZeroAmount();
  /// @dev The router does not hold MINTER_ROLE on InvestorV1.
  error SafeDepositRouter__InsufficientMinterRole();
  /// @dev The token is not supported by this router.
  error SafeDepositRouter__TokenNotSupported();
  /// @dev The token is already supported.
  error SafeDepositRouter__TokenAlreadySupported();
  /// @dev The output SHER amount is less than the caller's minimum.
  /// @param expected The caller's minimum acceptable SHER amount.
  /// @param actual The SHER amount that would be minted.
  error SafeDepositRouter__SlippageExceeded(uint256 expected, uint256 actual);
  /// @dev Deposits are currently disabled.
  error SafeDepositRouter__DepositsNotEnabled();
  /// @dev The caller (msg.sender) was the zero address when assigning officerAddress.
  error SafeDepositRouter__ZeroSender();
  /// @dev The officer contract address has not been configured on this router.
  error SafeDepositRouter__OfficerAddressNotSet();
  /// @dev The InvestorV1 contract could not be located via the Officer.
  error SafeDepositRouter__InvestorContractNotFound();

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
    if (!s_depositsEnabled) revert SafeDepositRouter__DepositsNotEnabled();
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

  /*//////////////////////////////////////////////////////////////
                      TOKEN MANAGEMENT FUNCTIONS
    //////////////////////////////////////////////////////////////*/

  /**
   * @notice Add token to deposit whitelist
   * @param tokenAddress Token address to add
   */
  function addTokenSupport(address tokenAddress) external override onlyOwner {
    if (tokenAddress == address(0)) revert SafeDepositRouter__InvalidTokenAddress();
    if (_isTokenSupported(tokenAddress)) revert SafeDepositRouter__TokenAlreadySupported();

    uint8 decimals = IERC20Metadata(tokenAddress).decimals();
    if (decimals > 18) revert SafeDepositRouter__InvalidTokenDecimals();

    _addTokenSupport(tokenAddress);
    s_tokenDecimals[tokenAddress] = decimals;

    emit TokenSupportAdded(tokenAddress, decimals);
  }

  /**
   * @notice Remove token from deposit whitelist
   * @param tokenAddress Token address to remove
   */
  function removeTokenSupport(address tokenAddress) external override onlyOwner {
    if (tokenAddress == address(0)) revert SafeDepositRouter__InvalidTokenAddress();
    if (!_isTokenSupported(tokenAddress)) revert SafeDepositRouter__TokenNotSupported();

    _removeTokenSupport(tokenAddress);

    emit TokenSupportRemoved(tokenAddress);
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
    s_depositsEnabled = true;
    emit DepositsEnabled(msg.sender);
  }

  /**
   * @notice Disable deposits (stop accepting new deposits)
   * @dev This does NOT affect existing balances or other operations
   * @dev Can only be called by owner
   */
  function disableDeposits() external onlyOwner {
    s_depositsEnabled = false;
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
   * @param newSafe New Safe address
   */
  function setSafeAddress(address newSafe) external onlyOwner {
    if (newSafe == address(0)) revert SafeDepositRouter__InvalidSafeAddress();
    emit SafeAddressUpdated(s_safeAddress, newSafe);
    s_safeAddress = newSafe;
  }

  /**
   * @notice Update multiplier
   * @param newMultiplier New multiplier as fixed-point using SHER decimals
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
  function setMultiplier(uint256 newMultiplier) external onlyOwner {
    address investorAddress = _getInvestorAddress();

    uint8 sherDec = IERC20Metadata(investorAddress).decimals();

    // Ensure SHER has enough decimals to support 0.000001
    if (sherDec < 6) revert SafeDepositRouter__InvalidTokenDecimals();

    uint256 minMultiplier = 10 ** (sherDec - 6);

    if (newMultiplier < minMultiplier) revert SafeDepositRouter__MultiplierTooLow();

    emit MultiplierUpdated(s_multiplier, newMultiplier);
    s_multiplier = newMultiplier;
  }

  /**
   * @notice Recover accidentally sent tokens
   * @param token Token address
   * @param amount Amount to recover
   * @dev Always sends to Safe
   */
  function recoverERC20(address token, uint256 amount) external onlyOwner {
    if (token == address(0)) revert SafeDepositRouter__InvalidTokenAddress();
    if (amount == 0) revert SafeDepositRouter__ZeroAmount();

    IERC20(token).safeTransfer(s_safeAddress, amount);
    emit TokensRecovered(token, s_safeAddress, amount);
  }

  /*//////////////////////////////////////////////////////////////
                              INITIALIZATION
    //////////////////////////////////////////////////////////////*/

  /**
   * @notice Initialize the SafeDepositRouter
   * @param safeAddress Safe wallet address where deposits are sent
   * @param tokenAddresses Initial supported tokens
   * @param multiplier SHER multiplier (1 = 1:1, 2 = 2:1, etc.)
   *
   * @dev Deposits disabled by default - call enableDeposits() to start
   * @dev officerAddress is set from msg.sender (Officer contract)
   */
  function initialize(
    address safeAddress,
    address[] calldata tokenAddresses,
    uint256 multiplier
  ) public initializer {
    if (safeAddress == address(0)) revert SafeDepositRouter__InvalidSafeAddress();
    if (multiplier < MIN_MULTIPLIER) revert SafeDepositRouter__MultiplierTooLow();

    __Ownable_init(msg.sender);
    __ReentrancyGuard_init();
    __Pausable_init();

    s_safeAddress = safeAddress;
    if (msg.sender == address(0)) revert SafeDepositRouter__ZeroSender();
    s_officerAddress = msg.sender;
    s_multiplier = multiplier;
    s_depositsEnabled = false; // Disabled by default

    // Whitelist initial tokens
    for (uint256 i = 0; i < tokenAddresses.length; ++i) {
      address tokenAddress = tokenAddresses[i];
      if (tokenAddress == address(0)) revert SafeDepositRouter__InvalidTokenAddress();

      uint8 decimals = IERC20Metadata(tokenAddress).decimals();
      if (decimals > 18) revert SafeDepositRouter__InvalidTokenDecimals();

      _addTokenSupport(tokenAddress);
      s_tokenDecimals[tokenAddress] = decimals;

      emit TokenSupportAdded(tokenAddress, decimals);
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
    if (!_isTokenSupported(tokenAddress)) revert SafeDepositRouter__TokenNotSupported();
    if (tokenAmount == 0) revert SafeDepositRouter__ZeroAmount();

    address investorAddress = _getInvestorAddress();

    uint8 tokenDec = s_tokenDecimals[tokenAddress];
    uint8 sherDec = IERC20Metadata(investorAddress).decimals();

    uint256 normalizedAmount = _normalizeDecimals(tokenAmount, tokenDec, sherDec);

    return (normalizedAmount * s_multiplier) / (10 ** sherDec);
  }

  /*//////////////////////////////////////////////////////////////
                                GETTERS
    //////////////////////////////////////////////////////////////*/

  /// @notice Returns the Safe address where deposited tokens are sent.
  function getSafeAddress() public view returns (address) {
    return s_safeAddress;
  }

  /// @notice Returns the Officer contract address.
  function getOfficerAddress() public view returns (address) {
    return s_officerAddress;
  }

  /// @notice Returns the current SHER multiplier.
  function getMultiplier() public view returns (uint256) {
    return s_multiplier;
  }

  /// @notice Returns whether deposits are currently enabled.
  function getDepositsEnabled() public view returns (bool) {
    return s_depositsEnabled;
  }

  /// @notice Returns the stored decimals for a supported token.
  /// @param token The token address.
  function getTokenDecimals(address token) public view returns (uint8) {
    return s_tokenDecimals[token];
  }

  /// @notice Current contract version, per semver.
  function version() public pure returns (string memory) {
    return "2.0.0";
  }

  /**
   * @notice Internal deposit implementation
   * @param tokenAddress Address of the token to deposit
   * @param amount Amount of tokens to deposit
   * @param minSherOut Minimum SHER to receive (0 for no slippage protection)
   */
  function _deposit(address tokenAddress, uint256 amount, uint256 minSherOut) internal {
    if (!_isTokenSupported(tokenAddress)) revert SafeDepositRouter__TokenNotSupported();
    if (amount == 0) revert SafeDepositRouter__ZeroAmount();

    address investorAddress = _getInvestorAddress();

    // Check MINTER_ROLE before attempting to mint
    IInvestorV1 investor = IInvestorV1(investorAddress);
    if (!investor.hasRole(investor.MINTER_ROLE(), address(this)))
      revert SafeDepositRouter__InsufficientMinterRole();

    // Calculate SHER compensation
    uint256 sherAmount = calculateCompensation(tokenAddress, amount);

    // Check slippage if specified
    if (minSherOut > 0 && sherAmount < minSherOut)
      revert SafeDepositRouter__SlippageExceeded(minSherOut, sherAmount);

    // Transfer tokens to Safe
    IERC20(tokenAddress).safeTransferFrom(msg.sender, s_safeAddress, amount);

    // Mint SHER to depositor
    investor.individualMint(msg.sender, sherAmount);

    emit Deposited({
      depositor: msg.sender,
      token: tokenAddress,
      tokenAmount: amount,
      sherAmount: sherAmount,
      timestamp: block.number
    });
  }

  /**
   * @notice Internal helper to get InvestorV1 contract address from Officer
   * @return Address of the InvestorV1 contract
   */
  function _getInvestorAddress() internal view returns (address) {
    if (s_officerAddress == address(0)) revert SafeDepositRouter__OfficerAddressNotSet();
    address investorAddress = IOfficer(s_officerAddress).findDeployedContract("InvestorV1");
    if (investorAddress == address(0)) revert SafeDepositRouter__InvestorContractNotFound();
    return investorAddress;
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
}
