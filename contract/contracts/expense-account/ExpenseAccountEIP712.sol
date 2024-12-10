// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/ReentrancyGuardUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/PausableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/cryptography/EIP712Upgradeable.sol";
import "@openzeppelin/contracts/utils/Address.sol";
import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";

/**
 * @title ExpenseAccountEIP712
 * @dev A contract for expense payments using EIP-712 for signature verification.
 *      Allows approved users to transfer expense payments approved by the contract owner.
 */

contract ExpenseAccountEIP712 is 
    OwnableUpgradeable, 
    ReentrancyGuardUpgradeable, 
    EIP712Upgradeable, 
    PausableUpgradeable {

    using Address for address payable;
    using ECDSA for bytes32;

    /**
     * @title BudgetData
     * @notice Represents a specific budget constraint applied to withdrawals.
     * @dev Combines a constraint type (`budgetType`) with its associated value.
     * 
     * @param budgetType The type of budget constraint to apply.
     * @param value The value associated with the budget constraint:
     * - For `TransactionsPerPeriod`: the maximum number of transactions allowed.
     * - For `AmountPerPeriod`: the total allowed withdrawal amount within the period.
     * - For `AmountPerTransaction`: the maximum amount per transaction.
     */
    struct BudgetData {
        BudgetType budgetType;
        uint256 value;
    }

    /**
     * @title BudgetLimit
     * @notice Represents a collection of budget constraints for an authorized transfer.
     * @dev This struct is signed and verified using EIP-712, ensuring constraints are enforced.
     * 
     * @param approvedAddress The address authorized to perform withdrawals under these constraints.
     * @param budgetData An array of budget constraints to apply to transfers.
     * Each element in the array represents a specific `BudgetData` constraint.
     * @param expiry The expiry timestamp for the budget constraints.
     * After this timestamp, the constraints are no longer valid, and transfers are prohibited.
     */
    struct BudgetLimit {
        address approvedAddress;
        BudgetData[] budgetData;
        uint256 expiry;
    }

    /**
     * @title BudgetType
     * @notice Defines the types of constraints that can be applied to withdrawals in the smart contract.
     * @dev Used in conjunction with EIP-712 for signing and verifying constraints on withdrawals.
     * 
     * @param TransactionsPerPeriod Limits the number of transactions allowed within a specific time period.
     * @param AmountPerPeriod Limits the total amount of funds that can be withdrawn within a specific time period.
     * @param AmountPerTransaction Limits the maximum amount that can be withdrawn in a single transaction.
     */
    enum BudgetType {
        TransactionsPerPeriod,
        AmountPerPeriod,
        AmountPerTransaction
    }

    /// @dev Type signature for the BudgetData struct, used in EIP-712 encoding.
    string private constant BUDGETDATA_TYPE = "BudgetData(uint8 budgetType,uint256 value)";

    /// @dev Type signature for the BudgetLimit struct, used in EIP-712 encoding.
    string private constant BUDGETLIMIT_TYPE = 
        "BudgetLimit(address approvedAddress,BudgetData[] budgetData,uint256 expiry)";

    /// @dev Typehash for the BudgetData struct, used in EIP-712 encoding.
    bytes32 constant BUDGETDATA_TYPEHASH = 
        keccak256(
            abi.encodePacked(BUDGETDATA_TYPE)
        );

    /// @dev Typehash for the BudgetLimit struct, used in EIP-712 encoding.
    bytes32 constant BUDGETLIMIT_TYPEHASH = 
        keccak256(
            abi.encodePacked(BUDGETLIMIT_TYPE, BUDGETDATA_TYPE)
        );

    /**
     * @title Balance
     * @notice Represents a set of variables used for tracking expense transfer balances.
     * @dev Updated as the approved user makes transfers checking whether any of the relevant
     * constraints have not been exceeded.
     * 
     * @param transactionCount Keeps track of the number of transfers made for a specific approval.
     * @param amountWithdrawn Keeps track of the total withdrawals that have been made on an approval.
     */
    struct Balance {
        uint256 transactionCount;
        uint256 amountWithdrawn;
    }

    /// @dev Mapping to track transfer balances.
    mapping(bytes32 => Balance) public balances;

    event Deposited(address indexed depositor, uint256 amount);

    event Transfer(address indexed withdrawer, address indexed to, uint256 amount);

    error UnauthorizedAccess(address expected, address received);

    error AmountPerPeriodExceeded(uint256 amount);

    error AmountPerTransactionExceeded(uint256 amount);
    
    function initialize(address owner) public initializer {
        __Ownable_init(owner);
        __ReentrancyGuard_init();
        __Pausable_init();
        __EIP712_init("CNCExpenseAccount", "1");
    }

    /**
     * @dev Computes the hash of a single BudgetData item.
     * @param budgetData The BudgetData struct to hash.
     * @return The hash of the BudgetData item.
     */
    function singleBudgetDataHash (BudgetData calldata budgetData) private pure returns( bytes32 ) {
        return keccak256(abi.encode(
            BUDGETDATA_TYPEHASH,
            budgetData.budgetType,
            budgetData.value
        ));
    }

    /**
     * @dev Computes the hash of an array of BudgetData items.
     * @param budgetData The BudgetData items to hash.
     * @return The hash of the BudgetData items.
     */
    function budgetDataHash (BudgetData[] calldata budgetData) private pure returns( bytes32 ) {
        bytes32[] memory hashes = new bytes32[](budgetData.length);
        for (uint8 i = 0; i < budgetData.length; i++) {
            hashes[i] = singleBudgetDataHash(budgetData[i]);
        }
        return keccak256(abi.encodePacked(hashes)); // Hash the array of hashes
    }

    /**
     * @dev Computes the hash of an BudgetLimit struct which is the object that
     * was signed by the contract owner.
     * @param limit The BudgetLimit struct to hash.
     * @return The hash of the BudgetLimit struct.
     */
    function budgetLimitHash (BudgetLimit calldata limit) private pure returns( bytes32 ) {
        return keccak256(abi.encode(
            BUDGETLIMIT_TYPEHASH,
            limit.approvedAddress,
            budgetDataHash(limit.budgetData),
            limit.expiry
        ));
    }

    /**
     * @notice Allows an employee to withdraw their wages.
     * @dev Hourly rate is in ether so it needs to be multiplied
     * by 10 ** 18
     * @param to The address to transfer to.
     * @param amount The amount to transfer.
     * @param limit The BudgetLimit struct that was signed by the contract owner
     * @param signature The ECDSA signature.
     *
     * Requirements:
     * - The caller must be the member specified in the budget limit.
     * - The budget limit must be signed by the contract owner.
     * - The number of transactions must not exceed the specified amount.
     * - The total amount withdrawn must not exceed the allowed amount per period.
     * - The amount being transferred must not exceed the allowed amount per transaction.
     * - The contract must not be paused.
     *
     * Emits a {Withdraw} event.
     */
    function transfer(
        address to,
        uint256 amount, 
        BudgetLimit calldata limit, 
        bytes calldata signature
    ) external whenNotPaused nonReentrant{        
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

        bool isAmountWithdrawn;

        for (uint8 i = 0; i < limit.budgetData.length; i++) {
            if (limit.budgetData[i].budgetType == BudgetType.TransactionsPerPeriod) {
                require(balances[sigHash].transactionCount < limit.budgetData[i].value, "Transaction limit reached");
                balances[sigHash].transactionCount++;
            } 
            
            if (limit.budgetData[i].budgetType == BudgetType.AmountPerPeriod) {
                if (balances[sigHash].amountWithdrawn+amount > limit.budgetData[i].value)
                    revert AmountPerPeriodExceeded(balances[sigHash].amountWithdrawn+amount);
                if (!isAmountWithdrawn) {
                    balances[sigHash].amountWithdrawn+=amount;
                    isAmountWithdrawn = true;
                }
            }

            if (limit.budgetData[i].budgetType == BudgetType.AmountPerTransaction) {
                if (amount > limit.budgetData[i].value)
                    revert AmountPerTransactionExceeded(amount);
                if (!isAmountWithdrawn) {
                    balances[sigHash].amountWithdrawn+=amount;
                    isAmountWithdrawn = true;
                }
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
