// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

contract MockNoReturnERC20 {
  mapping(address account => uint256 balance) private s_balances;
  mapping(address owner => mapping(address spender => uint256 allowance)) private s_allowances;

  function mint(address account, uint256 amount) external {
    s_balances[account] += amount;
  }

  function balanceOf(address account) external view returns (uint256) {
    return s_balances[account];
  }

  function approve(address spender, uint256 amount) external returns (bool) {
    s_allowances[msg.sender][spender] = amount;
    return true;
  }

  function transfer(address to, uint256 amount) external {
    _transfer(msg.sender, to, amount);
  }

  function transferFrom(address from, address to, uint256 amount) external {
    uint256 allowance = s_allowances[from][msg.sender];
    require(allowance >= amount, "insufficient allowance");
    s_allowances[from][msg.sender] = allowance - amount;
    _transfer(from, to, amount);
  }

  function _transfer(address from, address to, uint256 amount) private {
    uint256 balance = s_balances[from];
    require(balance >= amount, "insufficient balance");
    s_balances[from] = balance - amount;
    s_balances[to] += amount;
  }
}
