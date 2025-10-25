// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "./ICNCContract.sol";
import "./IOwnable.sol";

interface ICashRemuneration is ICNCContract, IOwnable {
    function addTokenSupport(address tokenAddress) external;
}