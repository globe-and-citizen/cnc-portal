// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";

/**
 * @title IMintableERC20
 * @dev Derived from: contracts/test/MockERC20.sol (local mintable ERC20 implementation)
 */
interface IMintableERC20 is IERC20 {
  /// @notice Mints new tokens to a shareholder.
  /// @param shareholder Recipient of the minted tokens.
  /// @param amount Amount to mint.
  function mint(address shareholder, uint256 amount) external;
}
