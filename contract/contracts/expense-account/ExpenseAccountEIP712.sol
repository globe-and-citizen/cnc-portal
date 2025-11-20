// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/ReentrancyGuardUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/PausableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/cryptography/EIP712Upgradeable.sol";
import "@openzeppelin/contracts/utils/Address.sol";
import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@quant-finance/solidity-datetime/contracts/DateTime.sol";

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
    using DateTime for uint256;

    enum FrequencyType {
		OneTime,
		Daily, 
		Weekly,
		Monthly,
		Custom
	}

	struct BudgetLimit {
		uint256 amount;
		FrequencyType frequencyType;
		uint256 customFrequency;
		uint256 startDate;
		uint256 endDate;
		address tokenAddress;
		address approvedAddress;
	}

    enum ApprovalState {
        Uninitialized,
        Active,
        Inactive
    }

	struct ExpenseBalance {
		uint256 lastWithdrawnDate;
		uint256 totalWithdrawn;
		uint256 lastWithdrawnPeriod;
        ApprovalState state;
	}

    mapping(bytes32 => ExpenseBalance) public expenseBalances;

    /// @dev Mapping to track supported tokens.
    mapping(string => address) public supportedTokens;

    string private constant BUDGET_LIMIT_TYPE = 
        "BudgetLimit(uint256 amount,uint8 frequencyType,uint256 customFrequency,uint256 startDate,uint256 endDate,address tokenAddress,address approvedAddress)";

    bytes32 constant BUDGET_LIMIT_TYPEHASH = 
        keccak256(
            abi.encodePacked(BUDGET_LIMIT_TYPE)
        );

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
     * @dev Withdraw funds using EIP-712 signed budget limit
     * Signature can be reused within the valid period
     */
    function transfer(
        address to,
        uint256 amount,
        BudgetLimit calldata budgetLimit,
        bytes calldata signature
    ) external {
        // Verify to address is non-zero address
        require(to != address(0), "Address required");

        // Verify the caller is the approved spender
        require(msg.sender == budgetLimit.approvedAddress, "Spender not approved");
        
        // Verify EIP-712 signature
        bytes32 budgetHash = _hashTypedDataV4(budgetLimitHash(budgetLimit));
        require(budgetHash.recover(signature) == owner(), "Signer not authorized");

        bytes32 signatureHash = keccak256(signature);
        
        // Validate transfer conditions
        require(validateTransfer(budgetLimit, amount, signatureHash), "Transfer not allowed");

        // Update expense balance
        updateExpenseBalance(budgetLimit, amount, signatureHash);

        // Perform transfer
        if (budgetLimit.tokenAddress == address(0)) {
            payable(to).sendValue(amount);
            emit Transfer(budgetLimit.approvedAddress, to, amount);
        } else {
            require(IERC20(budgetLimit.tokenAddress).transfer(to, amount), "Token transfer failed");
            emit TokenTransfer(budgetLimit.approvedAddress, to, budgetLimit.tokenAddress, amount);
        }
    }

    /**
     * @dev Validate transfer against budget limits
     */
    function validateTransfer(
        BudgetLimit calldata budgetLimit,
        uint256 amount,
        bytes32 signatureHash
    ) public view returns (bool) {
        // Check if within date range
        require(
            block.timestamp >= budgetLimit.startDate && 
            block.timestamp <= budgetLimit.endDate,
            "Outside valid date range"
        );

        // Check amount doesn't exceed single withdrawal limit
        require(amount <= budgetLimit.amount, "Amount exceeds budget limit");

        ExpenseBalance storage balance = expenseBalances[signatureHash];
        
        // For one-time withdrawals
        if (budgetLimit.frequencyType == FrequencyType.OneTime) {
            require(
                balance.totalWithdrawn == 0,
                "One-time budget already used"
            );
            // require(
            //     amount <= budgetLimit.amount,
            //     "Amount exceeds one-time budget"
            // );
            return true;
        }

        // For periodic withdrawals
        uint256 currentPeriod = getCurrentPeriod(budgetLimit);
        
        if (currentPeriod > balance.lastWithdrawnPeriod || balance.lastWithdrawnDate == 0) {
            // New period - check single withdrawal limit
            require(amount <= budgetLimit.amount, "Amount exceeds period budget");
        } else {
            // Same period - check cumulative amount
            require(
                balance.totalWithdrawn + amount <= budgetLimit.amount,
                "Exceeds period budget"
            );
        }

        return true;
    }

    /**
     * @dev Update expense balance after successful withdrawal
     */
    function updateExpenseBalance(
        BudgetLimit calldata budgetLimit,
        uint256 amount,
        bytes32 signatureHash
    ) internal {
        ExpenseBalance storage balance = expenseBalances[signatureHash];
        uint256 currentPeriod = getCurrentPeriod(budgetLimit);
        
        if (budgetLimit.frequencyType == FrequencyType.OneTime) {
            // One-time withdrawal - just add to total
            balance.totalWithdrawn += amount;
        } else if (currentPeriod > balance.lastWithdrawnPeriod || balance.lastWithdrawnDate == 0) {
            // New period - reset total and update period
            balance.totalWithdrawn = amount;
            balance.lastWithdrawnPeriod = currentPeriod;
            balance.lastWithdrawnDate = block.timestamp;
        } else {
            // Same period - add to existing total
            balance.totalWithdrawn += amount;
        }
    }

    /**
     * @dev Get current period based on frequency type using calendar periods
     */
    function getCurrentPeriod(BudgetLimit calldata budgetLimit) 
        public 
        view 
        returns (uint256) 
    {
        return getPeriod(budgetLimit, block.timestamp);
    }

    /**
     * @dev Calculate period for a given timestamp using calendar periods
     */
    function getPeriod(BudgetLimit calldata budgetLimit, uint256 timestamp) 
        public 
        pure 
        returns (uint256) 
    {
        if (timestamp < budgetLimit.startDate) return 0;
        
        if (budgetLimit.frequencyType == FrequencyType.OneTime) {
            return 0;
        } else if (budgetLimit.frequencyType == FrequencyType.Daily) {
            // Daily periods reset at midnight UTC
            return (timestamp - budgetLimit.startDate) / 1 days;
        } else if (budgetLimit.frequencyType == FrequencyType.Weekly) {
            // Weekly periods: Sunday to Saturday
            return getWeeksSinceStart(budgetLimit.startDate, timestamp);
        } else if (budgetLimit.frequencyType == FrequencyType.Monthly) {
            // Monthly periods: 1st to last day of each month
            return getMonthsSinceStart(budgetLimit.startDate, timestamp);
        } else if (budgetLimit.frequencyType == FrequencyType.Custom) {
            require(budgetLimit.customFrequency > 0, "Custom frequency must be > 0");
            return (timestamp - budgetLimit.startDate) / budgetLimit.customFrequency;
        }
        
        revert("Invalid frequency type");
    }

	/**
	 * @dev Calculate weeks since start date (Monday to Sunday weeks)
	 */
	function getWeeksSinceStart(uint256 startDate, uint256 timestamp) 
		internal 
		pure 
		returns (uint256) 
	{
		// Get the Monday of the start date week
		uint256 startMonday = getStartOfWeek(startDate);
		// Get the Monday of the current timestamp week
		uint256 currentMonday = getStartOfWeek(timestamp);
		
		// Ensure we don't underflow and calculate weeks between the two Mondays
		if (currentMonday < startMonday) {
			return 0;
		}
		
		// Calculate weeks between the two Mondays
		return (currentMonday - startMonday) / 1 weeks;
	}

	/**
	 * @dev Get start of week (previous Monday) for a given timestamp
	 */
	function getStartOfWeek(uint256 timestamp) 
		internal 
		pure 
		returns (uint256) 
	{
		// DateTime.getDayOfWeek returns 1 for Monday, 2 for Tuesday, ..., 7 for Sunday
		uint256 dayOfWeek = DateTime.getDayOfWeek(timestamp);
		
		// Get the date at 00:00:00 of the current day
		uint256 currentDayStart = DateTime.timestampFromDate(
			DateTime.getYear(timestamp),
			DateTime.getMonth(timestamp),
			DateTime.getDay(timestamp)
		);
		
		// If it's Monday, return the same day at 00:00:00
		if (dayOfWeek == 1) {
			return currentDayStart;
		} else {
			// Go back to previous Monday
			// Subtract (dayOfWeek - 1) days to get to Monday
			uint256 daysToSubtract = (dayOfWeek - 1) * 1 days;
			if (currentDayStart >= daysToSubtract) {
				return currentDayStart - daysToSubtract;
			} else {
				// If we would go before timestamp 0, just return 0
				return 0;
			}
		}
	}

	/**
	 * @dev Calculate months since start date (calendar months)
	 */
	function getMonthsSinceStart(uint256 startDate, uint256 timestamp) 
		internal 
		pure 
		returns (uint256) 
	{
		uint256 startYear = DateTime.getYear(startDate);
		uint256 startMonth = DateTime.getMonth(startDate);

		uint256 currentYear = DateTime.getYear(timestamp);
		uint256 currentMonth = DateTime.getMonth(timestamp);
		
		// Handle the case where current date is before start date
		if (timestamp < startDate) {
			return 0;
		}
		
		// Calculate the difference safely
		if (currentYear == startYear) {
			// Same year
			if (currentMonth >= startMonth) {
				return currentMonth - startMonth;
			}
		} else if (currentYear > startYear) {
			// Different years
			uint256 fullYears = currentYear - startYear - 1;
			uint256 monthsFromFirstYear = 12 - startMonth;
			uint256 monthsFromCurrentYear = currentMonth;
			
			return fullYears * 12 + monthsFromFirstYear + monthsFromCurrentYear;
		}
		
		// Should not reach here if timestamp >= startDate
		return 0;
	}

    /**
     * @dev Get hash of budget limit for tracking in expenseBalances mapping
     */
    function budgetLimitHash(BudgetLimit calldata budgetLimit) 
        public 
        pure 
        returns (bytes32) 
    {
        return keccak256(abi.encode(
            BUDGET_LIMIT_TYPEHASH,
            budgetLimit.amount,
            budgetLimit.frequencyType,
            budgetLimit.customFrequency,
            budgetLimit.startDate,
            budgetLimit.endDate,
            budgetLimit.tokenAddress,
            budgetLimit.approvedAddress
        ));
    }

    /**
     * @notice Deactivates an approval so it's no longer usable
     * @param signatureHash - keccak256 hash of the signature of the approval
     * Emits {ApprovalDeactivated} event
     */
    function deactivateApproval(bytes32 signatureHash) external onlyOwner {
        expenseBalances[signatureHash].state = ApprovalState.Inactive;
        emit ApprovalDeactivated(signatureHash);
    }

    /**
     * @notice Activates an approval so it's usable
     * @param signatureHash - keccak256 hash of the signature of the approval
     * Emits {ApprovalActivated} event
     */
    function activateApproval(bytes32 signatureHash) external onlyOwner {
        expenseBalances[signatureHash].state = ApprovalState.Active;
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
