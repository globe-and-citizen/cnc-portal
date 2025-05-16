// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {MockSafeProxy} from "./MockSafeProxy.sol";

contract ISafeProxyFactory {
  function createProxyWithNonceL2(address _singleton, bytes memory initializer, uint256 saltNonce) external pure returns (MockSafeProxy proxy) {
    initializer;
    saltNonce;

    return MockSafeProxy(_singleton);
  }
}
