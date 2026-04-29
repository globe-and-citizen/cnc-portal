// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import '@openzeppelin/contracts/proxy/beacon/UpgradeableBeacon.sol';
import '@openzeppelin/contracts/access/Ownable.sol';
import './UserBeaconProxy.sol';

/**
 * @title FactoryBeacon
 * @notice Beacon that can deploy fresh UserBeaconProxy instances pointing at itself.
 * @dev Combines UpgradeableBeacon with a proxy-deployment helper so callers can spin
 *      up new proxies in one transaction.
 */
contract FactoryBeacon is UpgradeableBeacon {
  /**
   * @notice Emitted when a new beacon proxy is deployed via this factory.
   * @param proxy The address of the newly created proxy.
   * @param deployer The caller that requested the proxy deployment.
   */
  event BeaconProxyCreated(address indexed proxy, address indexed deployer);

  constructor(address implementationAddress) UpgradeableBeacon(implementationAddress, msg.sender) {}

  /**
   * @notice Deploys a new UserBeaconProxy pointing at this beacon.
   * @param data Initialization calldata forwarded to the proxy constructor.
   */
  function createBeaconProxy(bytes memory data) external {
    UserBeaconProxy proxy = new UserBeaconProxy(address(this), data);
    emit BeaconProxyCreated(address(proxy), msg.sender);
  }
}
