// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "./IOwnable.sol";
import "./ITokenSupport.sol";

/**
 * @title IFixedReturn
 * @notice Complete interface for the FixedReturn contract
 * @dev Single source of truth for FixedReturn contract interactions
 * @dev Derived from: contracts/FixedReturn.sol
 * Used by: Bank (to resolve the offer's token and trigger repayment distribution)
 */
interface IFixedReturn is IOwnable, ITokenSupport {
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

  /// @dev Grouped to avoid "stack too deep" in createLendingOffer.
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

  // ============ Events ============

  /// @notice Emitted when a new lending offer is created
  event LendingOfferCreated(
    uint256 indexed offerId,
    address indexed token,
    uint256 fundingTarget,
    uint256 interestRateBps,
    uint256 startDate,
    uint256 subscriptionDeadline,
    FundingAccess fundingAccess
  );

  /// @notice Emitted when a lender deposits funds into an offer
  event FundsLent(uint256 indexed offerId, address indexed lender, uint256 amount);

  /// @notice Emitted when an offer's funding target is reached
  event LendingOfferFunded(uint256 indexed offerId);

  /// @notice Emitted when an offer is flipped to refundable after a missed deadline
  event LendingOfferRefundable(uint256 indexed offerId);

  /// @notice Emitted when a lender claims back their principal from a refundable offer
  event PrincipalRefunded(uint256 indexed offerId, address indexed lender, uint256 amount);

  /// @notice Emitted once per repayLenders call, for the total amount distributed
  event RepaymentDistributed(uint256 indexed offerId, uint256 totalAmount);

  /// @notice Emitted per lender, for their proportional share of a repayment
  event LenderRepaid(uint256 indexed offerId, address indexed lender, uint256 amount);

  // ============ Issuer ============

  /// @notice Create a new fixed-rate lending offer
  /// @dev title/description are intentionally not part of this signature — they are
  ///      persisted off-chain by the calling application, linked by the returned offerId
  function createLendingOffer(CreateOfferParams calldata params) external returns (uint256 offerId);

  /// @notice Flip an offer to Refundable once its subscription deadline has passed
  ///         without reaching its funding target
  function markAsRefundable(uint256 offerId) external;

  /// @notice Distributes a repayment installment proportionally to all lenders of the
  ///         offer. Callable only by Bank, which transfers `amount` in immediately
  ///         before calling this; callable multiple times as repayment installments.
  function repayLenders(uint256 offerId, uint256 amount) external;

  // ============ Lender ============

  /// @notice Lend funds into an open offer
  function lendFunds(uint256 offerId, uint256 amount) external;

  /// @notice Claim back principal from a Refundable offer
  function claimRefund(uint256 offerId) external;

  // ============ Views ============

  /// @notice Total amount a lender is entitled to receive (their deposit + flat interest)
  function totalEntitlementOf(uint256 offerId, address lender) external view returns (uint256);

  /// @notice All lender addresses that have deposited into a given offer
  function getOfferLenders(uint256 offerId) external view returns (address[] memory);

  /// @notice Full configuration and funding/repayment state for a given offer
  function getLendingOffer(uint256 offerId) external view returns (LendingOffer memory);

  /// @notice Current contract version, per semver
  function version() external pure returns (string memory);
}
