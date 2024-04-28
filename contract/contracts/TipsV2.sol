// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

contract TipsV2 {
    mapping(address => uint256) private balance;

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

    function pushTip(address[] memory _teamMembersAddresses) positiveAmountRequired external payable {
        uint256 amountPerAddress = msg.value / _teamMembersAddresses.length;

        for (uint256 i = 0; i < _teamMembersAddresses.length; i++) {
            bool transferSuccess = payable(_teamMembersAddresses[i]).send(amountPerAddress);
            require(transferSuccess, "Failed to send tip.");
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

    function withdraw() external payable {
        uint256 tipEarned = balance[msg.sender];
        require(tipEarned > 0, "No tips to withdraw.");

        bool tipSuccess = payable(msg.sender).send(tipEarned);
        require(tipSuccess, "Failed to withdraw tips.");

        balance[msg.sender] = 0;

        emit TipWithdrawal(msg.sender, tipEarned);
    }

    function getBalance(address _address) external view returns (uint256) {
        return balance[_address];
    }

    modifier positiveAmountRequired() {
        require(msg.value > 0, "Must send a positive amount.");
        _;
    }
}
