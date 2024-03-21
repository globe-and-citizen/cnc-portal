// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

contract Tips {
    mapping(address => uint256) private addressToTips;

    event PushTip(address from, address to, uint256 amount);
    event SendTip(address from, address to, uint256 amount);
    event WithdrawTip(address to, uint256 amount);

    function pushTip(address _to) external payable {
        require(msg.value > 0, "Must send a positive amount.");
        bool tipSuccess = payable(_to).send(msg.value);
        require(tipSuccess, "Failed to push tip.");

        emit PushTip(msg.sender, _to, msg.value);
    }

    function sendTip(address _to) external payable {
        require(msg.value > 0, "Must send a positive amount.");
        addressToTips[_to] += msg.value;

        emit SendTip(msg.sender, _to, msg.value);
    }

    function withdraw() external payable {
        uint tipEarned = addressToTips[msg.sender];
        require(tipEarned > 0, "No tips to withdraw.");

        bool tipSuccess = payable(msg.sender).send(tipEarned);
        require(tipSuccess, "Failed to withdraw tips.");

        addressToTips[msg.sender] = 0;

        emit WithdrawTip(msg.sender, tipEarned);
    }

    function getTips(address _address) external view returns (uint256) {
      return addressToTips[_address];
    }
}
