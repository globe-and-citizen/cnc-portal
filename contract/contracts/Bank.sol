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

  function getUnlockedBalance() public view returns (uint256) {
    uint256 bal = address(this).balance;
    return bal > totalDividend ? bal - totalDividend : 0;
  }

  function getUnlockedTokenBalance(address _token) public view returns (uint256) {
    require(supportedTokens[_token], 'Unsupported token');
    uint256 bal = IERC20(_token).balanceOf(address(this));
    uint256 locked = totalTokenDividends[_token];
    return bal > locked ? bal - locked : 0;
  }

  function getTokenDividendBalance(address _token, address _account) public view returns (uint256) {
    return tokenDividendBalances[_token][_account];
  }

  modifier UsesUnlockedBalance(uint256 _amount) {
    require(_amount <= getUnlockedBalance(), 'insufficient unlocked ');
    _;
  }

  receive() external payable {
    emit Deposited(msg.sender, msg.value);
  }

  function depositToken(address _token, uint256 _amount) external nonReentrant whenNotPaused {
    require(supportedTokens[_token], 'Unsupported token');
    require(_amount > 0, 'Amount must be greater than zero');

    IERC20(_token).transferFrom(msg.sender, address(this), _amount);
    emit TokenDeposited(msg.sender, _token, _amount);
  }

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

  function setInvestorAddress(address _investorAddress) external onlyOwner whenNotPaused {
    require(_investorAddress != address(0), 'Address cannot be zero');
    investorAddress = _investorAddress;
  }

  // function changeTipsAddress(address _tipsAddress) external onlyOwner whenNotPaused {
  //   require(_tipsAddress != address(0), 'Address cannot be zero');

  //   address oldAddress = tipsAddress;
  //   tipsAddress = _tipsAddress;

  //   emit TipsAddressChanged(msg.sender, oldAddress, _tipsAddress);
  // }

  function changeTokenAddress(
    string calldata _symbol,
    address _newAddress
  ) external onlyOwner whenNotPaused {
    require(_newAddress != address(0), 'Address cannot be zero');
    require(
      keccak256(abi.encodePacked(_symbol)) == keccak256(abi.encodePacked('USDT')) ||
        keccak256(abi.encodePacked(_symbol)) == keccak256(abi.encodePacked('USDC')),
      'Invalid token symbol'
    );

    address oldAddress = supportedTokens[_symbol];
    supportedTokens[_symbol] = _newAddress;
    emit TokenAddressChanged(msg.sender, _symbol, oldAddress, _newAddress);
  }

  function depositDividends(
    uint256 amount,
    address _investorAddress
  ) external payable onlyOwner whenNotPaused nonReentrant UsesUnlockedBalance(amount) {
    require(amount <= (address(this).balance - totalDividend), 'insufficient balance in the bank');
    require(_investorAddress != address(0), 'investor address invalid');

    allocateDividends(amount, _investorAddress);
    emit DividendDeposited(msg.sender, amount, _investorAddress);
  }

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

  // Single entrypoint; no owner-initiated release
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

  function pause() external onlyOwner {
    _pause();
  }

  function unpause() external onlyOwner {
    _unpause();
  }
}
