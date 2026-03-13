// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import '../beacons/UserBeaconProxy.sol';

interface IInitializableByOwner {
  function initialize(address _owner) external;
}

interface IOwnableLike {
  function transferOwnership(address newOwner) external;
}

contract MockOfficer {
  mapping(bytes32 => address) private deployedByType;

  function setDeployedContract(string calldata contractType, address contractAddress) external {
    deployedByType[keccak256(bytes(contractType))] = contractAddress;
  }

  function findDeployedContract(string memory contractType) external view returns (address) {
    return deployedByType[keccak256(bytes(contractType))];
  }

  function deployBeaconProxy(
    address beacon,
    bytes calldata initializerData,
    string calldata contractType
  ) external returns (address) {
    UserBeaconProxy proxy = new UserBeaconProxy(beacon, initializerData);
    address proxyAddress = address(proxy);
    deployedByType[keccak256(bytes(contractType))] = proxyAddress;
    return proxyAddress;
  }

  function initializeUpgradeable(address target, address owner) external {
    IInitializableByOwner(target).initialize(owner);
  }

  function transferContractOwnership(address target, address newOwner) external {
    IOwnableLike(target).transferOwnership(newOwner);
  }

  function getFeeFor(string memory) external pure returns (uint16) {
    return 0;
  }

  function getFeeCollector() external view returns (address) {
    return address(this);
  }
}
