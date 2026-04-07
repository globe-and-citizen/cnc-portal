// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import '@openzeppelin/contracts/proxy/beacon/BeaconProxy.sol';

/**
 * @title UserBeaconProxy
 * @notice Beacon proxy instance used by end users to interact with the current implementation.
 * @dev Thin passthrough around OpenZeppelin's BeaconProxy.
 */
contract UserBeaconProxy is BeaconProxy {
  constructor(address _beacon, bytes memory _data) BeaconProxy(_beacon, _data) {}
}
