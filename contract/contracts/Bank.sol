// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Ownable} from '@openzeppelin/contracts/access/Ownable.sol';

contract Bank is Ownable {
  address public tipsAddress;

  event TipsAddressChanged(address oldAddress, address newAddress);

  constructor(address _tipsAddress) Ownable(msg.sender) {
    tipsAddress = _tipsAddress;
  }

  function changeTipsAddress(address _tipsAddress) external onlyOwner {
    require(_tipsAddress != address(0), "Address cannot be zero");

    address oldAddress = tipsAddress;
    tipsAddress = _tipsAddress;
    emit TipsAddressChanged(oldAddress, _tipsAddress);
  }
}
