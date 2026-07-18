// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {EnumerableSet} from "@openzeppelin/contracts/utils/structs/EnumerableSet.sol";

/**
 * @title TokenSupport
 * @notice Base contract for managing supported tokens using EnumerableSet
 * @dev Provides standard token support functionality for other contracts to inherit
 */
abstract contract TokenSupport {
  using EnumerableSet for EnumerableSet.AddressSet;

  /// @dev Set to track all supported token addresses for enumeration
  EnumerableSet.AddressSet internal s_supportedTokens;

  /// @notice Emitted when a new token is added to the supported tokens list
  event TokenSupportAdded(address indexed tokenAddress);

  /// @notice Emitted when a token is removed from the supported tokens list
  event TokenSupportRemoved(address indexed tokenAddress);

  /// @dev A required token address argument was the zero address.
  error TokenSupport__ZeroAddress();

  /// @dev The token is already in the supported tokens list.
  /// @param token The token that was already supported.
  error TokenSupport__AlreadyAdded(address token);

  /// @dev The token is not currently in the supported tokens list.
  /// @param token The token that was not found.
  error TokenSupport__NotFound(address token);

  /**
   * @notice Adds a supported token to the contract
   * @param tokenAddress The address of the token contract
   * @dev Virtual function - override to add access control (e.g., onlyOwner)
   */
  function addTokenSupport(address tokenAddress) external virtual {
    _addTokenSupport(tokenAddress);
  }

  /**
   * @notice Removes a supported token from the contract
   * @param tokenAddress The address of the token contract
   * @dev Virtual function - override to add access control (e.g., onlyOwner)
   */
  function removeTokenSupport(address tokenAddress) external virtual {
    _removeTokenSupport(tokenAddress);
  }

  /**
   * @notice Returns all supported token addresses
   * @return Array of supported token addresses
   */
  function getSupportedTokens() external view returns (address[] memory) {
    return s_supportedTokens.values();
  }

  /**
   * @notice Returns the count of supported tokens
   * @return Number of supported tokens
   */
  function getSupportedTokenCount() external view returns (uint256) {
    return s_supportedTokens.length();
  }

  /**
   * @notice Public version: checks if a token is supported.
   * @param token The address of the token to check.
   * @return True if token is supported, false otherwise.
   */
  function isTokenSupported(address token) public view returns (bool) {
    return s_supportedTokens.contains(token);
  }

  /**
   * @notice Adds a supported token to the contract.
   * @param tokenAddress The address of the token contract.
   * @dev Can only be called by contracts that implement onlyOwner or similar access control.
   */
  function _addTokenSupport(address tokenAddress) internal {
    if (tokenAddress == address(0)) revert TokenSupport__ZeroAddress();
    if (!s_supportedTokens.add(tokenAddress)) revert TokenSupport__AlreadyAdded(tokenAddress);
    emit TokenSupportAdded(tokenAddress);
  }

  /**
   * @notice Removes a supported token from the contract.
   * @param tokenAddress The address of the token contract.
   * @dev Can only be called by contracts that implement onlyOwner or similar access control.
   */
  function _removeTokenSupport(address tokenAddress) internal {
    if (tokenAddress == address(0)) revert TokenSupport__ZeroAddress();
    if (!s_supportedTokens.remove(tokenAddress)) revert TokenSupport__NotFound(tokenAddress);
    emit TokenSupportRemoved(tokenAddress);
  }

  /**
   * @notice Checks if a token is supported
   * @param token The address of the token to check
   * @return True if the token is supported, false otherwise
   */
  function _isTokenSupported(address token) internal view returns (bool) {
    return s_supportedTokens.contains(token);
  }
}
