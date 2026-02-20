// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/ReentrancyGuardUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/PausableUpgradeable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

interface IInvestorV1 {
    function individualMint(address shareholder, uint256 amount) external;
    function hasRole(bytes32 role, address account) external view returns (bool);
    function MINTER_ROLE() external view returns (bytes32);
}

interface IERC20Metadata {
    function decimals() external view returns (uint8);
}

/**
 * @title SafeDepositRouter
 * @author CNC Portal Team
 * @notice Allows users to deposit tokens and receive SHER tokens with a configurable multiplier
 * @dev Disabled by default - owner must enable deposits. Emergency pause available for security.
 * 
 * Formula: SHER minted = (deposited tokens normalized to 18 decimals) × multiplier
 * 
 * Examples:
 * - multiplier = 1: 100 USDC → 100 SHER
 */
contract SafeDepositRouter is
    Initializable,
    OwnableUpgradeable,
    ReentrancyGuardUpgradeable,
    PausableUpgradeable
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

    /// @notice Safe address where deposited tokens are sent
    address public safeAddress;
    
    /// @notice InvestorV1 contract that mints SHER tokens
    address public investorAddress;
    
    /// @notice Simple multiplier (1 = 1:1, 2 = 2:1, etc.)
    /// @dev SHER minted = (normalized token amount) × multiplier
    uint256 public multiplier;

    /// @notice Whether deposits are enabled (separate from paused state)
    /// @dev Disabled by default - owner must call enableDeposits() to allow deposits
    bool public depositsEnabled;

    /// @notice Mapping of supported token addresses
    mapping(address => bool) public supportedTokens;

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
    event InvestorAddressUpdated(address indexed oldInvestor, address indexed newInvestor);
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
     * @param _investorAddress InvestorV1 contract that mints SHER (can be zero, set later)
     * @param _tokenAddresses Initial supported tokens
     * @param _multiplier SHER multiplier (1 = 1:1, 2 = 2:1, etc.)
     * 
     * @dev Deposits disabled by default - call enableDeposits() to start
     * @dev investorAddress can be zero during initialization - will be set by Officer
     */
    function initialize(
        address _safeAddress,
        address _investorAddress,
        address[] calldata _tokenAddresses,
        uint256 _multiplier
    ) public initializer {
        if (_safeAddress == address(0)) revert InvalidSafeAddress();
        if (_multiplier < MIN_MULTIPLIER) revert MultiplierTooLow();

        __Ownable_init(msg.sender);
        __ReentrancyGuard_init();
        __Pausable_init();

        safeAddress = _safeAddress;
        investorAddress = _investorAddress;
        multiplier = _multiplier;
        depositsEnabled = false; // Disabled by default

        // Whitelist initial tokens
        for (uint256 i = 0; i < _tokenAddresses.length; ++i) {
            address tokenAddress = _tokenAddresses[i];
            if (tokenAddress == address(0)) revert InvalidTokenAddress();

            uint8 decimals = IERC20Metadata(tokenAddress).decimals();
            if (decimals > 18) revert InvalidTokenDecimals();

            supportedTokens[tokenAddress] = true;
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
    function deposit(address tokenAddress, uint256 amount)
        external
        nonReentrant
        whenDepositsEnabled
        whenNotPaused
    {
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
    ) external nonReentrant whenDepositsEnabled  whenNotPaused{
        _deposit(tokenAddress, amount, minSherOut);
    }

    /**
     * @notice Internal deposit implementation
     * @param tokenAddress Address of the token to deposit
     * @param amount Amount of tokens to deposit
     * @param minSherOut Minimum SHER to receive (0 for no slippage protection)
     */
    function _deposit(address tokenAddress, uint256 amount, uint256 minSherOut) internal {
        
        if (!supportedTokens[tokenAddress]) revert TokenNotSupported();
        if (amount == 0) revert ZeroAmount();
        
        //  ADD: Check investorAddress is set before attempting deposit
        if (investorAddress == address(0)) revert InvalidInvestorAddress();

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


    /*//////////////////////////////////////////////////////////////
                         CALCULATION FUNCTIONS
    //////////////////////////////////////////////////////////////*/

    /**
     * @notice Calculate SHER compensation for token amount
     * @param tokenAddress Token address
     * @param tokenAmount Amount in token's decimals
     * @return SHER amount (18 decimals)
     * 
     * @dev Formula: SHER = (token amount normalized to 18 decimals) × multiplier
     * 
     */
    function calculateCompensation(
        address tokenAddress,
        uint256 tokenAmount
    ) public view returns (uint256) {
        if (!supportedTokens[tokenAddress]) revert TokenNotSupported();
        if (tokenAmount == 0) revert ZeroAmount();
        if (investorAddress == address(0)) revert InvalidInvestorAddress();

        uint8 tokenDec = tokenDecimals[tokenAddress];
        uint8 sherDec = IERC20Metadata(investorAddress).decimals();

        uint256 normalizedAmount;

        if (tokenDec < sherDec) {
            normalizedAmount = tokenAmount * (10 ** (sherDec - tokenDec));
        } else if (tokenDec > sherDec) {
            normalizedAmount = tokenAmount / (10 ** (tokenDec - sherDec));
        } else {
            normalizedAmount = tokenAmount;
        }

        return normalizedAmount * multiplier;
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
        if (supportedTokens[tokenAddress]) revert TokenAlreadySupported();

        uint8 decimals = IERC20Metadata(tokenAddress).decimals();
        if (decimals > 18) revert InvalidTokenDecimals();

        supportedTokens[tokenAddress] = true;
        tokenDecimals[tokenAddress] = decimals;

        emit TokenSupportAdded(tokenAddress, decimals);
    }

    /**
     * @notice Remove token from deposit whitelist
     * @param tokenAddress Token address to remove
     */
    function removeTokenSupport(address tokenAddress) external onlyOwner {
        if (tokenAddress == address(0)) revert InvalidTokenAddress();
        if (!supportedTokens[tokenAddress]) revert TokenNotSupported();

        supportedTokens[tokenAddress] = false;
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
     * @notice Update InvestorV1 address
     * @param _newInvestor New InvestorV1 address
     */
    function setInvestorAddress(address _newInvestor) external onlyOwner {
        if (_newInvestor == address(0)) revert InvalidInvestorAddress();

        // Only check MINTER_ROLE if we're setting a non-zero address
        IInvestorV1 investor = IInvestorV1(_newInvestor);
        if (!investor.hasRole(investor.MINTER_ROLE(), address(this))) {
            revert InsufficientMinterRole();
        }

        emit InvestorAddressUpdated(investorAddress, _newInvestor);
        investorAddress = _newInvestor;
    }

    /**
     * @notice Update multiplier
     * @param _newMultiplier New multiplier (minimum 1)
     * 
     * @dev Examples:
     *      - 1 = 1:1 ratio (1 token = 1 SHER)
     *      - 2 = 2:1 ratio (1 token = 2 SHER)
     *      - 10 = 10:1 ratio (1 token = 10 SHER)
     */
    function setMultiplier(uint256 _newMultiplier) external onlyOwner {
        if (_newMultiplier < MIN_MULTIPLIER) revert MultiplierTooLow();
        emit MultiplierUpdated(multiplier, _newMultiplier);
        multiplier = _newMultiplier;
    }

    /**
     * @notice Recover accidentally sent tokens
     * @param token Token address
     * @param amount Amount to recover
     * @dev Always sends to Safe
     */
    function recoverERC20(
        address token,
        uint256 amount
    ) external onlyOwner  {
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