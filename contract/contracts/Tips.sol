// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

contract Tips {
    mapping(address => uint256) private balance;
    uint8 public pushLimit=10;
    uint256 remainder;

    event PushTip(
        address from,
        address[] teamMembers,
        uint256 totalAmount,
        uint256 amountPerAddress
    );
    event SendTip(
        address from,
        address[] teamMembers,
        uint256 totalAmount,
        uint256 amountPerAddress
    );
    event TipWithdrawal(address to, uint256 amount);

    function pushTip(address[] calldata _teamMembersAddresses) positiveAmountRequired external payable {
        
        require(_teamMembersAddresses.length > 0, "Must have at least one team member");
        require(
            pushLimit >= _teamMembersAddresses.length,
            "You have too much team members"
        );
        uint totalAmount = msg.value + remainder;
        uint256 amountPerAddress = totalAmount / _teamMembersAddresses.length;

        // Should fail if the contract balance is insufficient
        for (uint256 i = 0; i < _teamMembersAddresses.length; i++) {
            require(
                address(this).balance >= amountPerAddress,
                "Insufficient contract balance"
            );
            
            (bool sent, ) = _teamMembersAddresses[i].call{value: amountPerAddress}("");
            require(sent, "Failed to send ETH");
        }

        emit PushTip(msg.sender, _teamMembersAddresses, msg.value, amountPerAddress);
    }

    function sendTip(address[] memory _teamMembersAddresses) positiveAmountRequired external payable {
        uint256 amountPerAddress = msg.value / _teamMembersAddresses.length;

        for (uint256 i = 0; i < _teamMembersAddresses.length; i++) {
            balance[_teamMembersAddresses[i]] += amountPerAddress;
        }

        emit SendTip(msg.sender, _teamMembersAddresses, msg.value, amountPerAddress);
    }

    // TODO: Protection for reentrancy attack
    function withdraw() external payable {
        uint256 senderBalance = balance[msg.sender];
        require(senderBalance > 0, "No tips to withdraw.");

        (bool sent,) = msg.sender.call{value: senderBalance}("");
        require(sent, "Failed to withdraw tips.");

        balance[msg.sender] = 0;
        require(balances[msg.sender] == 0, "Failed to zero out balance");

        emit TipWithdrawal(msg.sender, senderBalance);
    }

    function getBalance(address _address) external view returns (uint256) {
        return balance[_address];
    }

    modifier positiveAmountRequired() {
        require(msg.value > 0, "Must send a positive amount.");
        _;
    }
}
