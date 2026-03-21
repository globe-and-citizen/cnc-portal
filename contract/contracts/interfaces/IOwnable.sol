// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/**
 * @title IOwnable
 * @dev Derived from: OpenZeppelin Ownable transferOwnership pattern.
 * @dev Used via interface inheritance (e.g. IBank, ICashRemuneration, IInvestorV1);
 *      not directly imported by contracts.
 */
interface IOwnable {
  function transferOwnership(address newOwner) external;
}
