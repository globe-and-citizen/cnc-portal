// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import '@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol';
import '@openzeppelin/contracts-upgradeable/utils/PausableUpgradeable.sol';
import '@openzeppelin/contracts-upgradeable/utils/ReentrancyGuardUpgradeable.sol';
import '@openzeppelin/contracts/token/ERC20/IERC20.sol';


interface ITips {
  function pushTip(address[] calldata _teamMembersAddresses) external payable;
  function sendTip(address[] calldata _teamMembersAddresses) external payable;
}

interface IInvestorView {
    struct Shareholder { address shareholder; uint256 amount; }
    function totalSupply() external view returns (uint256);
    function getShareholders() external view returns (Shareholder[] memory);
}

contract Bank is OwnableUpgradeable, ReentrancyGuardUpgradeable, PausableUpgradeable {
  
  address public tipsAddress;
  mapping(string => address) public supportedTokens;
  mapping(address => uint256) public dividendBalances; // dividend balance per account
  uint256 public totalDividend; //locked balance only spendable by investors shareholders

  event Deposited(address indexed depositor, uint256 amount);
  event TokenDeposited(address indexed depositor, address indexed token, uint256 amount);
  event Transfer(address indexed sender, address indexed to, uint256 amount);
  event TokenTransfer(address indexed sender, address indexed to, address indexed token, uint256 amount);
  event TipsAddressChanged(
    address indexed addressWhoChanged,
    address indexed oldAddress,
    address indexed newAddress
  );
  event TokenAddressChanged(
    address indexed addressWhoChanged,
    string tokenSymbol,
    address indexed oldAddress,
    address indexed newAddress
  );
  event SendTip(address indexed addressWhoSends, address[] teamMembers, uint256 totalAmount);
  event PushTip(address indexed addressWhoPushes, address[] teamMembers, uint256 totalAmount);
  event SendTokenTip(address indexed addressWhoSends, address[] teamMembers, address indexed token, uint256 totalAmount);
  event PushTokenTip(address indexed addressWhoPushes, address[] teamMembers, address indexed token, uint256 totalAmount);
  event DividendDeposited( address indexed account, uint256 amount, address indexed investorAddress);
  event DividendCredited(address indexed account, uint256 amount);
  event DividendClaimed(address indexed account, uint256 amount);


  function initialize(
    address _tipsAddress,
    address _usdtAddress,
    address _usdcAddress,
    address _sender
  ) public initializer {

    __Ownable_init(_sender);
    __ReentrancyGuard_init();
    __Pausable_init();
    tipsAddress = _tipsAddress;
    supportedTokens["USDT"] = _usdtAddress;
    supportedTokens["USDC"] = _usdcAddress;
  }

  function unlockBalance() public view returns (uint256) {
    uint256 bal = address(this).balance;
    return bal > totalDividend ? bal - totalDividend : 0;
  }

  modifier UsesUnlockedBalance(uint256 amount) {
    require(amount <= unlockBalance(), "insufficient unlocked ");
    _;
  }

  function isTokenSupported(address _token) public view returns (bool) {
    return _token == supportedTokens["USDT"] || _token == supportedTokens["USDC"];
  }

  receive() external payable {
    emit Deposited(msg.sender, msg.value);
  }

  function depositToken(address _token, uint256 _amount) external nonReentrant whenNotPaused {
    require(isTokenSupported(_token), "Unsupported token");
    require(_amount > 0, "Amount must be greater than zero");
    
    IERC20(_token).transferFrom(msg.sender, address(this), _amount);
    emit TokenDeposited(msg.sender, _token, _amount);
  }

  function transfer(
    address _to,
    uint256 _amount
  ) external onlyOwner nonReentrant whenNotPaused  UsesUnlockedBalance(_amount){
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
    require(isTokenSupported(_token), "Unsupported token");
    require(_to != address(0), 'Address cannot be zero');
    require(_amount > 0, 'Amount must be greater than zero');

    IERC20(_token).transfer(_to, _amount);
    emit TokenTransfer(msg.sender, _to, _token, _amount);
  }

  function changeTipsAddress(address _tipsAddress) external onlyOwner whenNotPaused {
    require(_tipsAddress != address(0), 'Address cannot be zero');

    address oldAddress = tipsAddress;
    tipsAddress = _tipsAddress;

    emit TipsAddressChanged(msg.sender, oldAddress, _tipsAddress);
  }

  function changeTokenAddress(string calldata _symbol, address _newAddress) external onlyOwner whenNotPaused {
    require(_newAddress != address(0), 'Address cannot be zero');
    require(keccak256(abi.encodePacked(_symbol)) == keccak256(abi.encodePacked("USDT")) || 
            keccak256(abi.encodePacked(_symbol)) == keccak256(abi.encodePacked("USDC")), 
            "Invalid token symbol");
    
    address oldAddress = supportedTokens[_symbol];
    supportedTokens[_symbol] = _newAddress;
    emit TokenAddressChanged(msg.sender, _symbol, oldAddress, _newAddress);
  }

  function pushTip (
    address[] calldata _addresses,
    uint256 _amount
  ) external payable onlyOwner whenNotPaused {
    ITips(tipsAddress).pushTip{value: _amount}(_addresses);
    emit PushTip(msg.sender, _addresses, _amount);
  }

  function pushTokenTip(
    address[] calldata _addresses,
    address _token,
    uint256 _amount
  ) external onlyOwner whenNotPaused  {
    require(isTokenSupported(_token), "Unsupported token");
    uint256 amountPerAddress = _amount / _addresses.length;
        
    require(IERC20(_token).transferFrom(msg.sender, address(this), _amount), "Token transfer failed");
        
    for (uint256 i = 0; i < _addresses.length; i++) {
       require(_addresses[i] != address(0), "Invalid address");
       require(IERC20(_token).transfer(_addresses[i], amountPerAddress), "Token transfer failed");
    }

    emit PushTokenTip(msg.sender, _addresses, _token, _amount);
  }
  

  function sendTip(
    address[] calldata _addresses,
    uint256 _amount
  ) external payable onlyOwner whenNotPaused {
    ITips(tipsAddress).sendTip{value: _amount}(_addresses);
    emit SendTip(msg.sender, _addresses, _amount);
  }

  function sendTokenTip(
    address[] calldata _addresses,
    address _token,
    uint256 _amount
  ) external onlyOwner whenNotPaused {
    require(isTokenSupported(_token), "Unsupported token");
    for (uint256 i = 0; i < _addresses.length; i++) {
      require(_addresses[i] != address(0), "Invalid address");
      require(IERC20(_token).transfer(_addresses[i], _amount), "Token transfer failed");
    }
    emit SendTokenTip(msg.sender, _addresses, _token, _amount);
  }
  

  function depositDividends(uint256 amount, address _investorAddress) external payable onlyOwner whenNotPaused nonReentrant UsesUnlockedBalance(amount) {
    require(amount <= (address(this).balance-totalDividend), "insufficient balance in the bank");
    require(_investorAddress != address(0), "investor address invalid");
    
    allocateDividends(amount, _investorAddress);
    emit DividendDeposited(msg.sender, amount, _investorAddress);
  }

  function allocateDividends( uint256 amount, address _investorAddress ) internal whenNotPaused {
        IInvestorView inv = IInvestorView(_investorAddress);
        IInvestorView.Shareholder[] memory holders = inv.getShareholders();
        uint256 supply = inv.totalSupply();

        require(supply > 0, "Splitter: zero supply");
        require(holders.length > 0, "Splitter: no holders");

        uint256 remaining = amount;
        uint256 n = holders.length;

        for (uint256 i = 0; i < n; i++) {
            address acct = holders[i].shareholder;
            uint256 bal  = holders[i].amount;

            uint256 part = (amount * bal) / supply;
            if (i == n - 1) {
                part = remaining;              // ensure exact sum
            } else if (part > remaining) {
                part = remaining;              // defensive clamp
            }

            if (part > 0) {
                dividendBalances[acct] += part;
                totalDividend += part;
                remaining -= part;
                emit DividendCredited(acct, part);
            }
        }
  }

  // Single entrypoint; no owner-initiated release
  function claimDividend() external whenNotPaused nonReentrant {
      uint256 amt = dividendBalances[msg.sender];
      require(amt > 0, " nothing to release");
      require(totalDividend >= amt, "Invariant: totalDividend too low");
      // effects
      dividendBalances[msg.sender] = 0;
      totalDividend -= amt;

      // interaction
      (bool sent, ) = payable(msg.sender).call{value: amt}("");
      require(sent, "Failed to send dividend");
      emit DividendClaimed(msg.sender, amt);
  }

  function pause() external onlyOwner {
    _pause();
  }

  function unpause() external onlyOwner {
    _unpause();
  }
}
