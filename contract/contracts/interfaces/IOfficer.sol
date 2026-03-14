// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/**
 * @title IOfficer
 * @notice Complete interface for Officer contract
 * @dev Single source of truth for Officer contract interactions
 * @dev Derived from: contracts/Officer.sol
 * Used by: Bank, InvestorV1, SafeDepositRouter, CashRemunerationEIP712,
 *          Proposals, Elections, Voting, and other contracts
 */

struct DeployedContract {
  string contractType;
  address contractAddress;
}

interface IOfficer {
  // ============ Contract Discovery ============
  /// @notice Find deployed contract address by type name
  /// @param contractType Name of the contract type (e.g., 'Bank', 'InvestorV1')
  /// @return Address of the deployed contract, or address(0) if not found
  function findDeployedContract(string memory contractType) external view returns (address);

  /// @notice Get all deployed contracts
  /// @return Array of DeployedContract structs with type and address
  function getDeployedContracts() external view returns (DeployedContract[] memory);

  // ============ Fee Management ============
  /// @notice Get fee in basis points for a contract type
  /// @param contractType Name of the contract type
  /// @return Fee in basis points (e.g., 100 = 1%)
  function getFeeFor(string memory contractType) external view returns (uint16);

  /// @notice Get the FeeCollector contract address
  /// @return Address of the FeeCollector contract
  function getFeeCollector() external view returns (address);

  /// @notice Check if a token is supported by the FeeCollector
  /// @param tokenAddress Address of the token to check
  /// @return True if token is supported, false otherwise
  function isFeeCollectorToken(address tokenAddress) external view returns (bool);
}
