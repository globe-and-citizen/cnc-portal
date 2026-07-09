// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/ReentrancyGuardUpgradeable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "./base/TokenSupport.sol";
import {IBank} from "./interfaces/IBank.sol";
import {IOfficer} from "./interfaces/IOfficer.sol";

/**
 * @title FixedReturn
 * @notice Fixed-rate lending product for a team treasury.
 * @dev Upgradeable and reentrancy-guarded. One instance per team, deployed behind a
 *      Beacon proxy (see ignition/modules), matching the Bank/BoardOfDirectors pattern.
 *
 *  Lifecycle per lending offer
 *  ───────────────────────────
 *  Open → (funding target reached)        → Funded → (issuer repays) → Repaying
 *  Open → (deadline missed, issuer flips) → Refundable
 *
 *  Money flow
 *  ──────────
 *  Open        — lender deposits sit in this contract. No owner-callable drain function
 *                exists, so deposits are protected structurally: only claimRefund (lender)
 *                or the funded-sweep (to Bank) can move them out.
 *  Funded      — on the final deposit that hits the target, the full accumulated principal
 *                is swept to Bank in the same transaction. From that point this contract
 *                holds no lender funds.
 *  Repaying    — issuer calls Bank.fundFixedReturnRepayment(offerId, amount); Bank transfers
 *                that amount here (drawn from the treasury built up via the funding sweep
 *                and ongoing deposits) and calls repayLenders, which fans it out. Funds
 *                only ever pass through this contract transiently, in the same transaction.
 *  Refundable  — lenders claim their principal directly from this contract (funds never
 *                left since the offer did not reach its target).
 *
 *  Repayment model
 *  ───────────────
 *  Funded/Repaying — Bank calls repayLenders(offerId, amount); amount must not exceed total
 *                    lender obligation (principal + flat interest). Distributed proportionally
 *                    from the balance Bank just transferred in. Remainder of integer-division
 *                    rounding goes to the final lender so no dust accumulates.
 *
 *  Deposit rules by access mode
 *  ─────────────────────────────
 *  General   — lenderCap controls max deposit per lender (if isCapEnabled)
 *  Whitelist — lenderAllocation controls max deposit per lender (cap ignored, since
 *              the allocation already IS that lender's personal cap)
 *
 *  Off-chain data
 *  ──────────────
 *  title and description are accepted as createLendingOffer params but never stored
 *  or emitted on-chain — the calling application persists them linked by offerId.
 */
contract FixedReturn is OwnableUpgradeable, ReentrancyGuardUpgradeable, TokenSupport {
  using SafeERC20 for IERC20;

  // ────────────────────────────────────────────────────
  // Types
  // ────────────────────────────────────────────────────
  // Mirrored independently in interfaces/IFixedReturn.sol for external consumers —
  // this contract is not directly imported by it, matching the Bank/IBank,
  // FeeCollector/IFeeCollector convention used elsewhere in this codebase.

  enum TermUnit {
    Days,
    Months,
    Years
  }

  enum FundingAccess {
    General,
    Whitelist
  }

  enum OfferState {
    Open,
    Funded,
    Refundable,
    Repaying
  }

  struct LendingOffer {
    address token;
    uint256 fundingTarget; // total amount the issuer wants to raise
    uint256 interestRateBps; // flat rate in basis points (800 = 8%), applied over the whole term
    uint16 termDuration; // informational only — not enforced on-chain
    TermUnit termUnit;
    uint256 startDate;
    uint256 subscriptionDeadline;
    FundingAccess fundingAccess;
    bool isCapEnabled; // only relevant in General mode
    uint256 lenderCap; // max deposit per lender — General mode only
    uint256 totalFunded; // cumulative lender deposits
    uint256 totalRepaidByIssuer; // cumulative issuer repayments (capped at total obligation)
    OfferState state;
  }

  /// @dev Grouped to avoid "stack too deep" in createLendingOffer — also reads better
  ///      at call sites than a 12-parameter function signature.
  struct CreateOfferParams {
    address token;
    uint256 fundingTarget;
    uint256 interestRateBps;
    uint16 termDuration;
    TermUnit termUnit;
    uint256 startDate;
    uint256 subscriptionDeadline;
    FundingAccess fundingAccess;
    bool isCapEnabled;
    uint256 lenderCap;
    address[] whitelistAddrs; // Whitelist mode only — ignored in General mode
    uint256[] allocations; // parallel array to whitelistAddrs: allocations[i] is the
    // max amount whitelistAddrs[i] may deposit into this offer
  }

  // ────────────────────────────────────────────────────
  // Storage
  // ────────────────────────────────────────────────────

  /// @dev Also serves as the next offer's id generator — see createLendingOffer.
  uint256 public totalOfferings;

  /// @dev offerId => the offer's full configuration and funding/repayment state.
  ///      Private — LendingOffer has 13 fields, and the auto-generated public getter
  ///      for a mapping to a large struct flattens all of them into one return tuple,
  ///      which needs every field on the stack at once. Combined with the extra
  ///      bookkeeping solidity-coverage's instrumentation adds throughout the rest of
  ///      the contract, that auto-getter alone was enough to exceed the EVM's 16-slot
  ///      stack limit during coverage runs (compiled fine otherwise). getLendingOffer
  ///      below returns the same data via a `memory` struct instead, which the
  ///      compiler represents as a single pointer rather than 13 separate locals.
  mapping(uint256 offerId => LendingOffer offer) private s_lendingOffers;

  /// @dev offerId => lender => cumulative amount that lender has deposited so far.
  ///      This is principal only; it is never decremented on repayment (repayment
  ///      pays the lender directly, it doesn't reduce their recorded contribution),
  ///      and is the basis for both the per-lender cap/allocation checks and the
  ///      proportional repayment split in repayLenders.
  mapping(uint256 offerId => mapping(address lender => uint256 amount)) public lenderDeposits;

  /// @dev offerId => lender => max amount that lender may deposit. Only meaningful
  ///      for Whitelist-mode offers; zero means "not whitelisted for this offer".
  mapping(uint256 offerId => mapping(address lender => uint256 allocation)) public lenderAllocation;

  /// @dev offerId => addresses that have deposited at least once, in deposit order.
  ///      Drives the proportional payout loop in repayLenders — every entry here
  ///      gets a share of each repayment, so this list must never contain duplicates
  ///      (guarded by hasDeposited below) or grow unboundedly large for a single offer.
  mapping(uint256 offerId => address[] lenders) private s_offerLenders;

  /// @dev offerId => lender => whether they're already recorded in s_offerLenders,
  ///      so a lender's second/third deposit doesn't push a duplicate entry.
  mapping(uint256 offerId => mapping(address lender => bool deposited)) public hasDeposited;

  /// @dev offerId => lender => cumulative tokens already forwarded to that lender
  ///      across all repayLenders installments.
  ///      Used by the cumulative-entitlement algorithm in repayLenders to ensure
  ///      proportional distribution is independent of installment partitioning.
  mapping(uint256 offerId => mapping(address lender => uint256 amount)) public totalPaidToLender;

  /// @notice Address of the Officer contract — set once at initialization from msg.sender.
  ///         Officer is the proxy deployer, so msg.sender IS Officer at init time,
  ///         matching the pattern used by Bank (Bank.sol line 163) and InvestorV1.
  ///         MUST be appended after all v1.0.0 storage variables (totalOfferings through
  ///         hasDeposited) so that upgrading an existing proxy does not shift their slots.
  address public officerAddress;

  // ────────────────────────────────────────────────────
  // Events
  // ────────────────────────────────────────────────────

  /// @notice Emitted when a new lending offer is created.
  event LendingOfferCreated(
    uint256 indexed offerId,
    address indexed token,
    uint256 fundingTarget,
    uint256 interestRateBps,
    uint256 startDate,
    uint256 subscriptionDeadline,
    FundingAccess fundingAccess
  );

  /// @notice Emitted when a lender deposits funds into an offer.
  event FundsLent(uint256 indexed offerId, address indexed lender, uint256 amount);

  /// @notice Emitted when an offer's funding target is reached and principal swept to Bank.
  event LendingOfferFunded(uint256 indexed offerId);

  /// @notice Emitted when an offer is flipped to refundable after a missed deadline.
  event LendingOfferRefundable(uint256 indexed offerId);

  /// @notice Emitted when a lender claims back their principal from a refundable offer.
  event PrincipalRefunded(uint256 indexed offerId, address indexed lender, uint256 amount);

  /// @notice Emitted once per repayLenders call, for the total amount distributed.
  event RepaymentDistributed(uint256 indexed offerId, uint256 totalAmount);

  /// @notice Emitted per lender, for their proportional share of a repayment.
  event LenderRepaid(uint256 indexed offerId, address indexed lender, uint256 amount);

  // ────────────────────────────────────────────────────
  // Errors
  // ────────────────────────────────────────────────────

  /// @dev A required address argument was the zero address.
  error ZeroAddress();
  /// @dev subscriptionDeadline must be on or before startDate.
  error InvalidDeadline();
  /// @dev termDuration is zero or exceeds the maximum allowed for its termUnit.
  error InvalidTermDuration();
  /// @dev lenderCap exceeds the offer's fundingTarget.
  error LenderCapExceedsFundingTarget();
  /// @dev The sum of whitelist allocations exceeds the offer's fundingTarget.
  error AllocationSumExceedsFundingTarget();
  /// @dev whitelistAddrs and allocations arrays have different lengths.
  error WhitelistLengthMismatch();
  /// @dev The offer is not in the Open state.
  error OfferNotOpen();
  /// @dev The offer is not in the Funded or Repaying state.
  error OfferNotFunded();
  /// @dev The offer is not in the Refundable state.
  error OfferNotRefundable();
  /// @dev markAsRefundable was called before the subscription deadline passed.
  error DeadlineNotPassed();
  /// @dev msg.sender has no allocation on this whitelist offer.
  error NotWhitelisted();
  /// @dev Deposit would exceed the caller's whitelist allocation.
  error DepositExceedsAllocation();
  /// @dev Deposit would exceed the offer's per-lender cap.
  error DepositExceedsLenderCap();
  /// @dev Deposit would exceed the offer's remaining funding target.
  error FundingTargetReached();
  /// @dev Caller has nothing to refund on this offer.
  error NothingToRefund();
  /// @dev amount must be greater than zero.
  error ZeroAmount();
  /// @dev The repayment would exceed the total lender obligation (principal + interest).
  error ExceedsRepaymentObligation();
  /// @dev The Bank contract could not be located via the Officer.
  error BankContractNotFound();
  /// @dev The offer token is not supported by Bank.
  error TokenNotSupportedByBank(address token);
  /// @dev The caller is not the Bank contract.
  /// @param caller The caller address.
  error NotBank(address caller);

  // ────────────────────────────────────────────────────
  // Peer-contract resolution
  // ────────────────────────────────────────────────────

  modifier onlyBank() {
    if (msg.sender != _getBankAddress()) revert NotBank(msg.sender);
    _;
  }

  /// @custom:oz-upgrades-unsafe-allow constructor
  constructor() {
    _disableInitializers();
  }

  /**
   * @notice Initializes the FixedReturn contract with its owner and initial supported tokens.
   * @dev Called by Officer at proxy-creation time. officerAddress is captured from
   *      msg.sender because Officer is always the proxy deployer — matching the pattern
   *      used by Bank (Bank.sol line 143) and InvestorV1 (InvestorV1.sol line 148).
   * @param _tokenAddresses Initial set of ERC20 tokens lenders may fund offers with.
   * @param _owner Address that will become the owner of this contract.
   * @custom:security Only callable once due to the initializer modifier.
   */
  function initialize(address[] calldata _tokenAddresses, address _owner) external initializer {
    if (_owner == address(0)) revert ZeroAddress();
    __Ownable_init(_owner);
    __ReentrancyGuard_init();

    officerAddress = msg.sender;

    uint256 length = _tokenAddresses.length;
    for (uint256 i = 0; i < length; ++i) {
      _addTokenSupport(_tokenAddresses[i]);
    }
  }

  // ────────────────────────────────────────────────────
  // Token allowlist (TokenSupport overrides — owner-gated)
  // ────────────────────────────────────────────────────

  // NOTE: These functions manage the token allowlist only — they do not transfer
  // any tokens. No owner-callable function in this contract moves token balances
  // out to the owner; that restriction is structural and intentional.

  /// @inheritdoc TokenSupport
  function addTokenSupport(address _tokenAddress) external override onlyOwner {
    _addTokenSupport(_tokenAddress);
  }

  /// @inheritdoc TokenSupport
  function removeTokenSupport(address _tokenAddress) external override onlyOwner {
    _removeTokenSupport(_tokenAddress);
  }

  // ────────────────────────────────────────────────────
  // Issuer — create lending offer
  // ────────────────────────────────────────────────────

  /**
   * @notice Create a new fixed-rate lending offer.
   * @dev title/description are intentionally not part of this signature — the calling
   *      application persists them off-chain, linked by the returned offerId.
   * @param params The offer configuration — see CreateOfferParams.
   */
  function createLendingOffer(
    CreateOfferParams calldata params
  ) external onlyOwner returns (uint256 offerId) {
    // The deposit token must already be on this team's allowlist.
    if (!_isTokenSupported(params.token)) revert TokenSupportNotFound(params.token);

    // Bank must also support the token — lend deposits are swept there on funding
    // and repayments are routed through Bank. Validating here prevents offers that
    // would fail at fund or repay time due to Bank token mismatch.
    address bankAddress = _getBankAddress();
    if (!IBank(bankAddress).isTokenSupported(params.token)) {
      revert TokenNotSupportedByBank(params.token);
    }

    // The subscription window must close on or before the loan's start date.
    if (params.subscriptionDeadline > params.startDate) revert InvalidDeadline();

    if (
      params.termUnit == TermUnit.Days && (params.termDuration == 0 || params.termDuration > 365)
    ) {
      revert InvalidTermDuration();
    }
    if (
      params.termUnit == TermUnit.Months && (params.termDuration == 0 || params.termDuration > 120)
    ) {
      revert InvalidTermDuration();
    }
    if (
      params.termUnit == TermUnit.Years && (params.termDuration == 0 || params.termDuration > 30)
    ) {
      revert InvalidTermDuration();
    }

    if (
      params.fundingAccess == FundingAccess.General &&
      params.isCapEnabled &&
      params.lenderCap > params.fundingTarget
    ) {
      revert LenderCapExceedsFundingTarget();
    }

    offerId = ++totalOfferings;

    s_lendingOffers[offerId] = LendingOffer({
      token: params.token,
      fundingTarget: params.fundingTarget,
      interestRateBps: params.interestRateBps,
      termDuration: params.termDuration,
      termUnit: params.termUnit,
      startDate: params.startDate,
      subscriptionDeadline: params.subscriptionDeadline,
      fundingAccess: params.fundingAccess,
      isCapEnabled: params.isCapEnabled,
      lenderCap: params.lenderCap,
      totalFunded: 0,
      totalRepaidByIssuer: 0,
      state: OfferState.Open
    });

    if (params.fundingAccess == FundingAccess.Whitelist) {
      if (params.whitelistAddrs.length != params.allocations.length) {
        revert WhitelistLengthMismatch();
      }
      uint256 allocatedTotal;
      for (uint256 i = 0; i < params.whitelistAddrs.length; ++i) {
        lenderAllocation[offerId][params.whitelistAddrs[i]] = params.allocations[i];
        allocatedTotal += params.allocations[i];
      }
      if (allocatedTotal > params.fundingTarget) revert AllocationSumExceedsFundingTarget();
    }

    emit LendingOfferCreated(
      offerId,
      params.token,
      params.fundingTarget,
      params.interestRateBps,
      params.startDate,
      params.subscriptionDeadline,
      params.fundingAccess
    );
  }

  // ────────────────────────────────────────────────────
  // Lender — lend funds
  // ────────────────────────────────────────────────────

  /**
   * @notice Deposit funds into an open offer.
   * @dev Strict CEI ordering throughout:
   *      1. checks  — all reverts evaluated first
   *      2. effects — state updated before any external call
   *      3. interactions — lender transfer, then Bank sweep if now funded
   *
   *      Deposits accumulate in this contract while the offer is Open.
   *      On the deposit that hits the funding target the full principal is swept
   *      to Bank in the same transaction. From that point this contract holds no
   *      lender funds for this offer.
   */
  function lendFunds(uint256 offerId, uint256 amount) external nonReentrant {
    if (amount == 0) revert ZeroAmount();

    LendingOffer storage offer = s_lendingOffers[offerId];

    if (offer.state != OfferState.Open) revert OfferNotOpen();
    if (block.timestamp > offer.subscriptionDeadline) revert OfferNotOpen();

    if (offer.fundingAccess == FundingAccess.Whitelist) {
      if (lenderAllocation[offerId][msg.sender] == 0) revert NotWhitelisted();
      uint256 remainingAllocation = lenderAllocation[offerId][msg.sender] -
        lenderDeposits[offerId][msg.sender];
      if (amount > remainingAllocation) revert DepositExceedsAllocation();
    } else if (offer.isCapEnabled) {
      if (lenderDeposits[offerId][msg.sender] + amount > offer.lenderCap) {
        revert DepositExceedsLenderCap();
      }
    }

    if (amount > offer.fundingTarget - offer.totalFunded) revert FundingTargetReached();

    // Effects
    lenderDeposits[offerId][msg.sender] += amount;
    offer.totalFunded += amount;

    if (!hasDeposited[offerId][msg.sender]) {
      hasDeposited[offerId][msg.sender] = true;
      s_offerLenders[offerId].push(msg.sender);
    }

    bool nowFunded = offer.totalFunded >= offer.fundingTarget;
    if (nowFunded) {
      offer.state = OfferState.Funded;
    }

    // Interactions — lender transfer must complete before the Bank sweep
    IERC20(offer.token).safeTransferFrom(msg.sender, address(this), amount);

    if (nowFunded) {
      // Sweep the full accumulated principal to Bank so no lender funds remain here.
      address bankAddress = _getBankAddress();
      IERC20(offer.token).safeTransfer(bankAddress, offer.totalFunded);
    }

    emit FundsLent(offerId, msg.sender, amount);
    if (nowFunded) {
      emit LendingOfferFunded(offerId);
    }
  }

  // ────────────────────────────────────────────────────
  // Issuer — mark refundable (deadline missed)
  // ────────────────────────────────────────────────────

  /**
   * @notice Flip an offer to Refundable once its subscription deadline has passed
   *         without reaching its funding target.
   * @dev Only reachable from Open — a Funded offer has already succeeded and moves
   *      on to repayment instead, never refunding. This is an issuer decision, not
   *      automatic: missing the deadline doesn't force a refund by itself, the issuer
   *      must explicitly choose to open the refund path for lenders to claim from.
   */
  function markAsRefundable(uint256 offerId) external onlyOwner {
    LendingOffer storage offer = s_lendingOffers[offerId];
    if (offer.state != OfferState.Open) revert OfferNotOpen();
    if (block.timestamp <= offer.subscriptionDeadline) revert DeadlineNotPassed();
    offer.state = OfferState.Refundable;
    emit LendingOfferRefundable(offerId);
  }

  // ────────────────────────────────────────────────────
  // Lender — claim refund (only if Refundable)
  // ────────────────────────────────────────────────────

  /**
   * @notice Claim back principal from a Refundable offer.
   * @dev Funds for a refundable offer never left this contract (the offer never
   *      reached its funding target, so the Bank sweep in lendFunds never ran).
   *      Principal only, no interest — the loan never actually started.
   *      Deposit is zeroed before the transfer (effects before interaction).
   */
  function claimRefund(uint256 offerId) external nonReentrant {
    LendingOffer storage offer = s_lendingOffers[offerId];
    if (offer.state != OfferState.Refundable) revert OfferNotRefundable();

    uint256 amount = lenderDeposits[offerId][msg.sender];
    if (amount == 0) revert NothingToRefund();

    lenderDeposits[offerId][msg.sender] = 0;
    IERC20(offer.token).safeTransfer(msg.sender, amount);

    emit PrincipalRefunded(offerId, msg.sender, amount);
  }

  // ────────────────────────────────────────────────────
  // Issuer — repay lenders (push via Bank, can be installments)
  // ────────────────────────────────────────────────────

  /**
   * @notice Distributes a repayment installment to lenders. Called by Bank, which
   *         has already transferred `amount` of the offer's token to this contract
   *         in the same transaction (mirrors InvestorV1.distributeTokenDividends).
   *         Can be called multiple times as installments.
   * @dev Repayment ceiling: totalRepaidByIssuer + amount must not exceed the total
   *      lender obligation (sum of principal + flat interest across all lenders).
   *      Rounding: distribution is cumulative — each lender's installment share equals
   *      their cumulative entitlement (based on totalRepaidByIssuer after this call)
   *      minus what they have already received (totalPaidToLender). The final lender
   *      absorbs any remainder at the cumulative level, so proportions are exact and
   *      independent of how the issuer partitions installments.
   * @dev Unbounded loop over s_offerLenders[offerId] — a lender whose token receipt
   *      reverts blocks everyone else in the same offer. Acceptable at current scale.
   */
  function repayLenders(uint256 offerId, uint256 amount) external onlyBank nonReentrant {
    if (amount == 0) revert ZeroAmount();

    LendingOffer storage offer = s_lendingOffers[offerId];
    if (offer.state != OfferState.Funded && offer.state != OfferState.Repaying) {
      revert OfferNotFunded();
    }

    // Repayment ceiling — prevent overpayment beyond total lender entitlement.
    uint256 totalObligation = offer.totalFunded +
      (offer.totalFunded * offer.interestRateBps) /
      10_000;
    if (offer.totalRepaidByIssuer + amount > totalObligation) revert ExceedsRepaymentObligation();

    offer.state = OfferState.Repaying;
    offer.totalRepaidByIssuer += amount;

    // Cumulative distribution: each lender's share = their cumulative entitlement
    // (based on totalRepaidByIssuer) minus what they have already received.
    // The final lender absorbs any rounding remainder at the cumulative level,
    // so proportions hold regardless of how the issuer partitions installments.
    address[] storage lenders = s_offerLenders[offerId];
    uint256 cumulativeForNonLast = 0;
    for (uint256 i = 0; i < lenders.length; ++i) {
      address lender = lenders[i];
      uint256 cumulativeEntitlement;
      if (i == lenders.length - 1) {
        cumulativeEntitlement = offer.totalRepaidByIssuer - cumulativeForNonLast;
      } else {
        cumulativeEntitlement =
          (offer.totalRepaidByIssuer * lenderDeposits[offerId][lender]) /
          offer.totalFunded;
        cumulativeForNonLast += cumulativeEntitlement;
      }
      uint256 alreadyPaid = totalPaidToLender[offerId][lender];
      uint256 share = cumulativeEntitlement > alreadyPaid ? cumulativeEntitlement - alreadyPaid : 0;
      totalPaidToLender[offerId][lender] = cumulativeEntitlement;
      if (share > 0) {
        IERC20(offer.token).safeTransfer(lender, share);
        emit LenderRepaid(offerId, lender, share);
      }
    }

    emit RepaymentDistributed(offerId, amount);
  }

  // ────────────────────────────────────────────────────
  // Views
  // ────────────────────────────────────────────────────

  /// @notice Lender's proportional share of the global repayment obligation.
  /// @dev Uses the same formula as the cumulative distribution in repayLenders:
  ///      floor(totalObligation * deposit / totalFunded). This is exact for every
  ///      lender except the last in deposit order, who absorbs the rounding remainder
  ///      and may receive slightly more. Returns 0 if the lender has no deposit or
  ///      the offer has no funded amount yet.
  function totalEntitlementOf(uint256 offerId, address lender) external view returns (uint256) {
    uint256 lenderDeposit = lenderDeposits[offerId][lender];
    if (lenderDeposit == 0) return 0;
    LendingOffer storage offer = s_lendingOffers[offerId];
    if (offer.totalFunded == 0) return 0;
    uint256 totalObligation = offer.totalFunded +
      (offer.totalFunded * offer.interestRateBps) /
      10_000;
    return (totalObligation * lenderDeposit) / offer.totalFunded;
  }

  /// @notice All lender addresses that have deposited into a given offer.
  function getOfferLenders(uint256 offerId) external view returns (address[] memory) {
    return s_offerLenders[offerId];
  }

  /// @notice Full configuration and funding/repayment state for a given offer.
  function getLendingOffer(uint256 offerId) external view returns (LendingOffer memory) {
    return s_lendingOffers[offerId];
  }

  /// @notice Current contract version, per semver.
  function version() external pure returns (string memory) {
    return "1.1.0";
  }

  /// @dev Resolves Bank via Officer. Reverts if not found.
  function _getBankAddress() internal view returns (address) {
    address bankAddress = IOfficer(officerAddress).findDeployedContract("Bank");
    if (bankAddress == address(0)) revert BankContractNotFound();
    return bankAddress;
  }

  /*//////////////////////////////////////////////////////////////
                          UPGRADE STORAGE GAP
    //////////////////////////////////////////////////////////////*/

  // Gap reduced from 50 to 48: two new slots added above (totalPaidToLender, officerAddress).
  // solhint-disable-next-line chainlink-solidity/prefix-storage-variables-with-s-underscore
  uint256[48] private __gap;
}
