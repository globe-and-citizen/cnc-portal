// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import '@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol';
import '@openzeppelin/contracts-upgradeable/utils/PausableUpgradeable.sol';
import '@openzeppelin/contracts-upgradeable/utils/ReentrancyGuardUpgradeable.sol';
import '@openzeppelin/contracts/token/ERC20/IERC20.sol';

interface IInvestorView {
  struct Shareholder {
    address shareholder;
    uint256 amount;
  }

  function totalSupply() external view returns (uint256);

  function getShareholders() external view returns (Shareholder[] memory);
}

contract Bank is OwnableUpgradeable, ReentrancyGuardUpgradeable, PausableUpgradeable {
  /**
   * @dev Address of the investor contract that provides shareholder information
   * Used to get the list of shareholders and their token amounts for dividend distribution
   */
  address public investorAddress;

  /**
   * @dev Mapping to track which ERC20 tokens are supported by the contract
   * token address => true if supported, false otherwise
   */
  mapping(address => bool) public supportedTokens;

  /**
   * @dev Mapping to track ETH/native token dividend balances for each account
   * account address => dividend amount available for claiming
   */
  mapping(address => uint256) public dividendBalances;

  /**
   * @dev Nested mapping to track ERC20 token dividend balances for each account
   * token address => account address => dividend amount available for claiming
   */
  mapping(address => mapping(address => uint256)) public tokenDividendBalances;

  /**
   * @dev Total amount of ETH/native tokens locked as dividends
   * This represents the total dividends allocated to shareholders but not yet claimed
   * Only spendable by investor shareholders through the claim mechanism
   */
  uint256 public totalDividend;

  /**
   * @dev Mapping to track total locked token balances for each supported token
   * token address => total amount locked as dividends for that token
   * Represents the sum of all unclaimed token dividends across all shareholders
   */
  mapping(address => uint256) public totalTokenDividends;

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
   * @dev Emitted when a token address is changed for a given symbol.
   * @param addressWhoChanged The address that initiated the change (contract owner).
   * @param tokenSymbol The symbol of the token (e.g., "USDT", "USDC").
   * @param oldAddress The previous token contract address.
   * @param newAddress The new token contract address.
   */
  event TokenAddressChanged(
    address indexed addressWhoChanged,
    string tokenSymbol,
    address indexed oldAddress,
    address indexed newAddress
  );

  /**
   * @dev Emitted when ETH/native token dividends are deposited for distribution.
   * @param account The address that deposited the dividends (contract owner).
   * @param amount The total amount of dividends deposited.
   * @param investorAddress The address of the investor contract used for shareholder allocation.
   */
  event DividendDeposited(address indexed account, uint256 amount, address indexed investorAddress);

  /**
   * @dev Emitted when ERC20 token dividends are deposited for distribution.
   * @param account The address that deposited the dividends (contract owner).
   * @param token The address of the ERC20 token contract.
   * @param amount The total amount of token dividends deposited.
   * @param investorAddress The address of the investor contract used for shareholder allocation.
   */
  event TokenDividendDeposited(
    address indexed account,
    address indexed token,
    uint256 amount,
    address indexed investorAddress
  );

  /**
   * @dev Emitted when ETH/native token dividends are credited to a shareholder's account.
   * @param account The shareholder address that received the dividend credit.
   * @param amount The amount of dividends credited to the account.
   */
  event DividendCredited(address indexed account, uint256 amount);

  /**
   * @dev Emitted when ERC20 token dividends are credited to a shareholder's account.
   * @param account The shareholder address that received the dividend credit.
   * @param token The address of the ERC20 token contract.
   * @param amount The amount of token dividends credited to the account.
   */
  event TokenDividendCredited(address indexed account, address indexed token, uint256 amount);

  /**
   * @dev Emitted when a shareholder claims their ETH/native token dividends.
   * @param account The shareholder address that claimed the dividends.
   * @param amount The amount of dividends claimed.
   */
  event DividendClaimed(address indexed account, uint256 amount);

  /**
   * @dev Emitted when a shareholder claims their ERC20 token dividends.
   * @param account The shareholder address that claimed the dividends.
   * @param token The address of the ERC20 token contract.
   * @param amount The amount of token dividends claimed.
   */
  event TokenDividendClaimed(address indexed account, address indexed token, uint256 amount);

  /**
   * @dev Emitted when a new token is added to the supported tokens list.
   * @param tokenAddress The address of the token contract.
   */
  event TokenSupportAdded(address indexed tokenAddress);

  /**
   * @dev Emitted when a token is removed from the supported tokens list.
   * @param tokenAddress The address of the token contract.
   */
  event TokenSupportRemoved(address indexed tokenAddress);

  /**
   * @notice Initializes the Bank contract with supported tokens and owner
   * @dev This function replaces the constructor for upgradeable contracts
   * @param _tokenAddresses Array of ERC20 token addresses to be supported initially
   * @param _sender Address that will become the owner of the contract
   * @custom:security Only callable once due to initializer modifier
   */
  function initialize(address[] calldata _tokenAddresses, address _sender) public initializer {
    __Ownable_init(_sender);
    __ReentrancyGuard_init();
    __Pausable_init();
    // Set the initial supported tokens
    for (uint256 i = 0; i < _tokenAddresses.length; i++) {
      require(_tokenAddresses[i] != address(0), 'Token address cannot be zero');
      supportedTokens[_tokenAddresses[i]] = true;
    }
  }

  /**
   * @notice Adds a supported token to the contract.
   * @param _tokenAddress The address of the token contract.
   * @dev Can only be called by the contract owner.
   */
  function addTokenSupport(address _tokenAddress) external onlyOwner {
    require(_tokenAddress != address(0), 'Token address cannot be zero');
    require(!supportedTokens[_tokenAddress], 'Token already supported');

    supportedTokens[_tokenAddress] = true;
    emit TokenSupportAdded(_tokenAddress);
  }

  /**
   * @notice Removes a supported token from the contract.
   * @param _tokenAddress The address of the token contract.
   * @dev Can only be called by the contract owner.
   */
  function removeTokenSupport(address _tokenAddress) external onlyOwner {
    require(_tokenAddress != address(0), 'Token address cannot be zero');
    require(supportedTokens[_tokenAddress], 'Token not supported');

    supportedTokens[_tokenAddress] = false;
    emit TokenSupportRemoved(_tokenAddress);
  }

  /**
   * @notice Returns the amount of ETH/native tokens available for transfers (not locked as dividends)
   * @dev Calculates unlocked balance by subtracting total dividends from contract balance
   * @return The amount of ETH/native tokens that can be transferred by the owner
   */
  function getUnlockedBalance() public view returns (uint256) {
    uint256 bal = address(this).balance;
    return bal > totalDividend ? bal - totalDividend : 0;
  }

  /**
   * @notice Returns the amount of ERC20 tokens available for transfers (not locked as dividends)
   * @dev Calculates unlocked token balance by subtracting total token dividends from contract balance
   * @param _token The address of the ERC20 token contract
   * @return The amount of tokens that can be transferred by the owner
   */
  function getUnlockedTokenBalance(address _token) public view returns (uint256) {
    require(supportedTokens[_token], 'Unsupported token');
    uint256 bal = IERC20(_token).balanceOf(address(this));
    uint256 locked = totalTokenDividends[_token];
    return bal > locked ? bal - locked : 0;
  }

  /**
   * @notice Returns the dividend balance for a specific account and token
   * @dev Public view function to check how much token dividends an account can claim
   * @param _token The address of the ERC20 token contract
   * @param _account The address of the account to check
   * @return The amount of token dividends available for claiming
   */
  function getTokenDividendBalance(address _token, address _account) public view returns (uint256) {
    return tokenDividendBalances[_token][_account];
  }

  /**
   * @dev Modifier to ensure that only unlocked ETH balance is used for transfers
   * @param _amount The amount to be checked against unlocked balance
   * @custom:security Prevents spending of funds allocated as dividends
   */
  modifier UsesUnlockedBalance(uint256 _amount) {
    require(_amount <= getUnlockedBalance(), 'insufficient unlocked ');
    _;
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
    require(supportedTokens[_token], 'Unsupported token');
    require(_amount > 0, 'Amount must be greater than zero');

    IERC20(_token).transferFrom(msg.sender, address(this), _amount);
    emit TokenDeposited(msg.sender, _token, _amount);
  }

  /**
   * @notice Transfers ETH/native tokens from the contract to a specified address
   * @dev Only owner can call this function and only unlocked balance can be transferred
   * @param _to The recipient address
   * @param _amount The amount of ETH/native tokens to transfer
   * @custom:security Uses UsesUnlockedBalance modifier to prevent spending dividend funds
   */
  function transfer(
    address _to,
    uint256 _amount
  ) external onlyOwner nonReentrant whenNotPaused UsesUnlockedBalance(_amount) {
    require(_to != address(0), 'Address cannot be zero');
    require(_amount > 0, 'Amount must be greater than zero');

    (bool sent, ) = _to.call{value: _amount}('');
    require(sent, 'Failed to transfer');

    emit Transfer(msg.sender, _to, _amount);
  }

  /**
   * @notice Transfers ERC20 tokens from the contract to a specified address
   * @dev Only owner can call this function. Uses unlocked token balance for transfers
   * @param _token The address of the ERC20 token contract
   * @param _to The recipient address
   * @param _amount The amount of tokens to transfer
   * @custom:security Protected against reentrancy and requires contract to be unpaused
   */
  function transferToken(
    address _token,
    address _to,
    uint256 _amount
  ) external onlyOwner nonReentrant whenNotPaused {
    require(supportedTokens[_token], 'Unsupported token');
    require(_to != address(0), 'Address cannot be zero');
    require(_amount > 0, 'Amount must be greater than zero');

    IERC20(_token).transfer(_to, _amount);
    emit TokenTransfer(msg.sender, _to, _token, _amount);
  }

  /**
   * @notice Sets the investor contract address used for dividend distribution
   * @dev Only owner can call this function to update the investor contract reference
   * @param _investorAddress The address of the investor contract implementing IInvestorView
   * @custom:security Requires contract to be unpaused and validates non-zero address
   */
  function setInvestorAddress(address _investorAddress) external onlyOwner whenNotPaused {
    require(_investorAddress != address(0), 'Address cannot be zero');
    investorAddress = _investorAddress;
  }

  /**
   * @notice Deposits ETH/native token dividends and allocates them to shareholders
   * @dev Allocates dividends proportionally based on shareholdings from investor contract
   * @param amount The amount of ETH/native tokens to allocate as dividends
   * @param _investorAddress The address of the investor contract to get shareholder data
   * @custom:security Only owner can call, uses unlocked balance, protected against reentrancy
   */
  function depositDividends(
    uint256 amount,
    address _investorAddress
  ) external payable onlyOwner whenNotPaused nonReentrant UsesUnlockedBalance(amount) {
    require(amount <= (address(this).balance - totalDividend), 'insufficient balance in the bank');
    require(_investorAddress != address(0), 'investor address invalid');

    allocateDividends(amount, _investorAddress);
    emit DividendDeposited(msg.sender, amount, _investorAddress);
  }

  /**
   * @notice Deposits ERC20 token dividends and allocates them to shareholders
   * @dev Allocates token dividends proportionally based on shareholdings from investor contract
   * @param _token The address of the ERC20 token contract
   * @param amount The amount of tokens to allocate as dividends
   * @param _investorAddress The address of the investor contract to get shareholder data
   * @custom:security Only owner can call, validates token support, protected against reentrancy
   */
  function depositTokenDividends(
    address _token,
    uint256 amount,
    address _investorAddress
  ) external onlyOwner whenNotPaused nonReentrant {
    require(supportedTokens[_token], 'Unsupported token');
    require(amount > 0, 'Amount must be greater than zero');
    require(_investorAddress != address(0), 'investor address invalid');

    // Check if contract has enough token balance
    uint256 contractBalance = IERC20(_token).balanceOf(address(this));
    uint256 lockedBalance = totalTokenDividends[_token];
    require(amount <= (contractBalance - lockedBalance), 'insufficient token balance in the bank');

    allocateTokenDividends(_token, amount, _investorAddress);
    emit TokenDividendDeposited(msg.sender, _token, amount, _investorAddress);
  }

  /**
   * @dev Internal function to allocate ETH/native token dividends to shareholders
   * @param amount The total amount of dividends to allocate
   * @param _investorAddress The investor contract address to get shareholder information
   * @custom:logic Uses proportional allocation based on shareholder token amounts
   * @custom:precision Handles rounding by giving remainder to last shareholder
   */
  function allocateDividends(uint256 amount, address _investorAddress) internal whenNotPaused {
    IInvestorView inv = IInvestorView(_investorAddress);
    IInvestorView.Shareholder[] memory holders = inv.getShareholders();
    uint256 supply = inv.totalSupply();

    require(supply > 0, 'Splitter: zero supply');
    require(holders.length > 0, 'Splitter: no holders');

    uint256 remaining = amount;
    uint256 n = holders.length;

    for (uint256 i = 0; i < n; i++) {
      address acct = holders[i].shareholder;
      uint256 bal = holders[i].amount;

      uint256 part = (amount * bal) / supply;
      if (i == n - 1) {
        part = remaining; // ensure exact sum
      } else if (part > remaining) {
        part = remaining; // defensive clamp
      }

      if (part > 0) {
        dividendBalances[acct] += part;
        totalDividend += part;
        remaining -= part;
        emit DividendCredited(acct, part);
      }
    }
  }

  /**
   * @dev Internal function to allocate ERC20 token dividends to shareholders
   * @param _token The address of the ERC20 token contract
   * @param amount The total amount of token dividends to allocate
   * @param _investorAddress The investor contract address to get shareholder information
   * @custom:logic Uses proportional allocation based on shareholder token amounts
   * @custom:precision Handles rounding by giving remainder to last shareholder
   */
  function allocateTokenDividends(
    address _token,
    uint256 amount,
    address _investorAddress
  ) internal whenNotPaused {
    IInvestorView inv = IInvestorView(_investorAddress);
    IInvestorView.Shareholder[] memory holders = inv.getShareholders();
    uint256 supply = inv.totalSupply();

    require(supply > 0, 'Splitter: zero supply');
    require(holders.length > 0, 'Splitter: no holders');

    uint256 remaining = amount;
    uint256 n = holders.length;

    for (uint256 i = 0; i < n; i++) {
      address acct = holders[i].shareholder;
      uint256 bal = holders[i].amount;

      uint256 part = (amount * bal) / supply;
      if (i == n - 1) {
        part = remaining; // ensure exact sum
      } else if (part > remaining) {
        part = remaining; // defensive clamp
      }

      if (part > 0) {
        tokenDividendBalances[_token][acct] += part;
        totalTokenDividends[_token] += part;
        remaining -= part;
        emit TokenDividendCredited(acct, _token, part);
      }
    }
  }

  /**
   * @notice Allows shareholders to claim their allocated ETH/native token dividends
   * @dev Single entrypoint for dividend claiming - no owner-initiated release
   * @custom:security Follows checks-effects-interactions pattern to prevent reentrancy
   * @custom:access Any shareholder with allocated dividends can call this function
   */
  function claimDividend() external whenNotPaused nonReentrant {
    uint256 amt = dividendBalances[msg.sender];
    require(amt > 0, ' nothing to release');
    require(totalDividend >= amt, 'Invariant: totalDividend too low');
    // effects
    dividendBalances[msg.sender] = 0;
    totalDividend -= amt;

    // interaction
    (bool sent, ) = payable(msg.sender).call{value: amt}('');
    require(sent, 'Failed to send dividend');
    emit DividendClaimed(msg.sender, amt);
  }

  /**
   * @notice Allows shareholders to claim their allocated ERC20 token dividends
   * @dev Single entrypoint for token dividend claiming - no owner-initiated release
   * @param _token The address of the ERC20 token contract to claim dividends for
   * @custom:security Follows checks-effects-interactions pattern to prevent reentrancy
   * @custom:access Any shareholder with allocated token dividends can call this function
   */
  function claimTokenDividend(address _token) external whenNotPaused nonReentrant {
    require(supportedTokens[_token], 'Unsupported token');
    uint256 amt = tokenDividendBalances[_token][msg.sender];
    require(amt > 0, 'nothing to release');
    require(totalTokenDividends[_token] >= amt, 'Invariant: totalTokenDividends too low');

    // effects
    tokenDividendBalances[_token][msg.sender] = 0;
    totalTokenDividends[_token] -= amt;

    // interaction
    require(IERC20(_token).transfer(msg.sender, amt), 'Token transfer failed');
    emit TokenDividendClaimed(msg.sender, _token, amt);
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
