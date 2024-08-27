// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/ReentrancyGuardUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/PausableUpgradeable.sol";

contract ExpenseAccount is 
    OwnableUpgradeable, 
    ReentrancyGuardUpgradeable, 
    PausableUpgradeable {

    uint256 maxLimit;

    mapping(address => bool) approvedAddresses;

    event NewDeposit(address indexed depositor, uint256 amount);

    event NewWithdrawal(address indexed withdrawer, uint256 amount);
    
    function initialize() public initializer {
        __Ownable_init(msg.sender);
    }

    function withdraw(
        uint256 amount
    ) external nonReentrant whenNotPaused {        
        require(approvedAddresses[msg.sender], "Withdrawer not approved");

        require(amount <= maxLimit, "Max limit exceeded");

        payable(msg.sender).transfer(amount);

        emit NewWithdrawal(msg.sender, amount);
    }

    function setMaxLimit(uint256 amount) external onlyOwner whenNotPaused {
        maxLimit = amount;
    }

    function approveAddress(address _address) external onlyOwner whenNotPaused{
        approvedAddresses[_address] = true;
    }

    function disapproveAddress(address _address) external onlyOwner whenNotPaused{
        approvedAddresses[_address] = false;
    }

    function pause() external onlyOwner {
        _pause();
    }

    function unpause() external onlyOwner {
        _unpause();
    }

    function getBalance() external view returns (uint256) {
        return address(this).balance;
    }

    receive() external payable {
        emit NewDeposit(msg.sender, msg.value);
     }
}
