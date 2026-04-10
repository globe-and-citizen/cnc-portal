// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/**
 * @dev Represents a stock grant allocated to a shareholder.
 * @param shareholder Address of the shareholder receiving the grant.
 * @param amount Total amount of stock allocated in this grant.
 * @param lastMinted Timestamp of the most recent mint from this grant.
 * @param totalMinted Cumulative amount minted so far from this grant.
 * @param isActive Whether the grant is currently active.
 */
struct StockGrant {
  address shareholder;
  uint256 amount;
  uint256 lastMinted;
  uint256 totalMinted;
  bool isActive;
}
