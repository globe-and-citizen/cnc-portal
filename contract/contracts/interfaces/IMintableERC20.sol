// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import '@openzeppelin/contracts/token/ERC20/IERC20.sol';

/**
 * @title IMintableERC20
 * @dev Derived from: contracts/test/MockERC20.sol (local mintable ERC20 implementation)
 */
interface IMintableERC20 is IERC20 {
  function mint(address _shareholder, uint256 _amount) external;
}
