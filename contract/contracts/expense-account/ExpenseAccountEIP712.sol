// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/ReentrancyGuardUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/PausableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/cryptography/EIP712Upgradeable.sol";
import "@openzeppelin/contracts/utils/Address.sol";
import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

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
     * @param token Address of the token (zero address for native ETH)
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
        address tokenAddress;
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
    string private constant BUDGETDATA_TYPE = "BudgetData(uint8 budgetType,uint256 value)"; // remove token address here

    /// @dev Type signature for the BudgetLimit struct, used in EIP-712 encoding.
    string private constant BUDGETLIMIT_TYPE = 
        "BudgetLimit(address approvedAddress,BudgetData[] budgetData,uint256 expiry,address tokenAddress)"; //ad token address here

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

    enum ApprovalState {
        Uninitialized,
        Active,
        Inactive
    }

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
        ApprovalState state;
    }

    /// @dev Mapping to track transfer balances.
    mapping(bytes32 => Balance) public balances;

    /// @dev Mapping to track supported tokens.
    mapping(string => address) public supportedTokens;

    event Deposited(address indexed depositor, uint256 amount);

    event Transfer(address indexed withdrawer, address indexed to, uint256 amount);

    event ApprovalDeactivated(bytes32 indexed signatureHash);

    event ApprovalActivated(bytes32 indexed signatureHash);

    event TokenDeposited(address indexed depositor, address indexed token, uint256 amount);

    event TokenTransfer(address indexed withdrawer, address indexed to, address indexed token, uint256 amount);

    event TokenAddressChanged(
        address indexed addressWhoChanged,
        string tokenSymbol,
        address indexed oldAddress,
        address indexed newAddress
    );

    error UnauthorizedAccess(address expected, address received);

    error AmountPerPeriodExceeded(uint256 amount);

    error AmountPerTransactionExceeded(uint256 amount);
    
    function initialize(
        address owner,
        address _usdtAddress,
        address _usdcAddress
    ) public initializer {
        __Ownable_init(owner);
        __ReentrancyGuard_init();
        __Pausable_init();
        __EIP712_init("CNCExpenseAccount", "1");
        
        supportedTokens["USDT"] = _usdtAddress;
        supportedTokens["USDC"] = _usdcAddress;
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
            limit.expiry,
            limit.tokenAddress
        ));
    }

    /**
     * @notice Allows an employee to withdraw their wages.
     * @param to The address to transfer to.
     * @param amount The amount to transfer.
     * @param limit The BudgetLimit struct that was signed by the contract owner
     * @param signature The ECDSA signature.
     *
     * Requirements:
     * - The approval must not be inactive
     * - The caller must be the member specified in the budget limit.
     * - The budget limit must be signed by the contract owner.
     * - The budgetData must not be an empty array.
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
        require(balances[keccak256(signature)].state != ApprovalState.Inactive, "Approval inactive");

        require(msg.sender == limit.approvedAddress, "Withdrawer not approved");

        require(to != address(0), "Address required");

        require(amount > 0, "Amount must be greater than zero");

        require(limit.budgetData.length > 0, "Empty budget data");

        require(isTokenSupported(limit.tokenAddress), "Unsupported token");

        bytes32 digest = _hashTypedDataV4(budgetLimitHash(limit));

        address signer = digest.recover(signature);

        if (signer != owner()) {
            revert UnauthorizedAccess(owner(), signer);
        }

        require((block.timestamp <= limit.expiry), "Authorization expired");

        _checkAndUpdateBudgetData(limit.budgetData, amount, signature);

        if (limit.tokenAddress == address(0)) {
            payable(to).sendValue(amount);
            emit Transfer(limit.approvedAddress, to, amount);
        } else {
            require(IERC20(limit.tokenAddress).transfer(to, amount), "Token transfer failed");
            emit TokenTransfer(limit.approvedAddress, to, limit.tokenAddress, amount);
        }
    }

    /**
     * @dev Checks each budget data item to ensure the transfer is valid and
     * updates the relevant balances to reflect the current transfer.
     * @param budgetData The budget data representing the set limits.
     * @param amount The amount to transfer.
     * @param signature The ECDSA signature.
     *
     * Requirements:
     * - The number of transactions must not exceed the specified amount.
     * - The total amount withdrawn must not exceed the allowed amount per period.
     * - The amount being transferred must not exceed the allowed amount per transaction.
     *
     */
    function _checkAndUpdateBudgetData(
        BudgetData[] calldata budgetData, 
        uint256 amount, 
        bytes calldata signature
    ) private {
        bytes32 sigHash = keccak256(signature);

        bool isAmountWithdrawn;

        for (uint8 i = 0; i < budgetData.length; i++) {
            if (budgetData[i].budgetType == BudgetType.TransactionsPerPeriod) {
                require(balances[sigHash].transactionCount < budgetData[i].value, "Transaction limit reached");
                balances[sigHash].transactionCount++;
            } else if (budgetData[i].budgetType == BudgetType.AmountPerPeriod) {
                if (balances[sigHash].amountWithdrawn+amount > budgetData[i].value)
                    revert AmountPerPeriodExceeded(balances[sigHash].amountWithdrawn+amount);
                if (!isAmountWithdrawn) {
                    balances[sigHash].amountWithdrawn+=amount;
                    isAmountWithdrawn = true;
                }
            } else if (budgetData[i].budgetType == BudgetType.AmountPerTransaction) {
                if (amount > budgetData[i].value)
                    revert AmountPerTransactionExceeded(amount);
                if (!isAmountWithdrawn) {
                    balances[sigHash].amountWithdrawn+=amount;
                    isAmountWithdrawn = true;
                }
            }
        }

        if (balances[sigHash].state == ApprovalState.Uninitialized)
            balances[sigHash].state = ApprovalState.Active;
    }

    /**
     * @notice Deactivates an approval so it's no longer usable
     * @param signatureHash - keccak256 hash of the signature of the approval
     * Emits {ApprovalDeactivated} event
     */
    function deactivateApproval(bytes32 signatureHash) external onlyOwner {
        balances[signatureHash].state = ApprovalState.Inactive;
        emit ApprovalDeactivated(signatureHash);
    }

    /**
     * @notice Activates an approval so it's usable
     * @param signatureHash - keccak256 hash of the signature of the approval
     * Emits {ApprovalActivated} event
     */
    function activateApproval(bytes32 signatureHash) external onlyOwner {
        balances[signatureHash].state = ApprovalState.Active;
        emit ApprovalActivated(signatureHash);
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

    /**
     * @dev Checks if a token is supported.
     * @param _token The address of the token to check.
     * @return True if the token is supported, false otherwise.
     */
    function isTokenSupported(address _token) public view returns (bool) {
        return 
            _token == supportedTokens["USDT"] || 
            _token == supportedTokens["USDC"] || 
            _token == address(0);
    }

    /**
     * @dev Deposits tokens from the caller to the contract.
     * @param token The address of the token to deposit.
     * @param amount The amount of tokens to deposit.
     *
     * Requirements:
     * - The token must be supported.
     * - The amount must be greater than zero.
     *
     * Emits a {TokenDeposited} event.
     */
    function depositToken(address token, uint256 amount) external nonReentrant whenNotPaused {
        require(isTokenSupported(token), "Unsupported token");
        require(amount > 0, "Amount must be greater than zero");
        
        require(IERC20(token).transferFrom(msg.sender, address(this), amount), "Token transfer failed");
        emit TokenDeposited(msg.sender, token, amount);
    }

    /**
     * @dev Changes the address of a supported token.
     * @param symbol The symbol of the token to change.
     * @param newAddress The new address of the token.
     *
     * Requirements:
     * - The new address must not be zero.
     * - The symbol must be "USDT" or "USDC".
     *
     * Emits a {TokenAddressChanged} event.
     */
    function changeTokenAddress(string calldata symbol, address newAddress) external onlyOwner whenNotPaused {
        require(newAddress != address(0), "Address cannot be zero");
        require(
            keccak256(abi.encodePacked(symbol)) == keccak256(abi.encodePacked("USDT")) || 
            keccak256(abi.encodePacked(symbol)) == keccak256(abi.encodePacked("USDC")), 
            "Invalid token symbol"
        );
        
        address oldAddress = supportedTokens[symbol];
        supportedTokens[symbol] = newAddress;
        emit TokenAddressChanged(msg.sender, symbol, oldAddress, newAddress);
    }

    /**
     * @dev Gets the balance of a supported token.
     * @param token The address of the token to get the balance of.
     * @return The balance of the token.
     */
    function getTokenBalance(address token) external view returns (uint256) {
        require(isTokenSupported(token), "Unsupported token");
        return IERC20(token).balanceOf(address(this));
    }
}
