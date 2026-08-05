// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {UserBeaconProxy} from "../beacons/UserBeaconProxy.sol";

interface IInitializableByOwner {
  function initialize(address owner) external;
}

interface IOwnableLike {
  function transferOwnership(address newOwner) external;
}

contract MockOfficer {
  mapping(bytes32 contractTypeHash => address contractAddress) private s_deployedByType;

  function setDeployedContract(string calldata contractType, address contractAddress) external {
    s_deployedByType[keccak256(bytes(contractType))] = contractAddress;
  }

  function deployBeaconProxy(
    address beacon,
    bytes calldata initializerData,
    string calldata contractType
  ) external returns (address) {
    UserBeaconProxy proxy = new UserBeaconProxy(beacon, initializerData);
    address proxyAddress = address(proxy);
    s_deployedByType[keccak256(bytes(contractType))] = proxyAddress;
    return proxyAddress;
  }

  function initializeUpgradeable(address target, address owner) external {
    IInitializableByOwner(target).initialize(owner);
  }

  function transferContractOwnership(address target, address newOwner) external {
    IOwnableLike(target).transferOwnership(newOwner);
  }

  function findDeployedContract(string memory contractType) external view returns (address) {
    return s_deployedByType[keccak256(bytes(contractType))];
  }

  function getDeployedByType(bytes32 contractTypeHash) external view returns (address) {
    return s_deployedByType[contractTypeHash];
  }

  function getFeeCollector() external view returns (address) {
    return address(this);
  }

  function getFeeFor(string memory) external pure returns (uint16) {
    return 0;
  }
}
