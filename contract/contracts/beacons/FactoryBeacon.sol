// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/proxy/beacon/UpgradeableBeacon.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "./UserBeaconProxy.sol";

contract FactoryBeacon is UpgradeableBeacon {
  event BeaconProxyCreated(address indexed proxy, address indexed deployer);

  constructor(address implementation) UpgradeableBeacon(implementation, msg.sender) {}

  function createBeaconProxy(bytes memory data) external {
    UserBeaconProxy proxy = new UserBeaconProxy(address(this), data);
    emit BeaconProxyCreated(address(proxy), msg.sender);
  }
}

