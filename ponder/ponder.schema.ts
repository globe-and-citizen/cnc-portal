import { index, onchainTable, relations } from "ponder";

// One Officer proxy = one team
export const team = onchainTable(
  "team",
  (t) => ({
    address: t.hex().primaryKey(),
    deployer: t.hex().notNull(),
    blockNumber: t.bigint().notNull(),
    timestamp: t.integer().notNull(),
  }),
  (table) => ({
    deployerIdx: index("team_deployer_index").on(table.deployer),
  }),
);

// Sub-contracts deployed by each Officer proxy
export const teamContract = onchainTable(
  "team_contract",
  (t) => ({
    id: t.text().primaryKey(), // `${officerAddress}-${contractType}`
    teamAddress: t.hex().notNull(),
    contractType: t.text().notNull(),
    contractAddress: t.hex().notNull(),
    blockNumber: t.bigint().notNull(),
    timestamp: t.integer().notNull(),
  }),
  (table) => ({
    teamAddressIdx: index("team_contract_team_index").on(table.teamAddress),
    contractAddressIdx: index("team_contract_address_index").on(table.contractAddress),
  }),
);

// Bank events
export const bankDeposit = onchainTable(
  "bank_deposit",
  (t) => ({
    id: t.text().primaryKey(), // `${txHash}-${logIndex}`
    contractAddress: t.hex().notNull(),
    depositor: t.hex().notNull(),
    amount: t.bigint().notNull(),
    blockNumber: t.bigint().notNull(),
    timestamp: t.integer().notNull(),
  }),
  (table) => ({
    contractAddressIdx: index("bank_deposit_contract_index").on(table.contractAddress),
    depositorIdx: index("bank_deposit_depositor_index").on(table.depositor),
  }),
);

export const bankTokenDeposit = onchainTable(
  "bank_token_deposit",
  (t) => ({
    id: t.text().primaryKey(),
    contractAddress: t.hex().notNull(),
    depositor: t.hex().notNull(),
    token: t.hex().notNull(),
    amount: t.bigint().notNull(),
    blockNumber: t.bigint().notNull(),
    timestamp: t.integer().notNull(),
  }),
  (table) => ({
    contractAddressIdx: index("bank_token_deposit_contract_index").on(table.contractAddress),
    depositorIdx: index("bank_token_deposit_depositor_index").on(table.depositor),
  }),
);

export const bankTransfer = onchainTable(
  "bank_transfer",
  (t) => ({
    id: t.text().primaryKey(),
    contractAddress: t.hex().notNull(),
    sender: t.hex().notNull(),
    to: t.hex().notNull(),
    amount: t.bigint().notNull(),
    blockNumber: t.bigint().notNull(),
    timestamp: t.integer().notNull(),
  }),
  (table) => ({
    contractAddressIdx: index("bank_transfer_contract_index").on(table.contractAddress),
    senderIdx: index("bank_transfer_sender_index").on(table.sender),
  }),
);

export const bankTokenTransfer = onchainTable(
  "bank_token_transfer",
  (t) => ({
    id: t.text().primaryKey(),
    contractAddress: t.hex().notNull(),
    sender: t.hex().notNull(),
    to: t.hex().notNull(),
    token: t.hex().notNull(),
    amount: t.bigint().notNull(),
    blockNumber: t.bigint().notNull(),
    timestamp: t.integer().notNull(),
  }),
  (table) => ({
    contractAddressIdx: index("bank_token_transfer_contract_index").on(table.contractAddress),
    senderIdx: index("bank_token_transfer_sender_index").on(table.sender),
  }),
);

export const bankFeePaid = onchainTable(
  "bank_fee_paid",
  (t) => ({
    id: t.text().primaryKey(),
    contractAddress: t.hex().notNull(),
    feeCollector: t.hex().notNull(),
    token: t.hex(),
    amount: t.bigint().notNull(),
    blockNumber: t.bigint().notNull(),
    timestamp: t.integer().notNull(),
  }),
  (table) => ({
    contractAddressIdx: index("bank_fee_paid_contract_index").on(table.contractAddress),
    tokenIdx: index("bank_fee_paid_token_index").on(table.token),
  }),
);

export const bankDividendDistributionTriggered = onchainTable(
  "bank_dividend_distribution_triggered",
  (t) => ({
    id: t.text().primaryKey(),
    contractAddress: t.hex().notNull(),
    investor: t.hex().notNull(),
    token: t.hex().notNull(),
    totalAmount: t.bigint().notNull(),
    blockNumber: t.bigint().notNull(),
    timestamp: t.integer().notNull(),
  }),
  (table) => ({
    contractAddressIdx: index("bank_dividend_distribution_triggered_contract_index").on(
      table.contractAddress,
    ),
  }),
);

export const bankTokenSupportAdded = onchainTable(
  "bank_token_support_added",
  (t) => ({
    id: t.text().primaryKey(),
    contractAddress: t.hex().notNull(),
    tokenAddress: t.hex().notNull(),
    blockNumber: t.bigint().notNull(),
    timestamp: t.integer().notNull(),
  }),
  (table) => ({
    contractAddressIdx: index("bank_token_support_added_contract_index").on(table.contractAddress),
    tokenAddressIdx: index("bank_token_support_added_token_index").on(table.tokenAddress),
  }),
);

export const bankTokenSupportRemoved = onchainTable(
  "bank_token_support_removed",
  (t) => ({
    id: t.text().primaryKey(),
    contractAddress: t.hex().notNull(),
    tokenAddress: t.hex().notNull(),
    blockNumber: t.bigint().notNull(),
    timestamp: t.integer().notNull(),
  }),
  (table) => ({
    contractAddressIdx: index("bank_token_support_removed_contract_index").on(table.contractAddress),
    tokenAddressIdx: index("bank_token_support_removed_token_index").on(table.tokenAddress),
  }),
);

// Elections events
export const election = onchainTable(
  "election",
  (t) => ({
    id: t.text().primaryKey(), // `${contractAddress}-${electionId}`
    contractAddress: t.hex().notNull(),
    electionId: t.bigint().notNull(),
    title: t.text().notNull(),
    createdBy: t.hex().notNull(),
    startDate: t.bigint().notNull(),
    endDate: t.bigint().notNull(),
    seatCount: t.bigint().notNull(),
    blockNumber: t.bigint().notNull(),
    timestamp: t.integer().notNull(),
  }),
  (table) => ({
    contractIdx: index("election_contract_index").on(table.contractAddress),
    createdByIdx: index("election_created_by_index").on(table.createdBy),
  }),
);

export const electionVote = onchainTable(
  "election_vote",
  (t) => ({
    id: t.text().primaryKey(), // `${contractAddress}-${electionId}-${voter}-${candidate}`
    contractAddress: t.hex().notNull(),
    electionId: t.bigint().notNull(),
    voter: t.hex().notNull(),
    candidate: t.hex().notNull(),
    blockNumber: t.bigint().notNull(),
    timestamp: t.integer().notNull(),
  }),
  (table) => ({
    contractAddressIdx: index("election_vote_contract_index").on(table.contractAddress),
    voterIdx: index("election_vote_voter_index").on(table.voter),
  }),
);

export const electionResult = onchainTable(
  "election_result",
  (t) => ({
    id: t.text().primaryKey(), // `${contractAddress}-${electionId}`
    contractAddress: t.hex().notNull(),
    electionId: t.bigint().notNull(),
    winners: t.text().notNull(), // JSON-serialized address[]
    blockNumber: t.bigint().notNull(),
    timestamp: t.integer().notNull(),
  }),
  (table) => ({
    contractAddressIdx: index("election_result_contract_index").on(table.contractAddress),
  }),
);

// Proposals events
export const proposal = onchainTable(
  "proposal",
  (t) => ({
    id: t.text().primaryKey(), // `${contractAddress}-${proposalId}`
    contractAddress: t.hex().notNull(),
    proposalId: t.bigint().notNull(),
    title: t.text().notNull(),
    creator: t.hex().notNull(),
    startDate: t.bigint().notNull(),
    endDate: t.bigint().notNull(),
    blockNumber: t.bigint().notNull(),
    timestamp: t.integer().notNull(),
  }),
  (table) => ({
    contractIdx: index("proposal_contract_index").on(table.contractAddress),
    creatorIdx: index("proposal_creator_index").on(table.creator),
  }),
);

export const proposalVote = onchainTable(
  "proposal_vote",
  (t) => ({
    id: t.text().primaryKey(), // `${contractAddress}-${proposalId}-${voter}`
    contractAddress: t.hex().notNull(),
    proposalId: t.bigint().notNull(),
    voter: t.hex().notNull(),
    vote: t.integer().notNull(), // VoteOption enum (uint8)
    voteTimestamp: t.bigint().notNull(),
    blockNumber: t.bigint().notNull(),
    timestamp: t.integer().notNull(),
  }),
  (table) => ({
    contractAddressIdx: index("proposal_vote_contract_index").on(table.contractAddress),
    voterIdx: index("proposal_vote_voter_index").on(table.voter),
  }),
);

export const proposalTally = onchainTable(
  "proposal_tally",
  (t) => ({
    id: t.text().primaryKey(), // `${contractAddress}-${proposalId}`
    contractAddress: t.hex().notNull(),
    proposalId: t.bigint().notNull(),
    state: t.integer().notNull(), // ProposalState enum (uint8)
    yesCount: t.bigint().notNull(),
    noCount: t.bigint().notNull(),
    abstainCount: t.bigint().notNull(),
    blockNumber: t.bigint().notNull(),
    timestamp: t.integer().notNull(),
  }),
  (table) => ({
    contractAddressIdx: index("proposal_tally_contract_index").on(table.contractAddress),
  }),
);

// BoardOfDirectors events
export const boardAction = onchainTable(
  "board_action",
  (t) => ({
    id: t.text().primaryKey(), // `${contractAddress}-${actionId}`
    contractAddress: t.hex().notNull(),
    actionId: t.bigint().notNull(),
    target: t.hex().notNull(),
    description: t.text().notNull(),
    data: t.text().notNull(), // hex-encoded bytes
    executed: t.boolean().notNull().default(false),
    blockNumber: t.bigint().notNull(),
    timestamp: t.integer().notNull(),
  }),
  (table) => ({
    contractIdx: index("board_action_contract_index").on(table.contractAddress),
    executedIdx: index("board_action_executed_index").on(table.contractAddress, table.executed),
  }),
);

export const boardApproval = onchainTable(
  "board_approval",
  (t) => ({
    id: t.text().primaryKey(), // `${contractAddress}-${actionId}-${approver}`
    contractAddress: t.hex().notNull(),
    actionId: t.bigint().notNull(),
    approver: t.hex().notNull(),
    revoked: t.boolean().notNull().default(false),
    blockNumber: t.bigint().notNull(),
    timestamp: t.integer().notNull(),
  }),
  (table) => ({
    contractAddressIdx: index("board_approval_contract_index").on(table.contractAddress),
    approverIdx: index("board_approval_approver_index").on(table.approver),
  }),
);

export const boardDirectorsChanged = onchainTable(
  "board_directors_changed",
  (t) => ({
    id: t.text().primaryKey(),
    contractAddress: t.hex().notNull(),
    members: t.text().notNull(),
    blockNumber: t.bigint().notNull(),
    timestamp: t.integer().notNull(),
  }),
  (table) => ({
    contractAddressIdx: index("board_directors_changed_contract_index").on(table.contractAddress),
  }),
);

export const boardOwnersChanged = onchainTable(
  "board_owners_changed",
  (t) => ({
    id: t.text().primaryKey(),
    contractAddress: t.hex().notNull(),
    owners: t.text().notNull(),
    blockNumber: t.bigint().notNull(),
    timestamp: t.integer().notNull(),
  }),
  (table) => ({
    contractAddressIdx: index("board_owners_changed_contract_index").on(table.contractAddress),
  }),
);

// InvestorV1 events
export const investorMint = onchainTable(
  "investor_mint",
  (t) => ({
    id: t.text().primaryKey(),
    contractAddress: t.hex().notNull(),
    shareholder: t.hex().notNull(),
    amount: t.bigint().notNull(),
    blockNumber: t.bigint().notNull(),
    timestamp: t.integer().notNull(),
  }),
  (table) => ({
    contractAddressIdx: index("investor_mint_contract_index").on(table.contractAddress),
    shareholderIdx: index("investor_mint_shareholder_index").on(table.shareholder),
  }),
);

export const investorDividendDistributed = onchainTable(
  "investor_dividend_distributed",
  (t) => ({
    id: t.text().primaryKey(),
    contractAddress: t.hex().notNull(),
    distributor: t.hex().notNull(),
    token: t.hex().notNull(),
    totalAmount: t.bigint().notNull(),
    shareholderCount: t.bigint().notNull(),
    blockNumber: t.bigint().notNull(),
    timestamp: t.integer().notNull(),
  }),
  (table) => ({
    contractAddressIdx: index("investor_dividend_distributed_contract_index").on(
      table.contractAddress,
    ),
  }),
);

export const investorDividendPaid = onchainTable(
  "investor_dividend_paid",
  (t) => ({
    id: t.text().primaryKey(),
    contractAddress: t.hex().notNull(),
    shareholder: t.hex().notNull(),
    token: t.hex().notNull(),
    amount: t.bigint().notNull(),
    blockNumber: t.bigint().notNull(),
    timestamp: t.integer().notNull(),
  }),
  (table) => ({
    contractAddressIdx: index("investor_dividend_paid_contract_index").on(table.contractAddress),
    shareholderIdx: index("investor_dividend_paid_shareholder_index").on(table.shareholder),
  }),
);

export const investorDividendPaymentFailed = onchainTable(
  "investor_dividend_payment_failed",
  (t) => ({
    id: t.text().primaryKey(),
    contractAddress: t.hex().notNull(),
    shareholder: t.hex().notNull(),
    token: t.hex().notNull(),
    amount: t.bigint().notNull(),
    reason: t.text().notNull(),
    blockNumber: t.bigint().notNull(),
    timestamp: t.integer().notNull(),
  }),
  (table) => ({
    contractAddressIdx: index("investor_dividend_payment_failed_contract_index").on(
      table.contractAddress,
    ),
    shareholderIdx: index("investor_dividend_payment_failed_shareholder_index").on(
      table.shareholder,
    ),
  }),
);

// CashRemunerationEIP712 events
export const cashRemunerationDeposit = onchainTable(
  "cash_remuneration_deposit",
  (t) => ({
    id: t.text().primaryKey(),
    contractAddress: t.hex().notNull(),
    depositor: t.hex().notNull(),
    amount: t.bigint().notNull(),
    blockNumber: t.bigint().notNull(),
    timestamp: t.integer().notNull(),
  }),
  (table) => ({
    contractAddressIdx: index("cash_remuneration_deposit_contract_index").on(
      table.contractAddress,
    ),
    depositorIdx: index("cash_remuneration_deposit_depositor_index").on(table.depositor),
  }),
);

export const cashRemunerationWithdraw = onchainTable(
  "cash_remuneration_withdraw",
  (t) => ({
    id: t.text().primaryKey(),
    contractAddress: t.hex().notNull(),
    withdrawer: t.hex().notNull(),
    amount: t.bigint().notNull(),
    blockNumber: t.bigint().notNull(),
    timestamp: t.integer().notNull(),
  }),
  (table) => ({
    contractAddressIdx: index("cash_remuneration_withdraw_contract_index").on(
      table.contractAddress,
    ),
    withdrawerIdx: index("cash_remuneration_withdraw_withdrawer_index").on(table.withdrawer),
  }),
);

export const cashRemunerationWithdrawToken = onchainTable(
  "cash_remuneration_withdraw_token",
  (t) => ({
    id: t.text().primaryKey(),
    contractAddress: t.hex().notNull(),
    withdrawer: t.hex().notNull(),
    tokenAddress: t.hex().notNull(),
    amount: t.bigint().notNull(),
    blockNumber: t.bigint().notNull(),
    timestamp: t.integer().notNull(),
  }),
  (table) => ({
    contractAddressIdx: index("cash_remuneration_withdraw_token_contract_index").on(
      table.contractAddress,
    ),
    withdrawerIdx: index("cash_remuneration_withdraw_token_withdrawer_index").on(table.withdrawer),
  }),
);

export const cashRemunerationWageClaim = onchainTable(
  "cash_remuneration_wage_claim",
  (t) => ({
    id: t.text().primaryKey(),
    contractAddress: t.hex().notNull(),
    signatureHash: t.text().notNull(), // bytes32 as hex
    enabled: t.boolean().notNull(),
    blockNumber: t.bigint().notNull(),
    timestamp: t.integer().notNull(),
  }),
  (table) => ({
    contractAddressIdx: index("cash_remuneration_wage_claim_contract_index").on(
      table.contractAddress,
    ),
    enabledIdx: index("cash_remuneration_wage_claim_enabled_index").on(
      table.contractAddress,
      table.enabled,
    ),
  }),
);

export const cashRemunerationOwnerTreasuryWithdrawNative = onchainTable(
  "cash_remuneration_owner_treasury_withdraw_native",
  (t) => ({
    id: t.text().primaryKey(),
    contractAddress: t.hex().notNull(),
    ownerAddress: t.hex().notNull(),
    amount: t.bigint().notNull(),
    blockNumber: t.bigint().notNull(),
    timestamp: t.integer().notNull(),
  }),
  (table) => ({
    contractAddressIdx: index("cash_rem_owner_withdraw_native_contract_index").on(table.contractAddress),
    ownerIdx: index("cash_rem_owner_withdraw_native_owner_index").on(table.ownerAddress),
  }),
);

export const cashRemunerationOwnerTreasuryWithdrawToken = onchainTable(
  "cash_remuneration_owner_treasury_withdraw_token",
  (t) => ({
    id: t.text().primaryKey(),
    contractAddress: t.hex().notNull(),
    ownerAddress: t.hex().notNull(),
    tokenAddress: t.hex().notNull(),
    amount: t.bigint().notNull(),
    blockNumber: t.bigint().notNull(),
    timestamp: t.integer().notNull(),
  }),
  (table) => ({
    contractAddressIdx: index("cash_rem_owner_withdraw_token_contract_index").on(table.contractAddress),
    ownerIdx: index("cash_rem_owner_withdraw_token_owner_index").on(table.ownerAddress),
  }),
);

export const cashRemunerationOfficerUpdated = onchainTable(
  "cash_remuneration_officer_updated",
  (t) => ({
    id: t.text().primaryKey(),
    contractAddress: t.hex().notNull(),
    newOfficerAddress: t.hex().notNull(),
    blockNumber: t.bigint().notNull(),
    timestamp: t.integer().notNull(),
  }),
  (table) => ({
    contractAddressIdx: index("cash_rem_officer_updated_contract_index").on(table.contractAddress),
    officerIdx: index("cash_rem_officer_updated_officer_index").on(table.newOfficerAddress),
  }),
);

export const cashRemunerationTokenSupportAdded = onchainTable(
  "cash_remuneration_token_support_added",
  (t) => ({
    id: t.text().primaryKey(),
    contractAddress: t.hex().notNull(),
    tokenAddress: t.hex().notNull(),
    blockNumber: t.bigint().notNull(),
    timestamp: t.integer().notNull(),
  }),
  (table) => ({
    contractAddressIdx: index("cash_rem_token_support_added_contract_index").on(table.contractAddress),
    tokenIdx: index("cash_rem_token_support_added_token_index").on(table.tokenAddress),
  }),
);

export const cashRemunerationTokenSupportRemoved = onchainTable(
  "cash_remuneration_token_support_removed",
  (t) => ({
    id: t.text().primaryKey(),
    contractAddress: t.hex().notNull(),
    tokenAddress: t.hex().notNull(),
    blockNumber: t.bigint().notNull(),
    timestamp: t.integer().notNull(),
  }),
  (table) => ({
    contractAddressIdx: index("cash_rem_token_support_removed_contract_index").on(table.contractAddress),
    tokenIdx: index("cash_rem_token_support_removed_token_index").on(table.tokenAddress),
  }),
);

// SafeDepositRouter events
export const safeDeposit = onchainTable(
  "safe_deposit",
  (t) => ({
    id: t.text().primaryKey(),
    contractAddress: t.hex().notNull(),
    depositor: t.hex().notNull(),
    token: t.hex().notNull(),
    tokenAmount: t.bigint().notNull(),
    sherAmount: t.bigint().notNull(),
    depositTimestamp: t.bigint().notNull(),
    blockNumber: t.bigint().notNull(),
    timestamp: t.integer().notNull(),
  }),
  (table) => ({
    contractAddressIdx: index("safe_deposit_contract_index").on(table.contractAddress),
    depositorIdx: index("safe_deposit_depositor_index").on(table.depositor),
  }),
);

export const safeDepositsEnabled = onchainTable(
  "safe_deposits_enabled",
  (t) => ({
    id: t.text().primaryKey(),
    contractAddress: t.hex().notNull(),
    enabledBy: t.hex().notNull(),
    blockNumber: t.bigint().notNull(),
    timestamp: t.integer().notNull(),
  }),
  (table) => ({
    contractAddressIdx: index("safe_deposits_enabled_contract_index").on(table.contractAddress),
    enabledByIdx: index("safe_deposits_enabled_by_index").on(table.enabledBy),
  }),
);

export const safeDepositsDisabled = onchainTable(
  "safe_deposits_disabled",
  (t) => ({
    id: t.text().primaryKey(),
    contractAddress: t.hex().notNull(),
    disabledBy: t.hex().notNull(),
    blockNumber: t.bigint().notNull(),
    timestamp: t.integer().notNull(),
  }),
  (table) => ({
    contractAddressIdx: index("safe_deposits_disabled_contract_index").on(table.contractAddress),
    disabledByIdx: index("safe_deposits_disabled_by_index").on(table.disabledBy),
  }),
);

export const safeAddressUpdated = onchainTable(
  "safe_address_updated",
  (t) => ({
    id: t.text().primaryKey(),
    contractAddress: t.hex().notNull(),
    oldSafe: t.hex().notNull(),
    newSafe: t.hex().notNull(),
    blockNumber: t.bigint().notNull(),
    timestamp: t.integer().notNull(),
  }),
  (table) => ({
    contractAddressIdx: index("safe_address_updated_contract_index").on(table.contractAddress),
  }),
);

export const safeMultiplierUpdated = onchainTable(
  "safe_multiplier_updated",
  (t) => ({
    id: t.text().primaryKey(),
    contractAddress: t.hex().notNull(),
    oldMultiplier: t.bigint().notNull(),
    newMultiplier: t.bigint().notNull(),
    blockNumber: t.bigint().notNull(),
    timestamp: t.integer().notNull(),
  }),
  (table) => ({
    contractAddressIdx: index("safe_multiplier_updated_contract_index").on(table.contractAddress),
  }),
);

export const safeTokenSupportAdded = onchainTable(
  "safe_token_support_added",
  (t) => ({
    id: t.text().primaryKey(),
    contractAddress: t.hex().notNull(),
    tokenAddress: t.hex().notNull(),
    decimals: t.integer(),
    blockNumber: t.bigint().notNull(),
    timestamp: t.integer().notNull(),
  }),
  (table) => ({
    contractAddressIdx: index("safe_token_support_added_contract_index").on(table.contractAddress),
    tokenAddressIdx: index("safe_token_support_added_token_index").on(table.tokenAddress),
  }),
);

export const safeTokenSupportRemoved = onchainTable(
  "safe_token_support_removed",
  (t) => ({
    id: t.text().primaryKey(),
    contractAddress: t.hex().notNull(),
    tokenAddress: t.hex().notNull(),
    blockNumber: t.bigint().notNull(),
    timestamp: t.integer().notNull(),
  }),
  (table) => ({
    contractAddressIdx: index("safe_token_support_removed_contract_index").on(table.contractAddress),
    tokenAddressIdx: index("safe_token_support_removed_token_index").on(table.tokenAddress),
  }),
);

export const safeTokensRecovered = onchainTable(
  "safe_tokens_recovered",
  (t) => ({
    id: t.text().primaryKey(),
    contractAddress: t.hex().notNull(),
    token: t.hex().notNull(),
    to: t.hex().notNull(),
    amount: t.bigint().notNull(),
    blockNumber: t.bigint().notNull(),
    timestamp: t.integer().notNull(),
  }),
  (table) => ({
    contractAddressIdx: index("safe_tokens_recovered_contract_index").on(table.contractAddress),
    tokenIdx: index("safe_tokens_recovered_token_index").on(table.token),
  }),
);

// ExpenseAccountEIP712 events
export const expenseDeposit = onchainTable(
  "expense_deposit",
  (t) => ({
    id: t.text().primaryKey(),
    contractAddress: t.hex().notNull(),
    depositor: t.hex().notNull(),
    amount: t.bigint().notNull(),
    blockNumber: t.bigint().notNull(),
    timestamp: t.integer().notNull(),
  }),
  (table) => ({
    contractAddressIdx: index("expense_deposit_contract_index").on(table.contractAddress),
    depositorIdx: index("expense_deposit_depositor_index").on(table.depositor),
  }),
);

export const expenseTokenDeposit = onchainTable(
  "expense_token_deposit",
  (t) => ({
    id: t.text().primaryKey(),
    contractAddress: t.hex().notNull(),
    depositor: t.hex().notNull(),
    token: t.hex().notNull(),
    amount: t.bigint().notNull(),
    blockNumber: t.bigint().notNull(),
    timestamp: t.integer().notNull(),
  }),
  (table) => ({
    contractAddressIdx: index("expense_token_deposit_contract_index").on(table.contractAddress),
    depositorIdx: index("expense_token_deposit_depositor_index").on(table.depositor),
  }),
);

export const expenseTransfer = onchainTable(
  "expense_transfer",
  (t) => ({
    id: t.text().primaryKey(),
    contractAddress: t.hex().notNull(),
    withdrawer: t.hex().notNull(),
    to: t.hex().notNull(),
    amount: t.bigint().notNull(),
    blockNumber: t.bigint().notNull(),
    timestamp: t.integer().notNull(),
  }),
  (table) => ({
    contractAddressIdx: index("expense_transfer_contract_index").on(table.contractAddress),
    withdrawerIdx: index("expense_transfer_withdrawer_index").on(table.withdrawer),
  }),
);

export const expenseTokenTransfer = onchainTable(
  "expense_token_transfer",
  (t) => ({
    id: t.text().primaryKey(),
    contractAddress: t.hex().notNull(),
    withdrawer: t.hex().notNull(),
    to: t.hex().notNull(),
    token: t.hex().notNull(),
    amount: t.bigint().notNull(),
    blockNumber: t.bigint().notNull(),
    timestamp: t.integer().notNull(),
  }),
  (table) => ({
    contractAddressIdx: index("expense_token_transfer_contract_index").on(table.contractAddress),
    withdrawerIdx: index("expense_token_transfer_withdrawer_index").on(table.withdrawer),
  }),
);

export const expenseApproval = onchainTable(
  "expense_approval",
  (t) => ({
    id: t.text().primaryKey(),
    contractAddress: t.hex().notNull(),
    signatureHash: t.text().notNull(), // bytes32 as hex
    activated: t.boolean().notNull(),
    blockNumber: t.bigint().notNull(),
    timestamp: t.integer().notNull(),
  }),
  (table) => ({
    contractAddressIdx: index("expense_approval_contract_index").on(table.contractAddress),
  }),
);

export const expenseOwnerTreasuryWithdrawNative = onchainTable(
  "expense_owner_treasury_withdraw_native",
  (t) => ({
    id: t.text().primaryKey(),
    contractAddress: t.hex().notNull(),
    ownerAddress: t.hex().notNull(),
    amount: t.bigint().notNull(),
    blockNumber: t.bigint().notNull(),
    timestamp: t.integer().notNull(),
  }),
  (table) => ({
    contractAddressIdx: index("expense_owner_withdraw_native_contract_index").on(table.contractAddress),
    ownerIdx: index("expense_owner_withdraw_native_owner_index").on(table.ownerAddress),
  }),
);

export const expenseOwnerTreasuryWithdrawToken = onchainTable(
  "expense_owner_treasury_withdraw_token",
  (t) => ({
    id: t.text().primaryKey(),
    contractAddress: t.hex().notNull(),
    ownerAddress: t.hex().notNull(),
    token: t.hex().notNull(),
    amount: t.bigint().notNull(),
    blockNumber: t.bigint().notNull(),
    timestamp: t.integer().notNull(),
  }),
  (table) => ({
    contractAddressIdx: index("expense_owner_withdraw_token_contract_index").on(table.contractAddress),
    ownerIdx: index("expense_owner_withdraw_token_owner_index").on(table.ownerAddress),
  }),
);

export const expenseTokenSupportAdded = onchainTable(
  "expense_token_support_added",
  (t) => ({
    id: t.text().primaryKey(),
    contractAddress: t.hex().notNull(),
    tokenAddress: t.hex().notNull(),
    blockNumber: t.bigint().notNull(),
    timestamp: t.integer().notNull(),
  }),
  (table) => ({
    contractAddressIdx: index("expense_token_support_added_contract_index").on(table.contractAddress),
    tokenAddressIdx: index("expense_token_support_added_token_index").on(table.tokenAddress),
  }),
);

export const expenseTokenSupportRemoved = onchainTable(
  "expense_token_support_removed",
  (t) => ({
    id: t.text().primaryKey(),
    contractAddress: t.hex().notNull(),
    tokenAddress: t.hex().notNull(),
    blockNumber: t.bigint().notNull(),
    timestamp: t.integer().notNull(),
  }),
  (table) => ({
    contractAddressIdx: index("expense_token_support_removed_contract_index").on(table.contractAddress),
    tokenAddressIdx: index("expense_token_support_removed_token_index").on(table.tokenAddress),
  }),
);

export const expenseTokenAddressChanged = onchainTable(
  "expense_token_address_changed",
  (t) => ({
    id: t.text().primaryKey(),
    contractAddress: t.hex().notNull(),
    addressWhoChanged: t.hex().notNull(),
    tokenSymbol: t.text().notNull(),
    oldAddress: t.hex().notNull(),
    newAddress: t.hex().notNull(),
    blockNumber: t.bigint().notNull(),
    timestamp: t.integer().notNull(),
  }),
  (table) => ({
    contractAddressIdx: index("expense_token_address_changed_contract_index").on(table.contractAddress),
    tokenSymbolIdx: index("expense_token_address_changed_symbol_index").on(table.tokenSymbol),
  }),
);

// FeeCollector events
export const feeCollectorFeePaid = onchainTable(
  "fee_collector_fee_paid",
  (t) => ({
    id: t.text().primaryKey(),
    contractAddress: t.hex().notNull(),
    contractType: t.text().notNull(),
    payer: t.hex().notNull(),
    token: t.hex().notNull(),
    amount: t.bigint().notNull(),
    blockNumber: t.bigint().notNull(),
    timestamp: t.integer().notNull(),
  }),
  (table) => ({
    contractAddressIdx: index("fee_collector_fee_paid_contract_index").on(table.contractAddress),
    payerIdx: index("fee_collector_fee_paid_payer_index").on(table.payer),
    contractTypeIdx: index("fee_collector_fee_paid_type_index").on(table.contractType),
  }),
);

export const feeCollectorWithdrawn = onchainTable(
  "fee_collector_withdrawn",
  (t) => ({
    id: t.text().primaryKey(),
    contractAddress: t.hex().notNull(),
    recipient: t.hex().notNull(),
    amount: t.bigint().notNull(),
    blockNumber: t.bigint().notNull(),
    timestamp: t.integer().notNull(),
  }),
  (table) => ({
    contractAddressIdx: index("fee_collector_withdrawn_contract_index").on(table.contractAddress),
    recipientIdx: index("fee_collector_withdrawn_recipient_index").on(table.recipient),
  }),
);

export const feeCollectorTokenWithdrawn = onchainTable(
  "fee_collector_token_withdrawn",
  (t) => ({
    id: t.text().primaryKey(),
    contractAddress: t.hex().notNull(),
    recipient: t.hex().notNull(),
    token: t.hex().notNull(),
    amount: t.bigint().notNull(),
    blockNumber: t.bigint().notNull(),
    timestamp: t.integer().notNull(),
  }),
  (table) => ({
    contractAddressIdx: index("fee_collector_token_withdrawn_contract_index").on(
      table.contractAddress,
    ),
    recipientIdx: index("fee_collector_token_withdrawn_recipient_index").on(table.recipient),
    tokenIdx: index("fee_collector_token_withdrawn_token_index").on(table.token),
  }),
);

export const feeCollectorBeneficiaryUpdated = onchainTable(
  "fee_collector_beneficiary_updated",
  (t) => ({
    id: t.text().primaryKey(),
    contractAddress: t.hex().notNull(),
    previousBeneficiary: t.hex().notNull(),
    currentBeneficiary: t.hex().notNull(),
    blockNumber: t.bigint().notNull(),
    timestamp: t.integer().notNull(),
  }),
  (table) => ({
    contractAddressIdx: index("fee_collector_beneficiary_contract_index").on(table.contractAddress),
    currentIdx: index("fee_collector_beneficiary_current_index").on(table.currentBeneficiary),
  }),
);

export const feeCollectorConfigUpdated = onchainTable(
  "fee_collector_config_updated",
  (t) => ({
    id: t.text().primaryKey(),
    contractAddress: t.hex().notNull(),
    contractType: t.text().notNull(),
    feeBps: t.integer().notNull(),
    blockNumber: t.bigint().notNull(),
    timestamp: t.integer().notNull(),
  }),
  (table) => ({
    contractAddressIdx: index("fee_collector_config_contract_index").on(table.contractAddress),
    contractTypeIdx: index("fee_collector_config_type_index").on(table.contractType),
  }),
);

export const feeCollectorTokenSupportAdded = onchainTable(
  "fee_collector_token_support_added",
  (t) => ({
    id: t.text().primaryKey(),
    contractAddress: t.hex().notNull(),
    tokenAddress: t.hex().notNull(),
    blockNumber: t.bigint().notNull(),
    timestamp: t.integer().notNull(),
  }),
  (table) => ({
    contractAddressIdx: index("fee_collector_token_added_contract_index").on(table.contractAddress),
    tokenIdx: index("fee_collector_token_added_token_index").on(table.tokenAddress),
  }),
);

export const feeCollectorTokenSupportRemoved = onchainTable(
  "fee_collector_token_support_removed",
  (t) => ({
    id: t.text().primaryKey(),
    contractAddress: t.hex().notNull(),
    tokenAddress: t.hex().notNull(),
    blockNumber: t.bigint().notNull(),
    timestamp: t.integer().notNull(),
  }),
  (table) => ({
    contractAddressIdx: index("fee_collector_token_removed_contract_index").on(
      table.contractAddress,
    ),
    tokenIdx: index("fee_collector_token_removed_token_index").on(table.tokenAddress),
  }),
);

// Vesting events
export const vestingCreated = onchainTable(
  "vesting_created",
  (t) => ({
    id: t.text().primaryKey(),
    contractAddress: t.hex().notNull(),
    member: t.hex().notNull(),
    teamId: t.bigint().notNull(),
    amount: t.bigint().notNull(),
    blockNumber: t.bigint().notNull(),
    timestamp: t.integer().notNull(),
  }),
  (table) => ({
    contractAddressIdx: index("vesting_created_contract_index").on(table.contractAddress),
    memberIdx: index("vesting_created_member_index").on(table.member),
    teamIdIdx: index("vesting_created_team_id_index").on(table.teamId),
  }),
);

export const vestingTokensReleased = onchainTable(
  "vesting_tokens_released",
  (t) => ({
    id: t.text().primaryKey(),
    contractAddress: t.hex().notNull(),
    member: t.hex().notNull(),
    teamId: t.bigint().notNull(),
    amount: t.bigint().notNull(),
    blockNumber: t.bigint().notNull(),
    timestamp: t.integer().notNull(),
  }),
  (table) => ({
    contractAddressIdx: index("vesting_released_contract_index").on(table.contractAddress),
    memberIdx: index("vesting_released_member_index").on(table.member),
    teamIdIdx: index("vesting_released_team_id_index").on(table.teamId),
  }),
);

export const vestingStopped = onchainTable(
  "vesting_stopped",
  (t) => ({
    id: t.text().primaryKey(),
    contractAddress: t.hex().notNull(),
    member: t.hex().notNull(),
    teamId: t.bigint().notNull(),
    blockNumber: t.bigint().notNull(),
    timestamp: t.integer().notNull(),
  }),
  (table) => ({
    contractAddressIdx: index("vesting_stopped_contract_index").on(table.contractAddress),
    memberIdx: index("vesting_stopped_member_index").on(table.member),
    teamIdIdx: index("vesting_stopped_team_id_index").on(table.teamId),
  }),
);

export const vestingUnvestedWithdrawn = onchainTable(
  "vesting_unvested_withdrawn",
  (t) => ({
    id: t.text().primaryKey(),
    contractAddress: t.hex().notNull(),
    member: t.hex().notNull(),
    teamId: t.bigint().notNull(),
    amount: t.bigint().notNull(),
    blockNumber: t.bigint().notNull(),
    timestamp: t.integer().notNull(),
  }),
  (table) => ({
    contractAddressIdx: index("vesting_unvested_contract_index").on(table.contractAddress),
    memberIdx: index("vesting_unvested_member_index").on(table.member),
    teamIdIdx: index("vesting_unvested_team_id_index").on(table.teamId),
  }),
);

// Relations
export const teamRelations = relations(team, ({ many }) => ({
  contracts: many(teamContract),
}));

export const teamContractRelations = relations(teamContract, ({ one }) => ({
  team: one(team, {
    fields: [teamContract.teamAddress],
    references: [team.address],
  }),
}));
