// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/ReentrancyGuardUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/PausableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/cryptography/EIP712Upgradeable.sol";
import "@openzeppelin/contracts/utils/Address.sol";
import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";

contract ExpenseAccountEIP712 is 
    OwnableUpgradeable, 
    ReentrancyGuardUpgradeable, 
    EIP712Upgradeable, 
    PausableUpgradeable {

    using Address for address payable;
    using ECDSA for bytes32;

    struct BudgetData {
        BudgetType budgetType;
        uint256 value;
    }

    struct BudgetLimit {
        address approvedAddress;
        BudgetData[] budgetData;
        uint256 expiry;
    }

    enum BudgetType {
        TransactionsPerPeriod,
        AmountPerPeriod,
        AmountPerTransaction
    }

    // string private constant BUDGETDATA_TYPE = "BudgetData(budgetType uint8,value uint256)";

    string private constant BUDGETDATA_TYPE = "BudgetData(uint8 budgetType,uint256 value)";

    string private constant BUDGETLIMIT_TYPE = 
        "BudgetLimit(address approvedAddress,BudgetData[] budgetData,uint256 expiry)";

    bytes32 constant BUDGETDATA_TYPEHASH = 
        keccak256(
            abi.encodePacked(BUDGETDATA_TYPE)
        );

    bytes32 constant BUDGETLIMIT_TYPEHASH = 
        keccak256(
            abi.encodePacked(BUDGETLIMIT_TYPE, BUDGETDATA_TYPE)
        );

    struct Balance {
        uint256 transactionCount;
        uint256 amountWithdrawn;
    }

    mapping(bytes32 => Balance) public balances;

    event Deposited(address indexed depositor, uint256 amount);

    event Transfer(address indexed withdrawer, address indexed to, uint256 amount);

    error UnauthorizedAccess(address expected, address received);

    error AuthorizedAmountExceeded(uint256 amount);
    
    function initialize(address owner) public initializer {
        __Ownable_init(owner);
        __ReentrancyGuard_init();
        __Pausable_init();
        __EIP712_init("CNCExpenseAccount", "1");
    }

    function singleBudgetDataHash (BudgetData calldata budgetData) private pure returns( bytes32 ) {
        return keccak256(abi.encode(
            BUDGETDATA_TYPEHASH,
            budgetData.budgetType,
            budgetData.value
        ));
    }

    function budgetDataHash (BudgetData[] calldata budgetData) private pure returns( bytes32 ) {
        bytes32[] memory hashes = new bytes32[](budgetData.length);
        for (uint8 i = 0; i < budgetData.length; i++) {
            hashes[i] = singleBudgetDataHash(budgetData[i]);
        }
        return keccak256(abi.encodePacked(hashes)); // Hash the array of hashes
    }

    function budgetLimitHash (BudgetLimit calldata limit) private pure returns( bytes32 ) {
        return keccak256(abi.encode(
            BUDGETLIMIT_TYPEHASH,
            limit.approvedAddress,
            budgetDataHash(limit.budgetData),
            limit.expiry
        ));
    }

    function transfer(
        address to,
        uint256 amount, 
        BudgetLimit calldata limit, 
        bytes calldata signature
    ) external whenNotPaused {        
        require(msg.sender == limit.approvedAddress, "Withdrawer not approved");

        require(to != address(0), "Address required");

        require(amount > 0, "Amount must be greater than zero");

        bytes32 digest = keccak256(abi.encodePacked(
            "\x19\x01",
            _domainSeparatorV4(),
            budgetLimitHash(limit)
        ));

        address signer = digest.recover(signature);//address signer = ecrecover(digest, v, r, s);

        //require(signer == owner(), signer);

        if (signer != owner()) {
            revert UnauthorizedAccess(owner(), signer);
        }

        require((block.timestamp <= limit.expiry), "Authorization expired");

        bytes32 sigHash = keccak256(signature);

        for (uint8 i = 0; i < limit.budgetData.length; i++) {
            if (limit.budgetData[i].budgetType == BudgetType.TransactionsPerPeriod) {
                require(balances[sigHash].transactionCount <= limit.budgetData[i].value, "Transaction limit reached");
                balances[sigHash].transactionCount++;
            } 
            
            if (limit.budgetData[i].budgetType == BudgetType.AmountPerPeriod) {
                if (balances[sigHash].amountWithdrawn+amount > limit.budgetData[i].value) {
                    revert AuthorizedAmountExceeded(balances[sigHash].amountWithdrawn+amount);
                }
                balances[digest].amountWithdrawn+=amount;
            }

            if (limit.budgetData[i].budgetType == BudgetType.AmountPerTransaction) {
                if (balances[sigHash].amountWithdrawn+amount > limit.budgetData[i].value) {
                    revert AuthorizedAmountExceeded(balances[sigHash].amountWithdrawn+amount);
                }
                require(amount <= limit.budgetData[i].value, "Authorized amount exceeded");
                balances[sigHash].amountWithdrawn+=amount;
            }
        }

        payable(to).sendValue(amount);

        emit Transfer(limit.approvedAddress, to, amount);
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
