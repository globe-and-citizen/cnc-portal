// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import '@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol';
import '@openzeppelin/contracts-upgradeable/utils/ReentrancyGuardUpgradeable.sol';
import '@openzeppelin/contracts/token/ERC20/IERC20.sol';
import '@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol';
import './base/TokenSupport.sol';

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
 *  Repayment model
 *  ───────────────
 *  Funded/Repaying — issuer calls repayLenders(amount); the amount is immediately
 *                    pushed proportionally to every lender, in the same transaction.
 *                    Can be called multiple times as installments.
 *  Refundable      — each lender individually calls claimRefund() to pull their
 *                    principal back. Only reachable when the funding target was
 *                    not met by the subscription deadline.
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
    uint256 totalRepaidByIssuer; // cumulative issuer repayments
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
  mapping(uint256 => LendingOffer) public lendingOffers;

  /// @dev offerId => lender => cumulative amount that lender has deposited so far.
  ///      This is principal only; it is never decremented on repayment (repayment
  ///      pays the lender directly, it doesn't reduce their recorded contribution),
  ///      and is the basis for both the per-lender cap/allocation checks and the
  ///      proportional repayment split in repayLenders.
  mapping(uint256 => mapping(address => uint256)) public lenderDeposits;

  /// @dev offerId => lender => max amount that lender may deposit. Only meaningful
  ///      for Whitelist-mode offers; zero means "not whitelisted for this offer".
  mapping(uint256 => mapping(address => uint256)) public lenderAllocation;

  /// @dev offerId => addresses that have deposited at least once, in deposit order.
  ///      Drives the proportional payout loop in repayLenders — every entry here
  ///      gets a share of each repayment, so this list must never contain duplicates
  ///      (guarded by hasDeposited below) or grow unboundedly large for a single offer.
  mapping(uint256 => address[]) private _offerLenders;

  /// @dev offerId => lender => whether they're already recorded in _offerLenders,
  ///      so a lender's second/third deposit doesn't push a duplicate entry.
  mapping(uint256 => mapping(address => bool)) public hasDeposited;

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

  /// @notice Emitted when an offer's funding target is reached.
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

  /// @custom:oz-upgrades-unsafe-allow constructor
  constructor() {
    _disableInitializers();
  }

  /**
   * @notice Initializes the FixedReturn contract with its owner.
   * @dev This function replaces the constructor for upgradeable contracts. Called by
   *      Officer at proxy-creation time (see FixedReturnBeaconModule); `_owner` is the
   *      team's issuer address, deliberately independent of msg.sender (which is
   *      Officer, not the team owner, when deployed the normal way).
   * @param _owner Address that will become the owner (the team's issuer) of this contract.
   * @custom:security Only callable once due to the initializer modifier.
   */
  function initialize(address _owner) external initializer {
    if (_owner == address(0)) revert ZeroAddress();
    __Ownable_init(_owner);
    __ReentrancyGuard_init();
  }

  /// @notice Current contract version, per semver.
  function version() external pure returns (string memory) {
    return '1.0.0';
  }

  // ────────────────────────────────────────────────────
  // Token allowlist (TokenSupport overrides — owner-gated)
  // ────────────────────────────────────────────────────

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
    // The deposit token must already be on this team's allowlist (added via
    // addTokenSupport) — an offer can't be created in a token the team hasn't
    // explicitly opted into accepting.
    if (!_isTokenSupported(params.token)) revert TokenSupportNotFound(params.token);

    // The subscription window must close on or before the loan's start date — lenders
    // can't still be joining after the loan has nominally started.
    if (params.subscriptionDeadline > params.startDate) revert InvalidDeadline();

    // termDuration is purely informational (see LendingOffer.termDuration) but is
    // still sanity-bounded per unit so the UI can't be fed a nonsensical term length.
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

    // The per-lender cap only makes sense in General mode (in Whitelist mode each
    // lender's own allocation already acts as their personal cap) — and a cap larger
    // than the whole funding target is meaningless, so reject it outright.
    if (
      params.fundingAccess == FundingAccess.General &&
      params.isCapEnabled &&
      params.lenderCap > params.fundingTarget
    ) {
      revert LenderCapExceedsFundingTarget();
    }

    // Offer ids are 1-based and sequential; totalOfferings doubles as the id counter.
    offerId = ++totalOfferings;

    lendingOffers[offerId] = LendingOffer({
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

    // Whitelist mode: record each lender's personal allocation up front. The sum of
    // all allocations is only required to stay within the funding target — it's fine
    // for it to fall short (the offer just won't be fully fundable by the whitelist
    // alone), but it can never promise more than the offer is actually raising.
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
   * @dev Checks → effects → interaction ordering throughout: every revert condition is
   *      evaluated, then all state is updated, and only then is the token actually
   *      pulled from the caller — so a malicious token's transferFrom callback can
   *      never observe a half-updated offer (the shared nonReentrant lock blocks
   *      cross-function reentry too, but this ordering is the belt-and-suspenders
   *      default regardless).
   */
  function lendFunds(uint256 offerId, uint256 amount) external nonReentrant {
    if (amount == 0) revert ZeroAmount();

    LendingOffer storage offer = lendingOffers[offerId];

    if (offer.state != OfferState.Open) revert OfferNotOpen();
    if (block.timestamp > offer.subscriptionDeadline) revert OfferNotOpen();

    if (offer.fundingAccess == FundingAccess.Whitelist) {
      // Allocation is this lender's personal cap in Whitelist mode — the offer-level
      // lenderCap field is not consulted at all here.
      if (lenderAllocation[offerId][msg.sender] == 0) revert NotWhitelisted();
      uint256 remainingAllocation = lenderAllocation[offerId][msg.sender] -
        lenderDeposits[offerId][msg.sender];
      if (amount > remainingAllocation) revert DepositExceedsAllocation();
    } else if (offer.isCapEnabled) {
      // General mode with a cap enabled — limit this lender's cumulative deposit.
      if (lenderDeposits[offerId][msg.sender] + amount > offer.lenderCap) {
        revert DepositExceedsLenderCap();
      }
    }

    // Hard cap at the funding target: a single deposit that would overshoot the
    // remaining room is rejected outright rather than partially accepted — simpler
    // to reason about than silently truncating the lender's intended amount.
    if (amount > offer.fundingTarget - offer.totalFunded) revert FundingTargetReached();

    lenderDeposits[offerId][msg.sender] += amount;
    offer.totalFunded += amount;

    // Only add this lender to the payout list once — repeated deposits must not
    // create duplicate entries, since every entry gets paid in repayLenders.
    if (!hasDeposited[offerId][msg.sender]) {
      hasDeposited[offerId][msg.sender] = true;
      _offerLenders[offerId].push(msg.sender);
    }

    // Auto-close to new deposits the instant the target is hit — no overfunding.
    bool nowFunded = offer.totalFunded >= offer.fundingTarget;
    if (nowFunded) {
      offer.state = OfferState.Funded;
    }

    IERC20(offer.token).safeTransferFrom(msg.sender, address(this), amount);

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
    LendingOffer storage offer = lendingOffers[offerId];
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
   * @dev Principal only, no interest — the loan never actually started, so there's
   *      nothing to compensate beyond returning what was deposited. Deposit is zeroed
   *      before the transfer (effects before interaction) so a second call from the
   *      same lender has nothing left to claim.
   */
  function claimRefund(uint256 offerId) external nonReentrant {
    LendingOffer storage offer = lendingOffers[offerId];
    if (offer.state != OfferState.Refundable) revert OfferNotRefundable();

    uint256 amount = lenderDeposits[offerId][msg.sender];
    if (amount == 0) revert NothingToRefund();

    lenderDeposits[offerId][msg.sender] = 0;
    IERC20(offer.token).safeTransfer(msg.sender, amount);

    emit PrincipalRefunded(offerId, msg.sender, amount);
  }

  // ────────────────────────────────────────────────────
  // Issuer — repay lenders (push, can be installments)
  // ────────────────────────────────────────────────────

  /**
   * @notice Issuer deposits an amount which is immediately pushed proportionally to
   *         all lenders in the same transaction. Can be called multiple times as
   *         installments.
   * @dev Proportional, not selective: there is no per-lender repayment. Each
   *      installment splits `amount` across every lender by their share of
   *      totalFunded, so every lender's repaid ratio moves together — a lender can
   *      never be repaid out of proportion to (ahead of or behind) the others.
   * @dev Unbounded loop over _offerLenders[offerId] — a lender whose token transfer
   *      reverts (e.g. a non-receiving contract address) blocks repayment to everyone
   *      else in the same offer. Acceptable for the current lender-count scale; revisit
   *      with a pull-based claim if offers can attract a large/unbounded lender count.
   */
  function repayLenders(uint256 offerId, uint256 amount) external onlyOwner nonReentrant {
    if (amount == 0) revert ZeroAmount();

    LendingOffer storage offer = lendingOffers[offerId];
    if (offer.state != OfferState.Funded && offer.state != OfferState.Repaying) {
      revert OfferNotFunded();
    }

    // First repayment moves the offer into Repaying; subsequent installments just
    // accumulate against it.
    offer.state = OfferState.Repaying;
    offer.totalRepaidByIssuer += amount;

    IERC20(offer.token).safeTransferFrom(msg.sender, address(this), amount);

    // Split this installment across every lender by their share of total principal
    // raised — e.g. a lender who funded 60% of the offer receives 60% of `amount`.
    address[] storage lenders = _offerLenders[offerId];
    for (uint256 i = 0; i < lenders.length; ++i) {
      address lender = lenders[i];
      uint256 share = (amount * lenderDeposits[offerId][lender]) / offer.totalFunded;
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

  /// @notice Total amount a lender is entitled to receive (their deposit + flat interest).
  /// @dev Flat rate over the whole term, not annualized — see LendingOffer.interestRateBps.
  function totalEntitlementOf(uint256 offerId, address lender) external view returns (uint256) {
    uint256 lenderDeposit = lenderDeposits[offerId][lender];
    return lenderDeposit + (lenderDeposit * lendingOffers[offerId].interestRateBps) / 10_000;
  }

  /// @notice All lender addresses that have deposited into a given offer.
  function getOfferLenders(uint256 offerId) external view returns (address[] memory) {
    return _offerLenders[offerId];
  }

  /*//////////////////////////////////////////////////////////////
                          UPGRADE STORAGE GAP
    //////////////////////////////////////////////////////////////*/

  uint256[50] private __gap;
}
