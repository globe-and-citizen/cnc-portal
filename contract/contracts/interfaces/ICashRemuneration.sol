// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import './IOwnable.sol';
import './IPausable.sol';
import './ITokenSupport.sol';

/**
 * @title ICashRemuneration
 * @notice Complete interface for CashRemunerationEIP712 contract
 * @dev Single source of truth for CashRemunerationEIP712 contract interactions
 * Used by: Officer
 */
interface ICashRemuneration is IOwnable, IPausable, ITokenSupport {
  // ============ Claim Management ============
  /// @notice Enable a wage claim by signature hash
  /// @param signatureHash Hash of the claim signature
  function enableClaim(bytes32 signatureHash) external;

  /// @notice Disable a wage claim by signature hash
  /// @param signatureHash Hash of the claim signature
  function disableClaim(bytes32 signatureHash) external;

  // ============ Balance Query ============
  /// @notice Get contract's ETH balance
  /// @return Balance in wei
  function getBalance() external view returns (uint256);
}
