// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

// We import these here to force Hardhat to compile them.
// This ensures that their artifacts are available for Hardhat Ignition to use.
// solhint-disable-next-line no-unused-import
import {ProxyAdmin} from "@openzeppelin/contracts/proxy/transparent/ProxyAdmin.sol";
// solhint-disable-next-line no-unused-import
import {TransparentUpgradeableProxy} from "@openzeppelin/contracts/proxy/transparent/TransparentUpgradeableProxy.sol";
