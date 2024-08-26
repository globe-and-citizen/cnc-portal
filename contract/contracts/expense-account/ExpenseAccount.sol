// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/ReentrancyGuardUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/PausableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/cryptography/EIP712Upgradeable.sol";

contract ExpenseAccount is 
    OwnableUpgradeable, 
    ReentrancyGuardUpgradeable, 
    EIP712Upgradeable, 
    PausableUpgradeable {

    struct BudgetLimit {
        address approvedAddress;
        BudgetType budgetType;
        uint256 value;
        uint256 expiry;
    }

    enum BudgetType {
        TransactionsPerPeriod,
        AmountPerPeriod,
        AmountPerTransaction
    }

    bytes32 constant BUDGETLIMIT_TYPEHASH = 
        keccak256(
            "BudgetLimit(address approvedAddress,uint8 budgetType,uint256 value,uint256 expiry)"
        );

    struct Balance {
        uint256 transactionCount;
        uint256 amountWithdrawn;
    }

    mapping(bytes32 => Balance) balances;

    event NewDeposit(address indexed depositor, uint256 amount);

    event NewWithdrawal(address indexed withdrawr, uint256 amount);

    error UnauthorizedAccess(address got, address expected);
    
    function initialize() public initializer {
        __Ownable_init(msg.sender);
        __EIP712_init("CNCExpenseAccount", "1");
    }

    function budgetLimitHash (BudgetLimit calldata limit) private pure returns( bytes32 ) {
        return keccak256(abi.encodePacked(
            BUDGETLIMIT_TYPEHASH,
            limit.approvedAddress,
            limit.budgetType,
            limit.value,
            limit.expiry
        ));
    }

    function withdraw(
        uint256 amount, 
        BudgetLimit calldata limit, 
        uint8 v, 
        bytes32 r, 
        bytes32 s
    ) external whenNotPaused {        
        require(msg.sender == limit.approvedAddress, "Withdrawer not approved");

        bytes32 digest = keccak256(abi.encodePacked(
            "\x19\x01",
            _domainSeparatorV4(),
            budgetLimitHash(limit)
        ));

        address signer = ecrecover(digest, v, r, s);

        //require(signer == owner(), signer);

        if (signer != owner()) {
            revert UnauthorizedAccess(signer, owner());
        }

        require((block.timestamp <= limit.expiry), "Authorization expired");

        if (limit.budgetType == BudgetType.TransactionsPerPeriod) {
            require(balances[digest].transactionCount <= limit.value, "Transaction limit reached");
            balances[digest].transactionCount++;
            payable(limit.approvedAddress).transfer(amount);
        } else if (limit.budgetType == BudgetType.AmountPerPeriod) {
            require(balances[digest].amountWithdrawn+amount <= limit.value, "Authorized amount exceeded");
            payable(limit.approvedAddress).transfer(amount);
        } else {
            require(amount <= limit.value, "Authorized amount exceeded");
            payable(limit.approvedAddress).transfer(amount);
        }

        emit NewWithdrawal(limit.approvedAddress, amount);
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
