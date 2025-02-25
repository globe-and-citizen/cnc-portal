// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/proxy/beacon/UpgradeableBeacon.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/proxy/beacon/BeaconProxy.sol";
import {IFactoryBeacon} from "../interfaces/IFactoryBeacon.sol";

contract FactoryBeacon is UpgradeableBeacon, IFactoryBeacon {
  event BeaconProxyCreated(address indexed proxy, address indexed deployer);

  constructor(address implementationAddress) UpgradeableBeacon(implementationAddress, msg.sender) {}

  function createBeaconProxy(bytes memory data) external returns (address) {
    BeaconProxy proxy = new BeaconProxy(address(this), data);
    emit BeaconProxyCreated(address(proxy), msg.sender);

    return address(proxy);
  }
}

