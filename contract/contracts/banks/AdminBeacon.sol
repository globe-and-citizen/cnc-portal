// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/proxy/beacon/UpgradeableBeacon.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract AdminBeacon is UpgradeableBeacon {
  constructor(address implementation) UpgradeableBeacon(implementation, msg.sender) {}
}