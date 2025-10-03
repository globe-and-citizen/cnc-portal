// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "./BankV1.sol"; // This should be the path to your existing deployed Bank logic
import "../interfaces/ICommisionManager.sol";
//the BankV2 inherit from BankV1
contract BankV2 is Bank {
    ICommissionManager public commissionManager;

    // New events for V2 (do not override existing ones)
    event CommissionManagerUpdated(address indexed oldCommissionManager, address indexed newCommissionManager);
    event DepositedWithFee(address indexed depositor, uint256 netAmount, uint256 feeAmount);
    event TransferWithFee(address indexed sender, address indexed to, uint256 netAmount, uint256 feeAmount);

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers(); // Required for upgradeable contracts
    }

    /// @notice Reinitialization after upgrade to V2
    function initializeV2(address _commissionManager) external reinitializer(2) {
        require(_commissionManager != address(0), "Invalid commission manager");
        commissionManager = ICommissionManager(_commissionManager);
    }

    /// @notice Update commission manager
    function updateCommissionManager(address _newCommissionManager) external onlyOwner whenNotPaused {
        require(_newCommissionManager != address(0), "Invalid address");
        emit CommissionManagerUpdated(address(commissionManager), _newCommissionManager);
        commissionManager = ICommissionManager(_newCommissionManager);
    }
    /// @notice Receive ETH and apply deposit fee
    receive() external payable override {
        uint256 originalAmount = msg.value;
        require(originalAmount > 0, "Zero-value deposits are not allowed");
        address fundReceiver = commissionManager.getFundReceiver();
    
        if(fundReceiver ==address(this)){
            emit Deposited(msg.sender, originalAmount);// V1-compatible
            emit DepositedWithFee(msg.sender, originalAmount, 0); // V2-specific
            return ;
        }
        // Check if the receiver is not the contract itself
        uint256 feeRate = commissionManager.getDepositFee();
        
        uint256 feeAmount = (originalAmount * feeRate) / 10000;

        if (feeAmount > 0) {
            commissionManager.receiveFee{value: feeAmount}("deposit");
        }

        uint256 netAmount = originalAmount - feeAmount;

        emit Deposited(msg.sender, netAmount); // V1-compatible
        emit DepositedWithFee(msg.sender, netAmount, feeAmount); // V2-specific
        
    }

    /// @notice Transfer ETH with withdrawal fee
    function transfer(address _to, uint256 _amount)
        external
        payable
        override
        onlyOwner
        nonReentrant
        whenNotPaused {
        require(_to != address(0), "Address cannot be zero");
        require(_amount > 0, "Amount must be greater than zero");
        require(address(this).balance >= _amount, "Insufficient contract balance");
        address fundReceiver = commissionManager.getFundReceiver();
        
        if (fundReceiver == address(this)) {
            emit Transfer(msg.sender, _to, _amount);
            emit TransferWithFee(msg.sender, _to, _amount, 0);
            (bool sentFull, ) = _to.call{value: _amount}("");
            require(sentFull, "Failed to transfer");
            return;
        }
        
        uint16 feeRate = commissionManager.getWithdrawFee();
        uint256 feeAmount = (_amount * feeRate) / 10000;
        if (feeAmount > 0) {
            commissionManager.receiveFee{value: feeAmount}("withdraw");
        }

        uint256 netAmount = _amount - feeAmount;

        (bool sent, ) = _to.call{value: netAmount}("");
        require(sent, "Failed to transfer");

        emit Transfer(msg.sender, _to, netAmount); // V1-compatible
        emit TransferWithFee(msg.sender, _to, netAmount, feeAmount); // V2-specific
    
    }
}
