// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/ReentrancyGuardUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/PausableUpgradeable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/utils/math/Math.sol";

interface IInvestorV1 {
    function individualMint(address shareholder, uint256 amount) external;
    function hasRole(bytes32 role, address account) external view returns (bool);
    function MINTER_ROLE() external view returns (bytes32);
}

interface IERC20Metadata {
    function decimals() external view returns (uint8);
}

/**
 * @title SafeDepositVault
 * @author CNC Portal Team
 * @notice Allows users to deposit tokens and receive SHER tokens based on configurable compensation ratio
 * @dev Paused by default - owner must call unpause() to enable deposits
 * 
 * Feature Requirements:
 * 1. Set compensation ratio (e.g., 1 SHER = 1 USDC)
 * 2. Disabled by default via pause mechanism
 * 3. Team owner can enable/disable deposits
 * 4. Configurable rate per team
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

    /// @notice Maximum compensation ratio (200% = 2:1)
    /// @dev 20000 basis points = 200% = deposit 1 token, receive 2 SHER
    uint256 public constant MAX_COMPENSATION_RATIO_BPS = 20_000;

    /// @notice Minimum compensation ratio (1% = 0.01:1)
    /// @dev 100 basis points = 1% = deposit 100 tokens, receive 1 SHER
    uint256 public constant MIN_COMPENSATION_RATIO_BPS = 100;

    /*//////////////////////////////////////////////////////////////
                                 STORAGE
    //////////////////////////////////////////////////////////////*/

    /// @notice Safe address where deposited tokens are sent
    address public safeAddress;
    
    /// @notice InvestorV1 contract that mints SHER tokens
    address public investorAddress;
    
    /// @notice Compensation ratio in basis points (10000 = 1:1, 5000 = 0.5:1)
    /// @dev Example: 10000 BPS = 100% = deposit 1 USDC, receive 1 SHER
    uint256 public compensationRatio;

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

    event SafeAddressUpdated(address indexed oldSafe, address indexed newSafe);
    event InvestorAddressUpdated(address indexed oldInvestor, address indexed newInvestor);
    event CompensationRatioUpdated(uint256 oldRatio, uint256 newRatio);
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
    error CompensationRatioTooHigh();
    error CompensationRatioTooLow();
    error ZeroAmount();
    error InsufficientMinterRole();
    error TokenNotSupported();
    error TokenAlreadySupported();
    error SlippageExceeded(uint256 expected, uint256 actual);

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
     * @notice Initialize the SafeDepositVault
     * @param _owner Team owner address
     * @param _safeAddress Safe wallet address
     * @param _investorAddress InvestorV1 contract address
     * @param _tokenAddresses Initial supported tokens
     * @param _compensationRatio Initial ratio in basis points
     * @dev Contract is PAUSED by default - owner must call unpause() to enable
     */
    function initialize(
        address _owner,
        address _safeAddress,
        address _investorAddress,
        address[] calldata _tokenAddresses,
        uint256 _compensationRatio
    ) public initializer {
        if (_owner == address(0)) revert InvalidOwner();
        if (_safeAddress == address(0)) revert InvalidSafeAddress();
        if (_investorAddress == address(0)) revert InvalidInvestorAddress();
        if (_compensationRatio > MAX_COMPENSATION_RATIO_BPS) revert CompensationRatioTooHigh();
        if (_compensationRatio < MIN_COMPENSATION_RATIO_BPS) revert CompensationRatioTooLow();

        __Ownable_init(_owner);
        __ReentrancyGuard_init();
        __Pausable_init();

        safeAddress = _safeAddress;
        investorAddress = _investorAddress;
        compensationRatio = _compensationRatio;

        for (uint256 i = 0; i < _tokenAddresses.length; ++i) {
            address tokenAddress = _tokenAddresses[i];
            if (tokenAddress == address(0)) revert InvalidTokenAddress();

            uint8 decimals = IERC20Metadata(tokenAddress).decimals();
            if (decimals > 18) revert InvalidTokenDecimals();

            supportedTokens[tokenAddress] = true;
            tokenDecimals[tokenAddress] = decimals;

            emit TokenSupportAdded(tokenAddress, decimals);
        }

        IInvestorV1 investor = IInvestorV1(_investorAddress);
        if (!investor.hasRole(investor.MINTER_ROLE(), address(this))) {
            revert InsufficientMinterRole();
        }

        // Pause contract by default - owner must explicitly enable
        _pause();
    }

    /*//////////////////////////////////////////////////////////////
                           DEPOSIT FUNCTIONS
    //////////////////////////////////////////////////////////////*/

    /**
     * @notice Deposit tokens and receive SHER (simple version)
     * @param tokenAddress Token to deposit
     * @param amount Amount to deposit
     * @dev Reverts if contract is paused
     */
    function deposit(address tokenAddress, uint256 amount)
        external
        nonReentrant
        whenNotPaused
    {
        _deposit(tokenAddress, amount, 0);
    }

    /**
     * @notice Deposit tokens with slippage protection
     * @param tokenAddress Token to deposit
     * @param amount Amount to deposit
     * @param minSherOut Minimum SHER expected
     * @dev Reverts if contract is paused or slippage exceeded
     */
    function depositWithSlippage(
        address tokenAddress,
        uint256 amount,
        uint256 minSherOut
    ) external nonReentrant whenNotPaused {
        _deposit(tokenAddress, amount, minSherOut);
    }

    /**
     * @dev Internal deposit logic
     */
    function _deposit(
        address tokenAddress,
        uint256 amount,
        uint256 minSherOut
    ) internal {
        if (amount == 0) revert ZeroAmount();
        if (!supportedTokens[tokenAddress]) revert TokenNotSupported();

        IERC20 token = IERC20(tokenAddress);

        uint256 balanceBefore = token.balanceOf(safeAddress);
        token.safeTransferFrom(msg.sender, safeAddress, amount);
        uint256 balanceAfter = token.balanceOf(safeAddress);

        uint256 receivedAmount = balanceAfter - balanceBefore;
        uint256 sherAmount = calculateCompensation(tokenAddress, receivedAmount);

        if (minSherOut > 0 && sherAmount < minSherOut) {
            revert SlippageExceeded(minSherOut, sherAmount);
        }

        IInvestorV1(investorAddress).individualMint(msg.sender, sherAmount);

        emit Deposited(msg.sender, tokenAddress, receivedAmount, sherAmount, block.timestamp);
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
     * @dev Uses Math.mulDiv for overflow-safe calculation
     * @dev Formula: (tokenAmount * 10^(18-decimals) * compensationRatio) / 10_000
     * 
     * Examples:
     * - 100 USDC (6 decimals), 50% ratio (5000 BPS):
     *   normalizedAmount = 100 * 10^6 * 10^12 = 100 * 10^18
     *   sherAmount = Math.mulDiv(100 * 10^18, 5000, 10_000) = 50 * 10^18 (50 SHER)
     * 
     * - 1 billion USDC (6 decimals), 100% ratio (10000 BPS):
     *   normalizedAmount = 1_000_000_000 * 10^6 * 10^12 = 10^27
     *   sherAmount = Math.mulDiv(10^27, 10000, 10_000) = 10^27 (safe, no overflow)
     */
    function calculateCompensation(
        address tokenAddress,
        uint256 tokenAmount
    ) public view returns (uint256) {
        if (!supportedTokens[tokenAddress]) revert TokenNotSupported();
        if (tokenAmount == 0) revert ZeroAmount();

        uint8 decimals = tokenDecimals[tokenAddress];

        // Normalize to 18 decimals
        uint256 normalizedAmount = tokenAmount;
        if (decimals < 18) {
            normalizedAmount = tokenAmount * (10 ** (18 - decimals));
        }

        // Use Math.mulDiv for overflow-safe calculation
        // Math.mulDiv(x, y, denominator) = (x * y) / denominator
        return Math.mulDiv(normalizedAmount, compensationRatio, 10_000);
    }

    /*//////////////////////////////////////////////////////////////
                       TOKEN MANAGEMENT FUNCTIONS
    //////////////////////////////////////////////////////////////*/

    function addTokenSupport(address tokenAddress) external onlyOwner {
        if (tokenAddress == address(0)) revert InvalidTokenAddress();
        if (supportedTokens[tokenAddress]) revert TokenAlreadySupported();

        uint8 decimals = IERC20Metadata(tokenAddress).decimals();
        if (decimals > 18) revert InvalidTokenDecimals();

        supportedTokens[tokenAddress] = true;
        tokenDecimals[tokenAddress] = decimals;

        emit TokenSupportAdded(tokenAddress, decimals);
    }

    function removeTokenSupport(address tokenAddress) external onlyOwner {
        if (tokenAddress == address(0)) revert InvalidTokenAddress();
        if (!supportedTokens[tokenAddress]) revert TokenNotSupported();

        supportedTokens[tokenAddress] = false;
        emit TokenSupportRemoved(tokenAddress);
    }

    /*//////////////////////////////////////////////////////////////
                            ADMIN FUNCTIONS
    //////////////////////////////////////////////////////////////*/

    function setSafeAddress(address _newSafe) external onlyOwner {
        if (_newSafe == address(0)) revert InvalidSafeAddress();
        emit SafeAddressUpdated(safeAddress, _newSafe);
        safeAddress = _newSafe;
    }

    function setInvestorAddress(address _newInvestor) external onlyOwner {
        if (_newInvestor == address(0)) revert InvalidInvestorAddress();

        IInvestorV1 investor = IInvestorV1(_newInvestor);
        if (!investor.hasRole(investor.MINTER_ROLE(), address(this))) {
            revert InsufficientMinterRole();
        }

        emit InvestorAddressUpdated(investorAddress, _newInvestor);
        investorAddress = _newInvestor;
    }

    function setCompensationRatio(uint256 _newRatio) external onlyOwner {
        if (_newRatio > MAX_COMPENSATION_RATIO_BPS) revert CompensationRatioTooHigh();
        if (_newRatio < MIN_COMPENSATION_RATIO_BPS) revert CompensationRatioTooLow();

        emit CompensationRatioUpdated(compensationRatio, _newRatio);
        compensationRatio = _newRatio;
    }

    /**
     * @notice Pause all deposits (emergency stop)
     * @dev Can only be called by owner
     */
    function pause() external onlyOwner {
        _pause();
    }

    /**
     * @notice Enable deposits
     * @dev Can only be called by owner
     * @dev Must be called after deployment to enable deposits
     */
    function unpause() external onlyOwner {
        _unpause();
    }

    /**
     * @notice Rescue accidentally sent tokens
     * @param token Token address to recover
     * @param amount Amount to recover
     * 
     * @dev Only callable when paused for safety
     * @dev Recovered tokens are ALWAYS sent to the team's Safe
     * 
     * WARNING: Do NOT send tokens directly to this contract!
     * Always use the deposit() function to ensure SHER tokens are minted.
     */
    function recoverERC20(
        address token,
        uint256 amount
    ) external onlyOwner whenPaused {
        if (token == address(0)) revert InvalidTokenAddress();
        if (amount == 0) revert ZeroAmount();
        
        //  Always send to Safe (cannot extract to arbitrary address)
        IERC20(token).safeTransfer(safeAddress, amount);
        
        emit TokensRecovered(token, safeAddress, amount);
    }

    /*//////////////////////////////////////////////////////////////
                          UPGRADE STORAGE GAP
    //////////////////////////////////////////////////////////////*/

    uint256[50] private __gap;
}