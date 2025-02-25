// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

interface IFactoryBeacon {
    function createBeaconProxy(bytes calldata initializerData) external returns (address);
}
