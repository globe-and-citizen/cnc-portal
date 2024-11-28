// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

struct StockGrant {
    address shareholder;
    uint256 amount;
    uint256 lastMinted;
    uint256 totalMinted;
    bool isActive;
}
