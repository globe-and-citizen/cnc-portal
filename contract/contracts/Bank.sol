// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Ownable} from '@openzeppelin/contracts/access/Ownable.sol';
import {Tips} from './Tips.sol';

contract Bank is Ownable {
  address public tipsAddress;

  constructor(address _tipsAddress) Ownable(msg.sender) {
    tipsAddress = _tipsAddress;
  }

  function changeTipsAddress(address _tipsAddress) external onlyOwner {
    tipsAddress = _tipsAddress;
  }
}
