// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/ReentrancyGuardUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/PausableUpgradeable.sol";

contract ExpenseAccount is 
    OwnableUpgradeable, 
    ReentrancyGuardUpgradeable, 
    PausableUpgradeable {

    uint256 public maxLimit;

    mapping(address => bool) public approvedAddresses;

    event Deposited(address indexed depositor, uint256 amount);

    event Transfer(address indexed sender, address indexed to, uint256 amount);
    
    function initialize(address owner) public initializer {
        __Ownable_init(owner);
        __ReentrancyGuard_init();
        __Pausable_init();
    }

    function transfer(
        address _to,
        uint256 _amount
    ) external nonReentrant whenNotPaused {      
        require(_to != address(0), "Address required");

        require(_amount > 0, "Amount must be greater than zero");

        require(approvedAddresses[msg.sender], "Sender not approved");

        require(_amount <= maxLimit, "Max limit exceeded");

        payable(_to).transfer(_amount);

        emit Transfer(msg.sender, _to,_amount);
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
        emit Deposited(msg.sender, msg.value);
     }
}
