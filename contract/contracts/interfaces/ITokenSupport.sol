// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/**
 * @title ITokenSupport
 * @notice Standard interface for contracts that support multiple ERC20 tokens
 * @dev Provides a consistent pattern for token management across the platform
 */
interface ITokenSupport {
  // ============ Events ============
  /// @notice Emitted when a new token is added to supported tokens
  event TokenSupportAdded(address indexed tokenAddress);

  /// @notice Emitted when a token is removed from supported tokens
  event TokenSupportRemoved(address indexed tokenAddress);

  // ============ Token Management ============
  /// @notice Add support for an ERC20 token
  /// @param tokenAddress Address of the token to support
  function addTokenSupport(address tokenAddress) external;

  /// @notice Remove support for an ERC20 token
  /// @param tokenAddress Address of the token to remove
  function removeTokenSupport(address tokenAddress) external;

  /// @notice Check if a specific token is supported
  /// @param tokenAddress Address of the token to check
  /// @return True if token is supported, false otherwise
  function supportedTokens(address tokenAddress) external view returns (bool);

  /// @notice Get list of all supported token addresses
  /// @return Array of supported token addresses
  function getSupportedTokens() external view returns (address[] memory);

  /// @notice Get the number of supported tokens
  /// @return Count of supported tokens
  function getSupportedTokenCount() external view returns (uint256);
}
