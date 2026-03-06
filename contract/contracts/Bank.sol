// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import '@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol';
import '@openzeppelin/contracts-upgradeable/utils/PausableUpgradeable.sol';
import '@openzeppelin/contracts-upgradeable/utils/ReentrancyGuardUpgradeable.sol';
import '@openzeppelin/contracts/token/ERC20/IERC20.sol';
import '@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol';
import './interfaces/IOfficer.sol';
import './base/TokenSupport.sol';

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

  event FeePaid(address indexed feeCollector, uint256 amount);
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

  /**
   * @notice Initializes the Bank contract with supported tokens and owner
   * @dev This function replaces the constructor for upgradeable contracts
   * @param _tokenAddresses Array of ERC20 token addresses to be supported initially
   * @param _sender Address that will become the owner of the contract
   * @custom:security Only callable once due to initializer modifier
   */
  function initialize(address[] calldata _tokenAddresses, address _sender) public initializer {
    require(_sender != address(0), 'Sender cannot be zero');
    __Ownable_init(_sender);
    __ReentrancyGuard_init();
    __Pausable_init();
    // Set the initial supported tokens
    uint256 length = _tokenAddresses.length;
    for (uint256 i = 0; i < length; ++i) {
      require(_tokenAddresses[i] != address(0), 'Token address cannot be zero');
      _addTokenSupport(_tokenAddresses[i]);
    }
    // Emit events after they're already added to avoid duplicate events
    for (uint256 i = 0; i < length; ++i) {
      emit TokenSupportAdded(_tokenAddresses[i]);
    }
    require(msg.sender != address(0), 'msg send cannot be zero');
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
   * @notice Returns the amount of ETH/native tokens available for transfers (not locked as dividends)
   * @dev Calculates unlocked balance by subtracting total dividends from contract balance
   * @return The amount of ETH/native tokens that can be transferred by the owner
   */
  function getUnlockedBalance() public view returns (uint256) {
    return address(this).balance;
  }

  /**
   * @notice Returns the amount of ERC20 tokens available for transfers
   * @dev Returns the total balance of tokens held by the contract
   * @param _token The address of the ERC20 token contract
   * @return The amount of tokens that can be transferred by the owner
   */
  function getUnlockedTokenBalance(address _token) public view returns (uint256) {
    require(_isTokenSupported(_token), 'Unsupported token');
    return IERC20(_token).balanceOf(address(this));
  }

  /**
   * @dev Modifier to ensure that only unlocked ETH balance is used for transfers
   * @param _amount The amount to be checked against unlocked balance
   * @custom:security Prevents spending of funds allocated as dividends
   */
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
    require(_isTokenSupported(_token), 'Unsupported token');
    require(_amount > 0, 'Amount must be greater than zero');

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
    require(_to != address(0), 'Address cannot be zero');
    require(_amount > 0, 'Amount must be greater than zero');

    // --- Step 1: Get fee configuration ---
    uint16 feeBps = _getFeeBps(); // e.g., 50 = 0.5%
    require(feeBps <= 10_000, 'Fee cannot exceed 100%');

    uint256 fee = 0;
    uint256 net = _amount;

    // --- Step 2: Calculate and process fee if configured ---
    if (feeBps > 0) {
      fee = (_amount * feeBps) / 10_000;
      net = _amount - fee;

      // Get fee collector address
      address feeCollector = IOfficer(officerAddress).getFeeCollector();
      require(feeCollector != address(0), 'Fee collector not configured');

      // Send fee to fee collector
      (bool sentFee, ) = feeCollector.call{value: fee}('');
      require(sentFee, 'Fee transfer failed');
      emit FeePaid(feeCollector, fee);
    }

    // --- Step 3: Send net amount to recipient ---
    (bool sentNet, ) = _to.call{value: net}('');
    require(sentNet, 'Transfer failed');

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
    require(_isTokenSupported(_token), 'Unsupported token');
    require(_to != address(0), 'Address cannot be zero');
    require(_amount > 0, 'Amount must be greater than zero');
    require(_amount <= getUnlockedTokenBalance(_token), 'Insufficient unlocked token balance');

    // Check if this is a fee-supported token (USDC or USDT)
    bool shouldChargeFee = _isSupportedFeeToken(_token);

    uint256 fee = 0;
    uint256 net = _amount;

    // Only charge fee for FeeCollector-supported tokens
    if (shouldChargeFee) {
      uint16 feeBps = _getFeeBps(); // e.g., 50 = 0.5%
      require(feeBps <= 10_000, 'Fee cannot exceed 100%');

      if (feeBps > 0) {
        fee = (_amount * feeBps) / 10_000;
        net = _amount - fee;

        // Get fee collector address
        address feeCollector = IOfficer(officerAddress).getFeeCollector();
        require(feeCollector != address(0), 'Fee collector not configured');

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
