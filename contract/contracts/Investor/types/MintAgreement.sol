// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

struct MintAgreement {
    address investor;
    uint256 amount;
    uint256 lastMinted;
    uint256 totalMinted;
    bool isActive;
}
