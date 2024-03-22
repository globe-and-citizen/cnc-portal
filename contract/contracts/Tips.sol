// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

contract Tips {
    mapping(address => uint256) private addressToTips;

    event PushTip(
        address from,
        address[] to,
        uint256 totalAmount,
        uint256 amountPerAddress
    );
    event SendTip(
        address from,
        address[] to,
        uint256 totalAmount,
        uint256 amountPerAddress
    );
    event TipWithdrawal(address to, uint256 amount);

    function pushTip(address[] memory _toAddresses) positiveAmountRequired external payable {
        uint256 amountPerAddress = msg.value / _toAddresses.length;

        for (uint256 i = 0; i < _toAddresses.length; i++) {
            bool transferSuccess = payable(_toAddresses[i]).send(amountPerAddress);
            require(transferSuccess, "Failed to send tip.");
        }

        emit PushTip(msg.sender, _toAddresses, msg.value, amountPerAddress);
    }

    function sendTip(address[] memory _toAddresses) positiveAmountRequired external payable {
        uint256 amountPerAddress = msg.value / _toAddresses.length;

        for (uint256 i = 0; i < _toAddresses.length; i++) {
            addressToTips[_toAddresses[i]] += amountPerAddress;
        }

        emit SendTip(msg.sender, _toAddresses, msg.value, amountPerAddress);
    }

    function withdraw() external payable {
        uint256 tipEarned = addressToTips[msg.sender];
        require(tipEarned > 0, "No tips to withdraw.");

        bool tipSuccess = payable(msg.sender).send(tipEarned);
        require(tipSuccess, "Failed to withdraw tips.");

        addressToTips[msg.sender] = 0;

        emit TipWithdrawal(msg.sender, tipEarned);
    }

    function getTips(address _address) external view returns (uint256) {
        return addressToTips[_address];
    }

    modifier positiveAmountRequired() {
        require(msg.value > 0, "Must send a positive amount.");
        _;
    }
}
