// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

contract MockSafeProxy {
  address internal singleton;

  constructor(address _singleton) {
    require(_singleton != address(0), "Invalid singleton address provided");
    singleton = _singleton;
  }
}
