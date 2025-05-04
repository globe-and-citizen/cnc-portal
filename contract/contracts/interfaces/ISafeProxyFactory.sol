// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {ISafeProxy} from "./ISafeProxy.sol";

interface ISafeProxyFactory {
  function createProxyWithNonceL2(address _singleton, bytes memory initializer, uint256 saltNonce) external returns (ISafeProxy proxy);
}
