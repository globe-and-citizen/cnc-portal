// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import '@openzeppelin/contracts/utils/structs/EnumerableSet.sol';

/**
 * @title TokenSupport
 * @notice Base contract for managing supported tokens using EnumerableSet
 * @dev Provides standard token support functionality for other contracts to inherit
 */
abstract contract TokenSupport {
  using EnumerableSet for EnumerableSet.AddressSet;

  /// @dev Set to track all supported token addresses for enumeration
  EnumerableSet.AddressSet internal _supportedTokens;

  /// @notice Emitted when a new token is added to the supported tokens list
  event TokenSupportAdded(address indexed tokenAddress);

  /// @notice Emitted when a token is removed from the supported tokens list
  event TokenSupportRemoved(address indexed tokenAddress);

  /// @dev A required token address argument was the zero address.
  error TokenSupportZeroAddress();

  /// @dev The token is already in the supported tokens list.
  /// @param token The token that was already supported.
  error TokenSupportAlreadyAdded(address token);

  /// @dev The token is not currently in the supported tokens list.
  /// @param token The token that was not found.
  error TokenSupportNotFound(address token);

  /**
   * @notice Adds a supported token to the contract.
   * @param _tokenAddress The address of the token contract.
   * @dev Can only be called by contracts that implement onlyOwner or similar access control.
   */
  function _addTokenSupport(address _tokenAddress) internal {
    if (_tokenAddress == address(0)) revert TokenSupportZeroAddress();
    if (!_supportedTokens.add(_tokenAddress)) revert TokenSupportAlreadyAdded(_tokenAddress);
    emit TokenSupportAdded(_tokenAddress);
  }

  /**
   * @notice Removes a supported token from the contract.
   * @param _tokenAddress The address of the token contract.
   * @dev Can only be called by contracts that implement onlyOwner or similar access control.
   */
  function _removeTokenSupport(address _tokenAddress) internal {
    if (_tokenAddress == address(0)) revert TokenSupportZeroAddress();
    if (!_supportedTokens.remove(_tokenAddress)) revert TokenSupportNotFound(_tokenAddress);
    emit TokenSupportRemoved(_tokenAddress);
  }

  /**
   * @notice Returns all supported token addresses
   * @return Array of supported token addresses
   */
  function getSupportedTokens() external view returns (address[] memory) {
    return _supportedTokens.values();
  }

  /**
   * @notice Returns the count of supported tokens
   * @return Number of supported tokens
   */
  function getSupportedTokenCount() external view returns (uint256) {
    return _supportedTokens.length();
  }

  /**
   * @notice Checks if a token is supported
   * @param _token The address of the token to check
   * @return True if the token is supported, false otherwise
   */
  function _isTokenSupported(address _token) internal view returns (bool) {
    return _supportedTokens.contains(_token);
  }

  /**
   * @notice Public version: checks if a token is supported.
   * @param _token The address of the token to check.
   * @return True if token is supported, false otherwise.
   */
  function isTokenSupported(address _token) public view returns (bool) {
    return _supportedTokens.contains(_token);
  }

  /**
   * @notice Adds a supported token to the contract
   * @param _tokenAddress The address of the token contract
   * @dev Virtual function - override to add access control (e.g., onlyOwner)
   */
  function addTokenSupport(address _tokenAddress) external virtual {
    _addTokenSupport(_tokenAddress);
  }

  /**
   * @notice Removes a supported token from the contract
   * @param _tokenAddress The address of the token contract
   * @dev Virtual function - override to add access control (e.g., onlyOwner)
   */
  function removeTokenSupport(address _tokenAddress) external virtual {
    _removeTokenSupport(_tokenAddress);
  }
}
