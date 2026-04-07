// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import '@openzeppelin/contracts/proxy/beacon/UpgradeableBeacon.sol';
import '@openzeppelin/contracts/access/Ownable.sol';

/**
 * @title Beacon
 * @notice Minimal upgradeable beacon that points proxies at a shared implementation.
 * @dev Thin wrapper around OpenZeppelin's UpgradeableBeacon that sets the deployer as owner.
 */
contract Beacon is UpgradeableBeacon {
  constructor(address implementation) UpgradeableBeacon(implementation, msg.sender) {}
}
