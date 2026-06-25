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
 *  Whitelist — lenderAllocation controls max deposit per lender (cap ignored)
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
    address[] whitelistAddrs;
    uint256[] allocations;
  }

  // ────────────────────────────────────────────────────
  // Storage
  // ────────────────────────────────────────────────────

  uint256 public totalOfferings;

  mapping(uint256 => LendingOffer) public lendingOffers;
  mapping(uint256 => mapping(address => uint256)) public lenderDeposits;
  mapping(uint256 => mapping(address => uint256)) public lenderAllocation;
  mapping(uint256 => address[]) private _offerLenders;
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
   * @dev This function replaces the constructor for upgradeable contracts.
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
   */
  function createLendingOffer(
    CreateOfferParams calldata p
  ) external onlyOwner returns (uint256 offerId) {
    if (!_isTokenSupported(p.token)) revert TokenSupportNotFound(p.token);
    if (p.subscriptionDeadline > p.startDate) revert InvalidDeadline();
    if (p.termUnit == TermUnit.Days && (p.termDuration == 0 || p.termDuration > 365)) {
      revert InvalidTermDuration();
    }
    if (p.termUnit == TermUnit.Months && (p.termDuration == 0 || p.termDuration > 120)) {
      revert InvalidTermDuration();
    }
    if (p.termUnit == TermUnit.Years && (p.termDuration == 0 || p.termDuration > 30)) {
      revert InvalidTermDuration();
    }

    // cap only relevant in General mode
    if (
      p.fundingAccess == FundingAccess.General && p.isCapEnabled && p.lenderCap > p.fundingTarget
    ) {
      revert LenderCapExceedsFundingTarget();
    }

    offerId = ++totalOfferings;

    lendingOffers[offerId] = LendingOffer({
      token: p.token,
      fundingTarget: p.fundingTarget,
      interestRateBps: p.interestRateBps,
      termDuration: p.termDuration,
      termUnit: p.termUnit,
      startDate: p.startDate,
      subscriptionDeadline: p.subscriptionDeadline,
      fundingAccess: p.fundingAccess,
      isCapEnabled: p.isCapEnabled,
      lenderCap: p.lenderCap,
      totalFunded: 0,
      totalRepaidByIssuer: 0,
      state: OfferState.Open
    });

    // whitelist — allocation IS the cap per lender; only enforce that the sum of all
    // allocations stays within the funding target
    if (p.fundingAccess == FundingAccess.Whitelist) {
      if (p.whitelistAddrs.length != p.allocations.length) revert WhitelistLengthMismatch();
      uint256 sum;
      for (uint256 i = 0; i < p.whitelistAddrs.length; ++i) {
        lenderAllocation[offerId][p.whitelistAddrs[i]] = p.allocations[i];
        sum += p.allocations[i];
      }
      if (sum > p.fundingTarget) revert AllocationSumExceedsFundingTarget();
    }

    emit LendingOfferCreated(
      offerId,
      p.token,
      p.fundingTarget,
      p.interestRateBps,
      p.startDate,
      p.subscriptionDeadline,
      p.fundingAccess
    );
  }

  // ────────────────────────────────────────────────────
  // Lender — lend funds
  // ────────────────────────────────────────────────────

  function lendFunds(uint256 offerId, uint256 amount) external nonReentrant {
    if (amount == 0) revert ZeroAmount();

    LendingOffer storage o = lendingOffers[offerId];

    if (o.state != OfferState.Open) revert OfferNotOpen();
    if (block.timestamp > o.subscriptionDeadline) revert OfferNotOpen();

    if (o.fundingAccess == FundingAccess.Whitelist) {
      // allocation controls the deposit limit — lenderCap ignored
      if (lenderAllocation[offerId][msg.sender] == 0) revert NotWhitelisted();
      uint256 remainingAllocation = lenderAllocation[offerId][msg.sender] -
        lenderDeposits[offerId][msg.sender];
      if (amount > remainingAllocation) revert DepositExceedsAllocation();
    } else if (o.isCapEnabled) {
      // General mode — lenderCap controls the deposit limit
      if (lenderDeposits[offerId][msg.sender] + amount > o.lenderCap) {
        revert DepositExceedsLenderCap();
      }
    }

    // hard cap — reject entirely if deposit would overflow the funding target
    if (amount > o.fundingTarget - o.totalFunded) revert FundingTargetReached();

    // effects before interaction
    lenderDeposits[offerId][msg.sender] += amount;
    o.totalFunded += amount;

    if (!hasDeposited[offerId][msg.sender]) {
      hasDeposited[offerId][msg.sender] = true;
      _offerLenders[offerId].push(msg.sender);
    }

    bool nowFunded = o.totalFunded >= o.fundingTarget;
    if (nowFunded) {
      o.state = OfferState.Funded;
    }

    IERC20(o.token).safeTransferFrom(msg.sender, address(this), amount);

    emit FundsLent(offerId, msg.sender, amount);
    if (nowFunded) {
      emit LendingOfferFunded(offerId);
    }
  }

  // ────────────────────────────────────────────────────
  // Issuer — mark refundable (deadline missed)
  // ────────────────────────────────────────────────────

  /// @notice Flip an offer to Refundable once its subscription deadline has passed
  ///         without reaching its funding target.
  function markAsRefundable(uint256 offerId) external onlyOwner {
    LendingOffer storage o = lendingOffers[offerId];
    if (o.state != OfferState.Open) revert OfferNotOpen();
    if (block.timestamp <= o.subscriptionDeadline) revert DeadlineNotPassed();
    o.state = OfferState.Refundable;
    emit LendingOfferRefundable(offerId);
  }

  // ────────────────────────────────────────────────────
  // Lender — claim refund (only if Refundable)
  // ────────────────────────────────────────────────────

  function claimRefund(uint256 offerId) external nonReentrant {
    LendingOffer storage o = lendingOffers[offerId];
    if (o.state != OfferState.Refundable) revert OfferNotRefundable();

    uint256 amount = lenderDeposits[offerId][msg.sender];
    if (amount == 0) revert NothingToRefund();

    lenderDeposits[offerId][msg.sender] = 0;
    IERC20(o.token).safeTransfer(msg.sender, amount);

    emit PrincipalRefunded(offerId, msg.sender, amount);
  }

  // ────────────────────────────────────────────────────
  // Issuer — repay lenders (push, can be installments)
  // ────────────────────────────────────────────────────

  /**
   * @notice Issuer deposits an amount which is immediately pushed proportionally to
   *         all lenders in the same transaction. Can be called multiple times as
   *         installments.
   * @dev Unbounded loop over _offerLenders[offerId] — a lender whose token transfer
   *      reverts (e.g. a non-receiving contract address) blocks repayment to everyone
   *      else in the same offer. Acceptable for the current lender-count scale; revisit
   *      with a pull-based claim if offers can attract a large/unbounded lender count.
   */
  function repayLenders(uint256 offerId, uint256 amount) external onlyOwner nonReentrant {
    if (amount == 0) revert ZeroAmount();

    LendingOffer storage o = lendingOffers[offerId];
    if (o.state != OfferState.Funded && o.state != OfferState.Repaying) {
      revert OfferNotFunded();
    }

    o.state = OfferState.Repaying;
    o.totalRepaidByIssuer += amount;

    IERC20(o.token).safeTransferFrom(msg.sender, address(this), amount);

    // push proportional share to each lender immediately
    address[] storage lenders = _offerLenders[offerId];
    for (uint256 i = 0; i < lenders.length; ++i) {
      address lender = lenders[i];
      uint256 share = (amount * lenderDeposits[offerId][lender]) / o.totalFunded;
      if (share > 0) {
        IERC20(o.token).safeTransfer(lender, share);
        emit LenderRepaid(offerId, lender, share);
      }
    }

    emit RepaymentDistributed(offerId, amount);
  }

  // ────────────────────────────────────────────────────
  // Views
  // ────────────────────────────────────────────────────

  /// @notice Total amount a lender is entitled to receive (their deposit + flat interest).
  function totalEntitlementOf(uint256 offerId, address lender) external view returns (uint256) {
    uint256 dep = lenderDeposits[offerId][lender];
    return dep + (dep * lendingOffers[offerId].interestRateBps) / 10_000;
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
