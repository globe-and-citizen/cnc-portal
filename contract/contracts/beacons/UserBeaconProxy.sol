// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {BeaconProxy} from "@openzeppelin/contracts/proxy/beacon/BeaconProxy.sol";

/**
 * @title UserBeaconProxy
 * @notice Beacon proxy instance used by end users to interact with the current implementation.
 * @dev Thin passthrough around OpenZeppelin's BeaconProxy.
 */
contract UserBeaconProxy is BeaconProxy {
  constructor(address beacon, bytes memory data) BeaconProxy(beacon, data) {}
}
