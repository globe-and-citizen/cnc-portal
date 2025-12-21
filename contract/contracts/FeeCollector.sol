// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/ReentrancyGuardUpgradeable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

/**
 * @title FeeCollector
 * @notice Global vault for native tokens and ERC20 tokens + immutable per-contract-type fee configuration.
 *         Upgradeable and protected with reentrancy guard.
 */
contract FeeCollector is 
    Initializable, 
    OwnableUpgradeable, 
    ReentrancyGuardUpgradeable 
{
    using SafeERC20 for IERC20;

    struct FeeConfig {
        string contractType;  // e.g. "BANK"
        uint16 feeBps;        // e.g. 50 = 0.5%
    }

    FeeConfig[] private feeConfigs;
    
    /// @notice Mapping to track which ERC20 tokens are supported
    mapping(address => bool) public supportedTokens;

    /// @notice Emitted when a new token is added to the supported tokens list
    event TokenSupportAdded(address indexed tokenAddress);

    /// @notice Emitted when a token is removed from the supported tokens list
    event TokenSupportRemoved(address indexed tokenAddress);

    /// @notice Emitted when ERC20 tokens are withdrawn
    event TokenWithdrawn(address indexed owner, address indexed token, uint256 amount);

    event FeeConfigUpdated(string indexed contractType, uint16 feeBps);

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
        require(_owner != address(0), "Owner is zero");

        __Ownable_init(_owner);
        __ReentrancyGuard_init();

        // Store fee configs
        for (uint256 i = 0; i < _configs.length; i++) {
            require(bytes(_configs[i].contractType).length > 0, "Empty type");
            require(_configs[i].feeBps <= 10000, "Invalid BPS");

            // No duplicates allowed
            for (uint256 j = 0; j < i; j++) {
                require(
                    keccak256(bytes(feeConfigs[j].contractType)) 
                        != keccak256(bytes(_configs[i].contractType)),
                    "Duplicate contractType"
                );
            }

            feeConfigs.push(FeeConfig({
                contractType: _configs[i].contractType,
                feeBps: _configs[i].feeBps
            }));
        }

        // Set the initial supported tokens (same pattern as Bank contract)
        for (uint256 i = 0; i < _tokenAddresses.length; i++) {
            require(_tokenAddresses[i] != address(0), "Token address cannot be zero");
            supportedTokens[_tokenAddresses[i]] = true;
        }
    }

    /**
     * @notice Adds a supported token to the contract
     * @param _tokenAddress The address of the token contract
     * @dev Can only be called by the contract owner
     */
    function addTokenSupport(address _tokenAddress) external onlyOwner {
        require(_tokenAddress != address(0), "Token address cannot be zero");
        require(!supportedTokens[_tokenAddress], "Token already supported");

        supportedTokens[_tokenAddress] = true;
        emit TokenSupportAdded(_tokenAddress);
    }

    /**
     * @notice Removes a supported token from the contract
     * @param _tokenAddress The address of the token to remove
     * @dev Can only be called by the contract owner
     */
    function removeTokenSupport(address _tokenAddress) external onlyOwner {
        require(_tokenAddress != address(0), "Token address cannot be zero");
        require(supportedTokens[_tokenAddress], "Token not supported");

        supportedTokens[_tokenAddress] = false;
        emit TokenSupportRemoved(_tokenAddress);
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
    function withdraw(uint256 amount) 
        external 
        onlyOwner 
        nonReentrant 
    {
        require(address(this).balance >= amount, "Insufficient balance");

        (bool sent, ) = owner().call{value: amount}("");
        require(sent, "Withdrawal failed");
    }

    /**
     * @notice Withdraw ERC20 tokens to owner
     * @param _token The address of the token to withdraw
     * @param _amount The amount of tokens to withdraw
     * @dev Protected by nonReentrant and only owner can call
     */
    function withdrawToken(address _token, uint256 _amount) 
        external 
        onlyOwner 
        nonReentrant 
    {
        require(supportedTokens[_token], "Token not supported");
        require(_amount > 0, "Amount must be greater than zero");
        
        uint256 contractBalance = IERC20(_token).balanceOf(address(this));
        require(contractBalance >= _amount, "Insufficient token balance");

        IERC20(_token).safeTransfer(owner(), _amount);
        emit TokenWithdrawn(owner(), _token, _amount);
    }

    /**
     * @notice Get the fee in basis points for a specific contract type
     * @param contractType The type of contract (e.g., "BANK")
     * @return The fee in basis points (e.g., 50 = 0.5%)
     */
    function getFeeFor(string memory contractType)
    public
    view
    returns (uint16)
    {
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
        require(supportedTokens[_token], "Token not supported");
        return IERC20(_token).balanceOf(address(this));
    }


    /**
     * @notice Add or update a single fee configuration
     */
    function setFee(string memory contractType, uint16 feeBps)
    external
    onlyOwner
    {
        require(bytes(contractType).length > 0, "Empty type");
        require(feeBps <= 10000, "Invalid BPS");

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
