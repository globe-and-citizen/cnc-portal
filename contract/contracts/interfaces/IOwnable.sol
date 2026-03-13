// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/**
 * @title IOwnable
 * @dev Derived from: OpenZeppelin Ownable transferOwnership pattern.
 */
interface IOwnable {
  function transferOwnership(address newOwner) external;
}
