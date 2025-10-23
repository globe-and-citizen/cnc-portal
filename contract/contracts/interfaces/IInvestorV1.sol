// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/access/IAccessControl.sol";
import "./IMintableERC20.sol";
import "./ICNCContract.sol";
import "./IOwnable.sol";

interface IInvestorV1 is IAccessControl, IOwnable {
    function MINTER_ROLE() external view returns (bytes32);
    function DEFAULT_ADMIN_ROLE() external view returns (bytes32);
    function individualMint(address shareholder, uint256 amount) external;
}