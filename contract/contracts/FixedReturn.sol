// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {OwnableUpgradeable} from "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import {ReentrancyGuardUpgradeable} from "@openzeppelin/contracts-upgradeable/utils/ReentrancyGuardUpgradeable.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {TokenSupport} from "./base/TokenSupport.sol";
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
 *  Open → (funding target reached)         → Funded → (issuer repays) → Repaying
 *  Open → (deadline missed, issuer refunds) → Refundable
 *
 *  Money flow
 *  ──────────
 *  Open        — lender deposits sit in this contract. No owner-callable drain function
 *                exists, so deposits are protected structurally: only refundLenders or
 *                the funded-sweep (to Bank) can move them out.
 *  Funded      — on the final deposit that hits the target, the full accumulated principal
 *                is swept to Bank in the same transaction. From that point this contract
 *                holds no lender funds.
 *  Repaying    — issuer calls Bank.fundFixedReturnRepayment(offerId, amount); Bank transfers
 *                that amount here (drawn from the treasury built up via the funding sweep
 *                and ongoing deposits) and calls repayLenders, which fans it out. Funds
 *                only ever pass through this contract transiently, in the same transaction.
 *  Refundable  — reached in the same call as the refund itself: refundLenders checks the
 *                deadline directly against a still-Open offer (no separate "mark
 *                refundable" step), flips state, and pushes every lender's principal
 *                back in one transaction — funds never left this contract, since the
 *                offer didn't reach its target.
 *
 *  Stalled offers (deadline passed, target not reached)
 *  ──────────────────────────────────────────────────────
 *  The issuer has two mutually-exclusive options, both gated on the same Open +
 *  deadline-passed window — whichever is called first wins, since both require
 *  state == Open:
 *    - refundLenders        — return every lender's principal (see Refundable above).
 *    - acceptPartialFunding — keep whatever was raised and proceed as if fully funded;
 *                             sweeps totalFunded to Bank and flips to Funded, same as
 *                             the target-reached path in lendFunds. Repayment already
 *                             bases its obligation math on totalFunded rather than
 *                             fundingTarget, so it needs no special-casing for this.
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
 *              the allocation already IS that lender's personal cap). A whitelist
 *              entry may instead be UNCAPPED_ALLOCATION, meaning that lender has no
 *              personal ceiling beyond the offer's remaining funding target.
 *
 *  Whitelist reachability
 *  ───────────────────────
 *  If every whitelisted lender is capped (none use UNCAPPED_ALLOCATION), their
 *  allocations must sum to at least the funding target at creation time — otherwise
 *  the offer could never be fully funded even if every lender deposits their whole
 *  allocation. Summing to more than the target is fine, and expected: it's a buffer
 *  against any individual whitelisted lender who ends up not depositing (or not
 *  depositing their full allocation) — the others' spare capacity can still cover the
 *  target. Actual deposits stay bounded regardless, since lendFunds separately caps
 *  the running total at fundingTarget (FundingTargetReached). If the aggregate raised
 *  still falls short by the deadline despite adequate allocated capacity (e.g. a
 *  whitelisted lender simply doesn't lend), acceptPartialFunding is the issuer's
 *  fallback. An offer with at least one UNCAPPED_ALLOCATION entry skips this check
 *  entirely: that lender can always absorb whatever the capped lenders don't, so the
 *  offer is unconditionally fundable regardless of how the capped allocations sum.
 *  A whitelistAddrs entry may not repeat an address — createLendingOffer reverts on a
 *  duplicate, since a repeat would silently overwrite the earlier allocation in
 *  storage while still counting both towards the sum, defeating this guarantee.
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
    uint256 maturityDate; // informational only — not enforced on-chain beyond the
    // creation-time check that it comes after subscriptionDeadline; repayLenders itself
    // never gates on this
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
    uint256 maturityDate;
    uint256 subscriptionDeadline;
    FundingAccess fundingAccess;
    bool isCapEnabled;
    uint256 lenderCap;
    address[] whitelistAddrs; // Whitelist mode only — ignored in General mode
    uint256[] allocations; // parallel array to whitelistAddrs: allocations[i] is the
    // max amount whitelistAddrs[i] may deposit into this offer, or UNCAPPED_ALLOCATION
    // for no personal ceiling beyond the offer's remaining funding target
  }

  // ────────────────────────────────────────────────────
  // Storage
  // ────────────────────────────────────────────────────

  /// @notice Sentinel `lenderAllocation` value meaning "whitelisted, no personal cap" —
  ///         distinct from 0 ("not whitelisted"). Such a lender is still bounded by the
  ///         offer's remaining funding target, just not by an individual ceiling.
  uint256 public constant UNCAPPED_ALLOCATION = type(uint256).max;

  /// @dev Also serves as the next offer's id generator — see createLendingOffer.
  uint256 private s_totalOfferings;

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
  mapping(uint256 offerId => mapping(address lender => uint256 amount)) private s_lenderDeposits;

  /// @dev offerId => lender => max amount that lender may deposit. Only meaningful
  ///      for Whitelist-mode offers; zero means "not whitelisted for this offer",
  ///      UNCAPPED_ALLOCATION means "whitelisted, no personal ceiling".
  mapping(uint256 offerId => mapping(address lender => uint256 amount)) private s_lenderAllocation;

  /// @dev offerId => addresses that have deposited at least once, in deposit order.
  ///      Drives the proportional payout loop in repayLenders — every entry here
  ///      gets a share of each repayment, so this list must never contain duplicates
  ///      (guarded by hasDeposited below) or grow unboundedly large for a single offer.
  mapping(uint256 offerId => address[] lenders) private s_offerLenders;

  /// @dev offerId => lender => whether they're already recorded in s_offerLenders,
  ///      so a lender's second/third deposit doesn't push a duplicate entry.
  mapping(uint256 offerId => mapping(address lender => bool deposited)) private s_hasDeposited;

  /// @dev offerId => lender => cumulative tokens already forwarded to that lender
  ///      across all repayLenders installments.
  ///      Used by the cumulative-entitlement algorithm in repayLenders to ensure
  ///      proportional distribution is independent of installment partitioning.
  mapping(uint256 offerId => mapping(address lender => uint256 amount)) private s_totalPaidToLender;

  /// @notice Address of the Officer contract — set once at initialization from msg.sender.
  ///         Officer is the proxy deployer, so msg.sender IS Officer at init time,
  ///         matching the pattern used by Bank (Bank.sol line 163) and InvestorV1.
  ///         MUST be appended after all v1.0.0 storage variables (totalOfferings through
  ///         hasDeposited) so that upgrading an existing proxy does not shift their slots.
  address private s_officerAddress;

  /*//////////////////////////////////////////////////////////////
                          UPGRADE STORAGE GAP
    //////////////////////////////////////////////////////////////*/

  // Gap reduced from 50 to 48: two new slots added above (totalPaidToLender, s_officerAddress).
  uint256[48] private __gap; // solhint-disable-line chainlink-solidity/prefix-storage-variables-with-s-underscore

  // ────────────────────────────────────────────────────
  // Events
  // ────────────────────────────────────────────────────

  /// @notice Emitted when a new lending offer is created.
  event LendingOfferCreated(
    uint256 indexed offerId,
    address indexed token,
    uint256 fundingTarget,
    uint256 interestRateBps,
    uint256 subscriptionDeadline,
    FundingAccess fundingAccess
  );

  /// @notice Emitted when a lender deposits funds into an offer.
  event FundsLent(uint256 indexed offerId, address indexed lender, uint256 amount);

  /// @notice Emitted when an offer's funding target is reached and principal swept to Bank.
  event LendingOfferFunded(uint256 indexed offerId);

  /// @notice Emitted when an offer is flipped to refundable after a missed deadline.
  event LendingOfferRefundable(uint256 indexed offerId);

  /// @notice Emitted per lender when refundLenders returns their principal.
  event PrincipalRefunded(uint256 indexed offerId, address indexed lender, uint256 amount);

  /// @notice Emitted once per refundLenders call, for the total amount refunded.
  event RefundsDistributed(uint256 indexed offerId, uint256 totalAmount);

  /// @notice Emitted when the issuer accepts partial funding on a stalled offer,
  ///         alongside LendingOfferFunded — distinguishes this from reaching the
  ///         funding target in the ordinary course of lendFunds.
  event PartialFundingAccepted(uint256 indexed offerId, uint256 totalFunded, uint256 fundingTarget);

  /// @notice Emitted once per repayLenders call, for the total amount distributed.
  event RepaymentDistributed(uint256 indexed offerId, uint256 totalAmount);

  /// @notice Emitted per lender, for their proportional share of a repayment.
  event LenderRepaid(uint256 indexed offerId, address indexed lender, uint256 amount);

  // ────────────────────────────────────────────────────
  // Errors
  // ────────────────────────────────────────────────────

  /// @dev A required address argument was the zero address.
  error FixedReturn__ZeroAddress();
  /// @dev subscriptionDeadline is not strictly in the future.
  error FixedReturn__InvalidDeadline();
  /// @dev maturityDate is not strictly after subscriptionDeadline.
  error FixedReturn__InvalidMaturityDate();
  /// @dev lenderCap exceeds the offer's fundingTarget.
  error FixedReturn__LenderCapExceedsFundingTarget();
  /// @dev Every whitelist entry is capped (none UNCAPPED_ALLOCATION), but their sum
  ///      falls short of the offer's fundingTarget — the offer could never be funded
  ///      even under full participation.
  error FixedReturn__AllocationSumBelowFundingTarget();
  /// @dev whitelistAddrs and allocations arrays have different lengths.
  error FixedReturn__WhitelistLengthMismatch();
  /// @dev The same address appears more than once in whitelistAddrs.
  error FixedReturn__DuplicateWhitelistAddress();
  /// @dev The offer is not in the Open state.
  error FixedReturn__OfferNotOpen();
  /// @dev The offer is not in the Funded or Repaying state.
  error FixedReturn__OfferNotFunded();
  /// @dev refundLenders or acceptPartialFunding was called before the subscription
  ///      deadline passed.
  error FixedReturn__DeadlineNotPassed();
  /// @dev acceptPartialFunding was called on an offer with nothing raised.
  error FixedReturn__NoFundsRaised();
  /// @dev msg.sender has no allocation on this whitelist offer.
  error FixedReturn__NotWhitelisted();
  /// @dev Deposit would exceed the caller's whitelist allocation.
  error FixedReturn__DepositExceedsAllocation();
  /// @dev Deposit would exceed the offer's per-lender cap.
  error FixedReturn__DepositExceedsLenderCap();
  /// @dev Deposit would exceed the offer's remaining funding target.
  error FixedReturn__FundingTargetReached();
  /// @dev amount must be greater than zero.
  error FixedReturn__ZeroAmount();
  /// @dev The repayment would exceed the total lender obligation (principal + interest).
  error FixedReturn__ExceedsRepaymentObligation();
  /// @dev The Bank contract could not be located via the Officer.
  error FixedReturn__BankContractNotFound();
  /// @dev The offer token is not supported by Bank.
  error FixedReturn__TokenNotSupportedByBank(address token);
  /// @dev The caller is not the Bank contract.
  /// @param caller The caller address.
  error FixedReturn__NotBank(address caller);

  // ────────────────────────────────────────────────────
  // Peer-contract resolution
  // ────────────────────────────────────────────────────

  modifier onlyBank() {
    if (msg.sender != _getBankAddress()) revert FixedReturn__NotBank(msg.sender);
    _;
  }

  /// @custom:oz-upgrades-unsafe-allow constructor
  constructor() {
    _disableInitializers();
  }

  /**
   * @notice Initializes the FixedReturn contract with its owner and initial supported tokens.
   * @dev Called by Officer at proxy-creation time. s_officerAddress is captured from
   *      msg.sender because Officer is always the proxy deployer — matching the pattern
   *      used by Bank (Bank.sol line 143) and InvestorV1 (InvestorV1.sol line 148).
   * @param tokenAddresses Initial set of ERC20 tokens lenders may fund offers with.
   * @param ownerAddress Address that will become the owner of this contract.
   * @custom:security Only callable once due to the initializer modifier.
   */
  function initialize(
    address[] calldata tokenAddresses,
    address ownerAddress
  ) external initializer {
    if (ownerAddress == address(0)) revert FixedReturn__ZeroAddress();
    __Ownable_init(ownerAddress);
    __ReentrancyGuard_init();

    s_officerAddress = msg.sender;

    uint256 length = tokenAddresses.length;
    for (uint256 i = 0; i < length; ++i) {
      _addTokenSupport(tokenAddresses[i]);
    }
  }

  // ────────────────────────────────────────────────────
  // Token allowlist (TokenSupport overrides — owner-gated)
  // ────────────────────────────────────────────────────

  // NOTE: These functions manage the token allowlist only — they do not transfer
  // any tokens. No owner-callable function in this contract moves token balances
  // out to the owner; that restriction is structural and intentional.

  /// @inheritdoc TokenSupport
  function addTokenSupport(address tokenAddress) external override onlyOwner {
    _addTokenSupport(tokenAddress);
  }

  /// @inheritdoc TokenSupport
  function removeTokenSupport(address tokenAddress) external override onlyOwner {
    _removeTokenSupport(tokenAddress);
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
    if (!_isTokenSupported(params.token)) revert TokenSupport__NotFound(params.token);

    // Bank must also support the token — lend deposits are swept there on funding
    // and repayments are routed through Bank. Validating here prevents offers that
    // would fail at fund or repay time due to Bank token mismatch.
    address bankAddress = _getBankAddress();
    if (!IBank(bankAddress).isTokenSupported(params.token))
      revert FixedReturn__TokenNotSupportedByBank(params.token);

    // The subscription window must still be in the future — the UI already checks
    // this, but the contract shouldn't rely on that alone (e.g. a direct call, a
    // stale client clock, or a delayed tx would otherwise create an offer that's
    // dead on arrival: lendFunds reverts immediately and refund/accept become
    // callable right away).
    if (params.subscriptionDeadline <= block.timestamp) revert FixedReturn__InvalidDeadline();

    // The loan must mature strictly after the subscription window closes.
    if (params.maturityDate <= params.subscriptionDeadline)
      revert FixedReturn__InvalidMaturityDate();

    if (
      params.fundingAccess == FundingAccess.General &&
      params.isCapEnabled &&
      params.lenderCap > params.fundingTarget
    ) revert FixedReturn__LenderCapExceedsFundingTarget();

    offerId = ++s_totalOfferings;

    s_lendingOffers[offerId] = LendingOffer({
      token: params.token,
      fundingTarget: params.fundingTarget,
      interestRateBps: params.interestRateBps,
      maturityDate: params.maturityDate,
      subscriptionDeadline: params.subscriptionDeadline,
      fundingAccess: params.fundingAccess,
      isCapEnabled: params.isCapEnabled,
      lenderCap: params.lenderCap,
      totalFunded: 0,
      totalRepaidByIssuer: 0,
      state: OfferState.Open
    });

    if (params.fundingAccess == FundingAccess.Whitelist) {
      if (params.whitelistAddrs.length != params.allocations.length)
        revert FixedReturn__WhitelistLengthMismatch();
      uint256 allocatedTotal;
      bool hasUncappedLender;
      for (uint256 i = 0; i < params.whitelistAddrs.length; ++i) {
        // A fresh offerId has never touched this mapping, so a non-zero read here
        // means this address already appeared earlier in this same loop.
        if (s_lenderAllocation[offerId][params.whitelistAddrs[i]] != 0)
          revert FixedReturn__DuplicateWhitelistAddress();
        s_lenderAllocation[offerId][params.whitelistAddrs[i]] = params.allocations[i];
        if (params.allocations[i] == UNCAPPED_ALLOCATION) {
          hasUncappedLender = true;
        } else {
          allocatedTotal += params.allocations[i];
        }
      }
      // Summing above the target is fine — a deliberate buffer against a whitelisted
      // lender who ends up not depositing (or not depositing their full allocation).
      // Actual deposits stay bounded regardless by lendFunds' own FundingTargetReached
      // check. An uncapped lender can always absorb whatever the capped lenders don't,
      // so the offer is unconditionally fundable and this check doesn't apply to it.
      if (!hasUncappedLender && allocatedTotal < params.fundingTarget)
        revert FixedReturn__AllocationSumBelowFundingTarget();
    }

    emit LendingOfferCreated({
      offerId: offerId,
      token: params.token,
      fundingTarget: params.fundingTarget,
      interestRateBps: params.interestRateBps,
      subscriptionDeadline: params.subscriptionDeadline,
      fundingAccess: params.fundingAccess
    });
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
    if (amount == 0) revert FixedReturn__ZeroAmount();

    LendingOffer storage offer = s_lendingOffers[offerId];

    if (offer.state != OfferState.Open) revert FixedReturn__OfferNotOpen();
    if (block.timestamp > offer.subscriptionDeadline) revert FixedReturn__OfferNotOpen();

    if (offer.fundingAccess == FundingAccess.Whitelist) {
      uint256 allocation = s_lenderAllocation[offerId][msg.sender];
      if (allocation == 0) revert FixedReturn__NotWhitelisted();
      if (allocation != UNCAPPED_ALLOCATION) {
        uint256 remainingAllocation = allocation - s_lenderDeposits[offerId][msg.sender];
        if (amount > remainingAllocation) revert FixedReturn__DepositExceedsAllocation();
      }
    } else if (offer.isCapEnabled) {
      if (s_lenderDeposits[offerId][msg.sender] + amount > offer.lenderCap)
        revert FixedReturn__DepositExceedsLenderCap();
    }

    if (amount > offer.fundingTarget - offer.totalFunded)
      revert FixedReturn__FundingTargetReached();

    // Effects
    s_lenderDeposits[offerId][msg.sender] += amount;
    offer.totalFunded += amount;

    if (!s_hasDeposited[offerId][msg.sender]) {
      s_hasDeposited[offerId][msg.sender] = true;
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
  // Issuer — refund all lenders (deadline missed)
  // ────────────────────────────────────────────────────

  /**
   * @notice Once an offer's subscription deadline has passed without reaching its
   *         funding target, pushes every lender's principal back in one transaction.
   * @dev Eligibility is a plain date check against the still-Open offer — there is no
   *      separate "mark refundable" step first, mirroring how repayLenders itself
   *      checks state directly rather than requiring a prior transition call.
   *      Only reachable from Open — a Funded offer has already succeeded and moves on
   *      to repayment instead, never refunding. Missing the deadline doesn't refund
   *      automatically either: the issuer must call this.
   * @dev Unbounded loop over s_offerLenders[offerId], same tradeoff as repayLenders — a
   *      lender whose token receipt reverts blocks everyone else in this call, and
   *      because the state flip below shares the same transaction, a revert here also
   *      undoes it, leaving the offer callable again once unblocked. Acceptable at
   *      current scale (matches repayLenders' own accepted risk).
   */
  function refundLenders(uint256 offerId) external onlyOwner nonReentrant {
    LendingOffer storage offer = s_lendingOffers[offerId];
    if (offer.state != OfferState.Open) revert FixedReturn__OfferNotOpen();
    if (block.timestamp <= offer.subscriptionDeadline) revert FixedReturn__DeadlineNotPassed();

    offer.state = OfferState.Refundable;
    emit LendingOfferRefundable(offerId);

    address[] storage lenders = s_offerLenders[offerId];
    uint256 lenderCount = lenders.length;
    IERC20 token = IERC20(offer.token);
    uint256 totalRefunded;
    for (uint256 i = 0; i < lenderCount; ++i) {
      address lender = lenders[i];
      uint256 amount = s_lenderDeposits[offerId][lender];
      if (amount == 0) continue;

      s_lenderDeposits[offerId][lender] = 0;
      token.safeTransfer(lender, amount);
      totalRefunded += amount;
      emit PrincipalRefunded(offerId, lender, amount);
    }

    emit RefundsDistributed(offerId, totalRefunded);
  }

  // ────────────────────────────────────────────────────
  // Issuer — accept partial funding (deadline missed, keep what was raised)
  // ────────────────────────────────────────────────────

  /**
   * @notice Alternative to refundLenders for a stalled offer (deadline passed, target
   *         not reached): keep whatever has been raised and proceed as if fully funded,
   *         instead of returning it to lenders.
   * @dev Same eligibility window as refundLenders (Open, deadline passed) — the issuer's
   *      two mutually-exclusive options, whichever is called first wins since both
   *      require state == Open. Sweeps the current totalFunded to Bank exactly like the
   *      target-reached branch of lendFunds. repayLenders' obligation math already keys
   *      off totalFunded rather than fundingTarget, so repayment against a partially
   *      funded offer needs no further changes.
   */
  function acceptPartialFunding(uint256 offerId) external onlyOwner nonReentrant {
    LendingOffer storage offer = s_lendingOffers[offerId];
    if (offer.state != OfferState.Open) revert FixedReturn__OfferNotOpen();
    if (block.timestamp <= offer.subscriptionDeadline) revert FixedReturn__DeadlineNotPassed();
    if (offer.totalFunded == 0) revert FixedReturn__NoFundsRaised();

    offer.state = OfferState.Funded;
    emit PartialFundingAccepted(offerId, offer.totalFunded, offer.fundingTarget);
    emit LendingOfferFunded(offerId);

    address bankAddress = _getBankAddress();
    IERC20(offer.token).safeTransfer(bankAddress, offer.totalFunded);
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
    if (amount == 0) revert FixedReturn__ZeroAmount();

    LendingOffer storage offer = s_lendingOffers[offerId];
    if (offer.state != OfferState.Funded && offer.state != OfferState.Repaying)
      revert FixedReturn__OfferNotFunded();

    // Repayment ceiling — prevent overpayment beyond total lender entitlement.
    uint256 totalObligation = offer.totalFunded +
      (offer.totalFunded * offer.interestRateBps) /
      10_000;
    if (offer.totalRepaidByIssuer + amount > totalObligation)
      revert FixedReturn__ExceedsRepaymentObligation();

    offer.state = OfferState.Repaying;
    offer.totalRepaidByIssuer += amount;

    // Cumulative distribution: each lender's share = their cumulative entitlement
    // (based on totalRepaidByIssuer) minus what they have already received.
    // The final lender absorbs any rounding remainder at the cumulative level,
    // so proportions hold regardless of how the issuer partitions installments.
    address[] storage lenders = s_offerLenders[offerId];
    uint256 lenderCount = lenders.length;
    uint256 totalRepaid = offer.totalRepaidByIssuer;
    uint256 cumulativeForNonLast = 0;

    unchecked {
      for (uint256 i = 0; i < lenderCount; ++i) {
        address lender = lenders[i];
        uint256 cumulativeEntitlement;
        if (i + 1 == lenderCount) {
          cumulativeEntitlement = totalRepaid - cumulativeForNonLast;
        } else {
          cumulativeEntitlement =
            (totalRepaid * s_lenderDeposits[offerId][lender]) /
            offer.totalFunded;
          cumulativeForNonLast += cumulativeEntitlement;
        }
        uint256 alreadyPaid = s_totalPaidToLender[offerId][lender];
        uint256 share = cumulativeEntitlement > alreadyPaid
          ? cumulativeEntitlement - alreadyPaid
          : 0;
        if (share > 0) {
          s_totalPaidToLender[offerId][lender] = cumulativeEntitlement;
          IERC20(offer.token).safeTransfer(lender, share);
          emit LenderRepaid(offerId, lender, share);
        }
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
    uint256 lenderDeposit = s_lenderDeposits[offerId][lender];
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

  /// @notice Total number of offers ever created (also the highest offer id).
  function getTotalOfferings() external view returns (uint256) {
    return s_totalOfferings;
  }

  /// @notice Cumulative amount a lender has deposited into an offer (principal only).
  function getLenderDeposits(uint256 offerId, address lender) external view returns (uint256) {
    return s_lenderDeposits[offerId][lender];
  }

  /// @notice Max amount a lender may deposit into a Whitelist-mode offer.
  function getLenderAllocation(uint256 offerId, address lender) external view returns (uint256) {
    return s_lenderAllocation[offerId][lender];
  }

  /// @notice Whether a lender is already recorded in the offer's lender list.
  function getHasDeposited(uint256 offerId, address lender) external view returns (bool) {
    return s_hasDeposited[offerId][lender];
  }

  /// @notice Cumulative tokens already forwarded to a lender across all repayments.
  function getTotalPaidToLender(uint256 offerId, address lender) external view returns (uint256) {
    return s_totalPaidToLender[offerId][lender];
  }

  /// @notice Address of the Officer contract that deployed this proxy.
  function getOfficerAddress() external view returns (address) {
    return s_officerAddress;
  }

  /// @notice Current contract version, per semver.
  function version() public pure returns (string memory) {
    return "3.0.0";
  }

  /// @dev Resolves Bank via Officer. Reverts if not found.
  function _getBankAddress() internal view returns (address) {
    address bankAddress = IOfficer(s_officerAddress).findDeployedContract("Bank");
    if (bankAddress == address(0)) revert FixedReturn__BankContractNotFound();
    return bankAddress;
  }
}
