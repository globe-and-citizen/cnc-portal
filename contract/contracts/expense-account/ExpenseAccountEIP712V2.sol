// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

// import "@bokkypoobah/bokkyposol-datetime-contracts/contracts/DateTime.sol";
import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/ReentrancyGuardUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/PausableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/cryptography/EIP712Upgradeable.sol";
import "@openzeppelin/contracts/utils/Address.sol";
import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@quant-finance/solidity-datetime/contracts/DateTime.sol";


contract ExpenseAccountEIP712V2 is 
	OwnableUpgradeable, 
	ReentrancyGuardUpgradeable, 
	EIP712Upgradeable, 
	PausableUpgradeable {
	using Address for address payable;
	using DateTime for uint256;
	using ECDSA for bytes32;
	
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

	struct ExpenseBalance {
		uint256 lastWithdrawnDate;
		uint256 totalWithdrawn;
		uint256 lastWithdrawnPeriod;
	}

    mapping(bytes32 => ExpenseBalance) public expenseBalances;

		mapping(string => address) public supportedTokens;

		string private constant BUDGET_LIMIT_TYPE = 
			"BudgetLimit(uint256 amount,uint8 frequencyType,uint256 customFrequency,uint256 startDate,uint256 endDate,address tokenAddress,address approvedAddress)";

		bytes32 constant BUDGET_LIMIT_TYPEHASH = 
			keccak256(
				abi.encodePacked(BUDGET_LIMIT_TYPE)
			);

    event Withdrawal(
			address indexed spender,
			uint256 amount,
			address tokenAddress,
			bytes32 budgetHash
    );

		event Transfer(address indexed withdrawer, address indexed to, uint256 amount);
		event TokenTransfer(address indexed withdrawer, address indexed to, address indexed token, uint256 amount);
		event Deposited(address indexed depositor, uint256 amount);

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
			BudgetLimit calldata budgetLimit,
			uint256 amount,
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
					balance.totalWithdrawn + amount <= budgetLimit.amount,
					"Exceeds one-time budget"
				);
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
	 * @dev Get current period based on frequency type using BokkyPooBah's library
	 */
	function getCurrentPeriod(BudgetLimit calldata budgetLimit) 
		public 
		view 
		returns (uint256) 
	{
		return getPeriod(budgetLimit, block.timestamp);
	}

	/**
	 * @dev Calculate period for a given timestamp using proper date calculations
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
			return (timestamp - budgetLimit.startDate) / 1 days;
		} else if (budgetLimit.frequencyType == FrequencyType.Weekly) {
			return (timestamp - budgetLimit.startDate) / 7 days;
		} else if (budgetLimit.frequencyType == FrequencyType.Monthly) {
			// Relative monthly periods from start date using BokkyPooBah's library
			(uint256 startYear, uint256 startMonth, uint256 startDay) = DateTime.timestampToDate(budgetLimit.startDate);
			(uint256 currentYear, uint256 currentMonth, uint256 currentDay) = DateTime.timestampToDate(timestamp);
			
			uint256 monthsSinceStart = (currentYear - startYear) * 12 + (currentMonth - startMonth);
			
			// Adjust for day of month - if current day is before start day, we haven't completed the month
			if (currentDay < startDay) {
					monthsSinceStart -= 1;
			}
			
			return monthsSinceStart;
		} else if (budgetLimit.frequencyType == FrequencyType.Custom) {
			require(budgetLimit.customFrequency > 0, "Custom frequency must be > 0");
			return (timestamp - budgetLimit.startDate) / budgetLimit.customFrequency;
		}
		
		revert("Invalid frequency type");
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

	receive() external payable {
		emit Deposited(msg.sender, msg.value);
	}
}