// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

contract FailingRecipient {
    receive() external payable {
        revert("Transfer rejected");
    }
}