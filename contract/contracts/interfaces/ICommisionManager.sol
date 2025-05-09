// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

interface ICommissionManager {
    function getDepositFee() external view returns (uint16);
    function getWithdrawFee() external view returns (uint16);
    function getFundReceiver() external view returns (address);
    function receiveFee(string calldata reason) external payable;
}