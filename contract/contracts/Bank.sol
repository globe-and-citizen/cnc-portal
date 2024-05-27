// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import '@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol';

interface ITips {
  function pushTip(address[] calldata _teamMembersAddresses) external payable;
  function sendTip(address[] calldata _teamMembersAddresses) external payable;
}

contract Bank is OwnableUpgradeable {
  address public tipsAddress;

  event Deposited(address indexed depositor, uint256 amount);
  event Transfer(address indexed sender, address indexed to, uint256 amount);
  event TipsAddressChanged(
    address indexed addressWhoChanged,
    address indexed oldAddress,
    address indexed newAddress
  );
  event SendTip(address indexed addressWhoSends, address[] teamMembers, uint256 totalAmount);
  event PushTip(address indexed addressWhoPushes, address[] teamMembers, uint256 totalAmount);

  function initialize(address _tipsAddress) public initializer {
    __Ownable_init(msg.sender);
    tipsAddress = _tipsAddress;
  }

  receive() external payable {
    emit Deposited(msg.sender, msg.value);
  }

  function transfer(
    address _to,
    uint256 _amount
  ) external payable onlyOwner shouldHaveEnoughFunds(_amount) {
    require(_to != address(0), 'Address cannot be zero');
    require(_amount > 0, 'Amount must be greater than zero');

    (bool sent, ) = _to.call{value: _amount}('');
    require(sent, 'Failed to transfer');

    emit Transfer(msg.sender, _to, _amount);
  }

  function changeTipsAddress(address _tipsAddress) external onlyOwner {
    require(_tipsAddress != address(0), 'Address cannot be zero');

    address oldAddress = tipsAddress;
    tipsAddress = _tipsAddress;

    emit TipsAddressChanged(msg.sender, oldAddress, _tipsAddress);
  }

  function pushTip(
    address[] calldata _addresses,
    uint256 _amount
  ) external payable onlyOwner shouldHaveEnoughFunds(_amount) {
    ITips(tipsAddress).pushTip{value: _amount}(_addresses);

    emit PushTip(msg.sender, _addresses, _amount);
  }

  function sendTip(
    address[] calldata _addresses,
    uint256 _amount
  ) external payable onlyOwner shouldHaveEnoughFunds(_amount) {
    ITips(tipsAddress).sendTip{value: _amount}(_addresses);

    emit SendTip(msg.sender, _addresses, _amount);
  }

  modifier shouldHaveEnoughFunds(uint256 _amount) {
    require(address(this).balance >= _amount, 'Insufficient funds');
    _;
  }
}
