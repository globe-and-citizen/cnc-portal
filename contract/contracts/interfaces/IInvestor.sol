// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/**
 * @title IInvestor
 * @notice Common interface for Investor contracts (both V1 legacy and V2 new).
 * @dev Defines methods shared between InvestorV1 and Investor (V2).
 */
interface IInvestor {
  /// @notice Grant a role to an account
  function grantRole(bytes32 role, address account) external;

  /// @notice Mint tokens for a shareholder during vesting or claim
  function individualMint(address to, uint256 amount) external;

  /// @notice Distribute native token (ETH) dividends pro-rata to all shareholders
  function distributeNativeDividends(uint256 amount) external payable;

  /// @notice Distribute ERC20 dividends pro-rata to all shareholders
  function distributeTokenDividends(address token, uint256 amount) external;

  /// @notice Return the MINTER_ROLE identifier
  function MINTER_ROLE() external view returns (bytes32);

  /// @notice Check if an account has a given role
  function hasRole(bytes32 role, address account) external view returns (bool);
}
