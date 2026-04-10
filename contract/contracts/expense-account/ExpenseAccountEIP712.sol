// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import '@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol';
import '@openzeppelin/contracts-upgradeable/utils/ReentrancyGuardUpgradeable.sol';
import '@openzeppelin/contracts-upgradeable/utils/PausableUpgradeable.sol';
import '@openzeppelin/contracts-upgradeable/utils/cryptography/EIP712Upgradeable.sol';
import '@openzeppelin/contracts/utils/Address.sol';
import '@openzeppelin/contracts/utils/cryptography/ECDSA.sol';
import '@openzeppelin/contracts/token/ERC20/IERC20.sol';
import '@quant-finance/solidity-datetime/contracts/DateTime.sol';
import '../base/TokenSupport.sol';
import {IOfficer} from '../interfaces/IOfficer.sol';

/**
 * @title ExpenseAccountEIP712
 * @notice Allows approved users to spend from an expense account using EIP-712 signed budgets.
 * @dev Signed budget limits can be reused within their valid period, subject to per-period caps.
 */

contract ExpenseAccountEIP712 is
  OwnableUpgradeable,
  ReentrancyGuardUpgradeable,
  EIP712Upgradeable,
  PausableUpgradeable,
  TokenSupport
{
  using Address for address payable;
  using ECDSA for bytes32;
  using DateTime for uint256;

  /// @dev Frequency type controlling how the budget limit is applied.
  enum FrequencyType {
    OneTime,
    Daily,
    Weekly,
    Monthly,
    Custom
  }

  /**
   * @dev A signed budget authorization.
   * @param amount Per-period (or per-transaction for one-time) spending cap.
   * @param frequencyType How the budget resets over time.
   * @param customFrequency Period length in seconds when frequencyType is Custom.
   * @param startDate Timestamp when the budget becomes usable.
   * @param endDate Timestamp after which the budget expires.
   * @param tokenAddress Token the budget applies to; address(0) means native token.
   * @param approvedAddress Address allowed to spend against this budget.
   */
  struct BudgetLimit {
    uint256 amount;
    FrequencyType frequencyType;
    uint256 customFrequency;
    uint256 startDate;
    uint256 endDate;
    address tokenAddress;
    address approvedAddress;
  }

  /// @dev State of an approval (budget signature) tracked per signature hash.
  enum ApprovalState {
    Uninitialized,
    Active,
    Inactive
  }

  /**
   * @dev Running balance/state recorded per budget signature.
   * @param lastWithdrawnDate Timestamp of the most recent withdrawal.
   * @param totalWithdrawn Total withdrawn in the current period (or ever, for one-time).
   * @param lastWithdrawnPeriod Period index of the most recent withdrawal.
   * @param state Current approval state.
   */
  struct ExpenseBalance {
    uint256 lastWithdrawnDate;
    uint256 totalWithdrawn;
    uint256 lastWithdrawnPeriod;
    ApprovalState state;
  }

  /// @notice Tracks expense balances per signature hash.
  mapping(bytes32 => ExpenseBalance) public expenseBalances;

  // Add new state variable - MUST be added after existing ones
  address public officerAddress;

  // Storage gap for future upgrades
  uint256[49] private __gap;

  string private constant BUDGET_LIMIT_TYPE =
    'BudgetLimit(uint256 amount,uint8 frequencyType,uint256 customFrequency,uint256 startDate,uint256 endDate,address tokenAddress,address approvedAddress)';

  bytes32 constant BUDGET_LIMIT_TYPEHASH = keccak256(abi.encodePacked(BUDGET_LIMIT_TYPE));

  /**
   * @notice Emitted when native token is deposited into the contract.
   * @param depositor The sender.
   * @param amount The native amount deposited.
   */
  event Deposited(address indexed depositor, uint256 amount);

  /**
   * @notice Emitted on a successful native transfer out of the expense account.
   * @param withdrawer The approved spender authorizing the transfer.
   * @param to The recipient.
   * @param amount The amount transferred.
   */
  event Transfer(address indexed withdrawer, address indexed to, uint256 amount);

  /// @notice Emitted when an approval is deactivated.
  event ApprovalDeactivated(bytes32 indexed signatureHash);

  /// @notice Emitted when an approval is activated.
  event ApprovalActivated(bytes32 indexed signatureHash);

  /**
   * @notice Emitted when ERC20 tokens are deposited into the contract.
   * @param depositor The depositor.
   * @param token The ERC20 token address.
   * @param amount The amount deposited.
   */
  event TokenDeposited(address indexed depositor, address indexed token, uint256 amount);

  /**
   * @notice Emitted on a successful ERC20 transfer out of the expense account.
   * @param withdrawer The approved spender authorizing the transfer.
   * @param to The recipient.
   * @param token The ERC20 token.
   * @param amount The amount transferred.
   */
  event TokenTransfer(
    address indexed withdrawer,
    address indexed to,
    address indexed token,
    uint256 amount
  );

  /**
   * @notice Emitted when the owner drains native funds to the Bank.
   * @param ownerAddress Owner initiating the withdrawal.
   * @param amount Amount withdrawn.
   */
  event OwnerTreasuryWithdrawNative(address indexed ownerAddress, uint256 amount);

  /**
   * @notice Emitted when the owner drains an ERC20 token balance to the Bank.
   * @param ownerAddress Owner initiating the withdrawal.
   * @param token The ERC20 token.
   * @param amount Amount withdrawn.
   */
  event OwnerTreasuryWithdrawToken(
    address indexed ownerAddress,
    address indexed token,
    uint256 amount
  );

  /**
   * @notice Emitted when a token address alias is updated.
   * @param addressWhoChanged The caller performing the change.
   * @param tokenSymbol Symbol identifier for the token being updated.
   * @param oldAddress Previous token address.
   * @param newAddress New token address.
   */
  event TokenAddressChanged(
    address indexed addressWhoChanged,
    string tokenSymbol,
    address indexed oldAddress,
    address indexed newAddress
  );

  /// @dev The caller is not authorized for this operation.
  /// @param expected The expected authorized address.
  /// @param received The actual caller.
  error UnauthorizedAccess(address expected, address received);

  /// @dev The requested amount exceeds the per-period budget.
  /// @param amount The requested amount.
  error AmountPerPeriodExceeded(uint256 amount);

  /// @dev The requested amount exceeds the per-transaction limit.
  /// @param amount The requested amount.
  error AmountPerTransactionExceeded(uint256 amount);

  /// @dev The approval has not yet become active at the current time.
  /// @param currentTime Current block timestamp.
  /// @param startDate The approval's start timestamp.
  error ApprovalNotActive(uint256 currentTime, uint256 startDate);

  /// @dev The approval has expired.
  /// @param currentTime Current block timestamp.
  /// @param endDate The approval's end timestamp.
  error ApprovalExpired(uint256 currentTime, uint256 endDate);

  /// @dev A required address argument was the zero address.
  error ZeroAddress();
  /// @dev The caller is not the approved spender for this budget limit.
  /// @param expected The approved spender address.
  /// @param actual The caller attempting the transfer.
  error SpenderNotApproved(address expected, address actual);
  /// @dev The EIP-712 signature was not signed by the contract owner.
  /// @param expected The expected signer (contract owner).
  /// @param actual The address recovered from the signature.
  error SignerNotAuthorized(address expected, address actual);
  /// @dev The transfer did not pass the validation checks.
  error TransferNotAllowed();
  /// @dev The contract's native balance is less than the requested amount.
  /// @param required The amount requested.
  /// @param available The current contract native balance.
  error InsufficientNativeBalance(uint256 required, uint256 available);
  /// @dev The contract's token balance is less than the requested amount.
  /// @param token The ERC20 token being paid out.
  /// @param required The amount requested.
  /// @param available The current contract token balance.
  error InsufficientTokenBalance(address token, uint256 required, uint256 available);
  /// @dev A raw ERC20 transfer returned false.
  /// @param token The token whose transfer returned false.
  error TokenTransferFailed(address token);
  /// @dev The transfer amount exceeds the single-withdrawal budget limit.
  error AmountExceedsBudgetLimit();
  /// @dev A one-time budget has already been used.
  error OneTimeBudgetAlreadyUsed();
  /// @dev The amount exceeds the remaining budget for the current period.
  error AmountExceedsPeriodBudget();
  /// @dev The token is not supported by this contract.
  /// @param token The unsupported token address.
  error TokenNotSupported(address token);
  /// @dev The custom-frequency value must be greater than zero.
  error InvalidCustomFrequency();
  /// @dev The budget frequency type is invalid.
  error InvalidFrequencyType();
  /// @dev The amount must be greater than zero.
  error ZeroAmount();
  /// @dev The officer contract address has not been configured.
  error OfficerAddressNotSet();
  /// @dev The Bank contract could not be located via the Officer.
  error BankContractNotFound();

  /// @custom:oz-upgrades-unsafe-allow constructor
  constructor() {
    _disableInitializers();
  }

  /**
   * @notice Initializes the expense account contract.
   * @param owner The contract owner that will sign budget approvals.
   * @param _tokenAddresses Initial set of supported ERC20 tokens.
   */
  function initialize(address owner, address[] calldata _tokenAddresses) public initializer {
    if (owner == address(0)) revert ZeroAddress();
    __Ownable_init(owner);
    __ReentrancyGuard_init();
    __EIP712_init('CNCExpenseAccount', '1');
    __Pausable_init();

    if (msg.sender == address(0)) revert ZeroAddress();
    officerAddress = msg.sender;

    // Set the initial supported tokens
    uint256 length = _tokenAddresses.length;
    for (uint256 i = 0; i < length; ++i) {
      if (_tokenAddresses[i] == address(0)) revert ZeroAddress();
      _addTokenSupport(_tokenAddresses[i]);
    }
    // Emit events after they're already added to avoid duplicate events
    for (uint256 i = 0; i < length; ++i) {
      emit TokenSupportAdded(_tokenAddresses[i]);
    }
  }

  /**
   * @notice Withdraws funds to `to` using an EIP-712 signed budget limit.
   * @dev The signature can be reused within its valid period, subject to per-period caps.
   * @param to Recipient of the funds.
   * @param amount Amount to transfer (in token units, or wei for native).
   * @param budgetLimit The signed budget authorization details.
   * @param signature The owner's EIP-712 signature over the budget limit.
   */
  function transfer(
    address to,
    uint256 amount,
    BudgetLimit calldata budgetLimit,
    bytes calldata signature
  ) external {
    // Verify to address is non-zero address
    if (to == address(0)) revert ZeroAddress();

    // Verify the caller is the approved spender
    if (msg.sender != budgetLimit.approvedAddress) {
      revert SpenderNotApproved(budgetLimit.approvedAddress, msg.sender);
    }

    // Verify EIP-712 signature
    bytes32 budgetHash = _hashTypedDataV4(budgetLimitHash(budgetLimit));
    address recovered = budgetHash.recover(signature);
    if (recovered != owner()) revert SignerNotAuthorized(owner(), recovered);

    bytes32 signatureHash = keccak256(signature);

    // Validate transfer conditions
    if (!validateTransfer(budgetLimit, amount, signatureHash)) revert TransferNotAllowed();

    // Update expense balance
    updateExpenseBalance(budgetLimit, amount, signatureHash);

    // Perform transfer
    if (budgetLimit.tokenAddress == address(0)) {
      if (address(this).balance < amount) {
        revert InsufficientNativeBalance(amount, address(this).balance);
      }
      payable(to).sendValue(amount);
      emit Transfer(budgetLimit.approvedAddress, to, amount);
    } else {
      uint256 tokenBal = IERC20(budgetLimit.tokenAddress).balanceOf(address(this));
      if (tokenBal < amount) {
        revert InsufficientTokenBalance(budgetLimit.tokenAddress, amount, tokenBal);
      }
      if (!IERC20(budgetLimit.tokenAddress).transfer(to, amount)) {
        revert TokenTransferFailed(budgetLimit.tokenAddress);
      }
      emit TokenTransfer(budgetLimit.approvedAddress, to, budgetLimit.tokenAddress, amount);
    }
  }

  /**
   * @notice Validates that a proposed transfer respects the budget limits.
   * @param budgetLimit The signed budget authorization.
   * @param amount The requested transfer amount.
   * @param signatureHash The keccak256 hash of the approval signature.
   * @return True if the transfer is allowed.
   */
  function validateTransfer(
    BudgetLimit calldata budgetLimit,
    uint256 amount,
    bytes32 signatureHash
  ) public view returns (bool) {
    if (block.timestamp < budgetLimit.startDate) {
      revert ApprovalNotActive(block.timestamp, budgetLimit.startDate);
    }
    if (block.timestamp > budgetLimit.endDate) {
      revert ApprovalExpired(block.timestamp, budgetLimit.endDate);
    }

    // Check amount doesn't exceed single withdrawal limit
    if (amount > budgetLimit.amount) revert AmountExceedsBudgetLimit();

    ExpenseBalance storage balance = expenseBalances[signatureHash];

    // For one-time withdrawals
    if (budgetLimit.frequencyType == FrequencyType.OneTime) {
      if (balance.totalWithdrawn != 0) revert OneTimeBudgetAlreadyUsed();
      return true;
    }

    // For periodic withdrawals
    uint256 currentPeriod = getCurrentPeriod(budgetLimit);

    if (currentPeriod > balance.lastWithdrawnPeriod || balance.lastWithdrawnDate == 0) {
      // New period - check single withdrawal limit
      if (amount > budgetLimit.amount) revert AmountExceedsPeriodBudget();
    } else {
      // Same period - check cumulative amount
      if (balance.totalWithdrawn + amount > budgetLimit.amount) {
        revert AmountExceedsPeriodBudget();
      }
    }

    // Check token is supported (allows native token)
    if (budgetLimit.tokenAddress != address(0) && !isTokenSupported(budgetLimit.tokenAddress)) {
      revert TokenNotSupported(budgetLimit.tokenAddress);
    }

    return true;
  }

  /**
   * @dev Updates the expense balance record after a successful withdrawal.
   * @param budgetLimit The signed budget authorization.
   * @param amount Amount that was withdrawn.
   * @param signatureHash The keccak256 hash of the approval signature.
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
   * @notice Returns the current calendar period index for a budget.
   * @param budgetLimit The signed budget authorization.
   * @return The current period index.
   */
  function getCurrentPeriod(BudgetLimit calldata budgetLimit) public view returns (uint256) {
    return getPeriod(budgetLimit, block.timestamp);
  }

  /**
   * @notice Returns the period index for a specific timestamp under a budget's frequency.
   * @param budgetLimit The signed budget authorization.
   * @param timestamp Timestamp to evaluate.
   * @return The period index at `timestamp`.
   */
  function getPeriod(
    BudgetLimit calldata budgetLimit,
    uint256 timestamp
  ) public pure returns (uint256) {
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
      if (budgetLimit.customFrequency == 0) revert InvalidCustomFrequency();
      return (timestamp - budgetLimit.startDate) / budgetLimit.customFrequency;
    }

    revert InvalidFrequencyType();
  }

  /**
   * @dev Calculate weeks since start date (Monday to Sunday weeks).
   * @param startDate The reference start timestamp.
   * @param timestamp The timestamp to compare.
   * @return Number of full weeks between the Mondays of `startDate` and `timestamp`.
   */
  function getWeeksSinceStart(
    uint256 startDate,
    uint256 timestamp
  ) internal pure returns (uint256) {
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
   * @dev Returns the timestamp of the previous Monday at 00:00:00 UTC for a given timestamp.
   * @param timestamp The reference timestamp.
   * @return The start-of-week timestamp.
   */
  function getStartOfWeek(uint256 timestamp) internal pure returns (uint256) {
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
   * @dev Calculates months elapsed between two timestamps based on calendar months.
   * @param startDate The reference start timestamp.
   * @param timestamp The timestamp to compare.
   * @return Number of calendar months between `startDate` and `timestamp`.
   */
  function getMonthsSinceStart(
    uint256 startDate,
    uint256 timestamp
  ) internal pure returns (uint256) {
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
   * @notice Returns whether the current time starts a new period relative to the last withdrawal.
   * @param budgetLimit The signed budget authorization.
   * @param signatureHash The keccak256 hash of the approval signature.
   * @return True if this timestamp begins a new period (or there has never been a withdrawal).
   */
  function isNewPeriod(
    BudgetLimit calldata budgetLimit,
    bytes32 signatureHash
  ) public view returns (bool) {
    if (budgetLimit.frequencyType == FrequencyType.OneTime) {
      return false;
    }

    ExpenseBalance storage balance = expenseBalances[signatureHash];
    if (balance.lastWithdrawnDate == 0) {
      return true; // Never withdrawn
    }

    uint256 currentPeriod = getCurrentPeriod(budgetLimit);
    return currentPeriod > balance.lastWithdrawnPeriod;
  }

  /**
   * @notice Computes the EIP-712 hash of a BudgetLimit struct.
   * @param budgetLimit The budget limit to hash.
   * @return The struct hash usable for EIP-712 signing.
   */
  function budgetLimitHash(BudgetLimit calldata budgetLimit) public pure returns (bytes32) {
    return
      keccak256(
        abi.encode(
          BUDGET_LIMIT_TYPEHASH,
          budgetLimit.amount,
          budgetLimit.frequencyType,
          budgetLimit.customFrequency,
          budgetLimit.startDate,
          budgetLimit.endDate,
          budgetLimit.tokenAddress,
          budgetLimit.approvedAddress
        )
      );
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

  /// @notice Pauses the contract.
  function pause() external onlyOwner {
    _pause();
  }

  /// @notice Unpauses the contract.
  function unpause() external onlyOwner {
    _unpause();
  }

  /**
   * @notice Sets the officer address for cross-contract discovery.
   * @param _officerAddress The address of the officer contract.
   * @dev Can only be called by the contract owner. Used for already-deployed proxies.
   */
  function setOfficerAddress(address _officerAddress) external onlyOwner {
    if (_officerAddress == address(0)) revert ZeroAddress();
    officerAddress = _officerAddress;
  }

  /**
   * @notice Withdraws all funds (native + all supported tokens) to the Bank contract.
   * @dev Discovers the Bank address via the Officer contract. Single transaction drain.
   */
  function ownerWithdrawAllToBank() external onlyOwner nonReentrant whenNotPaused {
    if (officerAddress == address(0)) revert OfficerAddressNotSet();
    address bankAddress = IOfficer(officerAddress).findDeployedContract('Bank');
    if (bankAddress == address(0)) revert BankContractNotFound();

    uint256 nativeBalance = address(this).balance;
    if (nativeBalance > 0) {
      payable(bankAddress).sendValue(nativeBalance);
      emit OwnerTreasuryWithdrawNative(owner(), nativeBalance);
    }

    address[] memory tokens = this.getSupportedTokens();
    for (uint256 i = 0; i < tokens.length; i++) {
      uint256 tokenBalance = IERC20(tokens[i]).balanceOf(address(this));
      if (tokenBalance > 0) {
        if (!IERC20(tokens[i]).transfer(bankAddress, tokenBalance)) {
          revert TokenTransferFailed(tokens[i]);
        }
        emit OwnerTreasuryWithdrawToken(owner(), tokens[i], tokenBalance);
      }
    }
  }

  /// @notice Returns the contract's native token balance.
  function getBalance() external view returns (uint256) {
    return address(this).balance;
  }

  /// @notice Accepts native token deposits and emits {Deposited}.
  receive() external payable {
    emit Deposited(msg.sender, msg.value);
  }

  /**
   * @notice Deposits ERC20 tokens from the caller to the contract.
   * @param token The address of the token to deposit.
   * @param amount The amount of tokens to deposit.
   *
   * Requirements:
   * - The token must be supported or is native (address(0)).
   * - The amount must be greater than zero.
   *
   * Emits a {TokenDeposited} event.
   */
  function depositToken(address token, uint256 amount) external nonReentrant whenNotPaused {
    if (token != address(0) && !isTokenSupported(token)) revert TokenNotSupported(token);
    if (amount == 0) revert ZeroAmount();

    if (!IERC20(token).transferFrom(msg.sender, address(this), amount)) {
      revert TokenTransferFailed(token);
    }
    emit TokenDeposited(msg.sender, token, amount);
  }

  /**
   * @notice Adds a supported token to the contract.
   * @param _tokenAddress The address of the token contract.
   * @dev Can only be called by the contract owner.
   */
  function addTokenSupport(address _tokenAddress) external override onlyOwner {
    _addTokenSupport(_tokenAddress);
  }

  /**
   * @notice Removes a supported token from the contract.
   * @param _tokenAddress The address of the token contract.
   * @dev Can only be called by the contract owner.
   */
  function removeTokenSupport(address _tokenAddress) external override onlyOwner {
    _removeTokenSupport(_tokenAddress);
  }

  /**
   * @notice Returns the contract's balance of a supported token.
   * @param token The token address (use address(0) for native token).
   * @return The token balance held by the contract.
   */
  function getTokenBalance(address token) external view returns (uint256) {
    if (token != address(0) && !isTokenSupported(token)) revert TokenNotSupported(token);
    return IERC20(token).balanceOf(address(this));
  }
}
