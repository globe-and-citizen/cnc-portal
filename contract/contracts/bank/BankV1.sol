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

contract Bank is OwnableUpgradeable, ReentrancyGuardUpgradeable, PausableUpgradeable {
  address public tipsAddress;
  mapping(string => address) public supportedTokens;

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
  ) external payable onlyOwner nonReentrant whenNotPaused {
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

  function pushTip(
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
  ) external onlyOwner whenNotPaused {
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

  function pause() external onlyOwner {
    _pause();
  }

  function unpause() external onlyOwner {
    _unpause();
  }
}
