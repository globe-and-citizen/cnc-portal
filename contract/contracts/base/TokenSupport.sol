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

  /**
   * @notice Adds a supported token to the contract.
   * @param _tokenAddress The address of the token contract.
   * @dev Can only be called by contracts that implement onlyOwner or similar access control.
   */
  function _addTokenSupport(address _tokenAddress) internal {
    require(_tokenAddress != address(0), 'Token address cannot be zero');
    require(_supportedTokens.add(_tokenAddress), 'Token already supported');
    emit TokenSupportAdded(_tokenAddress);
  }

  /**
   * @notice Removes a supported token from the contract.
   * @param _tokenAddress The address of the token contract.
   * @dev Can only be called by contracts that implement onlyOwner or similar access control.
   */
  function _removeTokenSupport(address _tokenAddress) internal {
    require(_tokenAddress != address(0), 'Token address cannot be zero');
    require(_supportedTokens.remove(_tokenAddress), 'Token not supported');
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
   * @notice Public version: Checks if a token is supported
   * @param _token The address of the token to check
   * @return True if the token is supported, false otherwise
   */
  function isTokenSupported(address _token) public view returns (bool) {
    return _supportedTokens.contains(_token);
  }
}
