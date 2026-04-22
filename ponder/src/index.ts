import { ponder } from "ponder:registry";
import {
  team,
  teamContract,
  bankDeposit,
  bankTokenDeposit,
  bankTransfer,
  bankTokenTransfer,
  bankFeePaid,
  bankDividendDistributionTriggered,
  bankTokenSupportAdded,
  bankTokenSupportRemoved,
  election,
  electionVote,
  electionResult,
  proposal,
  proposalVote,
  proposalTally,
  boardAction,
  boardApproval,
  boardDirectorsChanged,
  boardOwnersChanged,
  investorMint,
  investorDividendDistributed,
  investorDividendPaid,
  investorDividendPaymentFailed,
  cashRemunerationDeposit,
  cashRemunerationWithdraw,
  cashRemunerationWithdrawToken,
  cashRemunerationWageClaim,
  cashRemunerationOwnerTreasuryWithdrawNative,
  cashRemunerationOwnerTreasuryWithdrawToken,
  cashRemunerationOfficerUpdated,
  cashRemunerationTokenSupportAdded,
  cashRemunerationTokenSupportRemoved,
  safeDeposit,
  safeDepositsEnabled,
  safeDepositsDisabled,
  safeAddressUpdated,
  safeMultiplierUpdated,
  safeTokenSupportAdded,
  safeTokenSupportRemoved,
  safeTokensRecovered,
  expenseDeposit,
  expenseTokenDeposit,
  expenseTransfer,
  expenseTokenTransfer,
  expenseApproval,
  expenseOwnerTreasuryWithdrawNative,
  expenseOwnerTreasuryWithdrawToken,
  expenseTokenSupportAdded,
  expenseTokenSupportRemoved,
  expenseTokenAddressChanged,
  feeCollectorFeePaid,
  feeCollectorWithdrawn,
  feeCollectorTokenWithdrawn,
  feeCollectorBeneficiaryUpdated,
  feeCollectorConfigUpdated,
  feeCollectorTokenSupportAdded,
  feeCollectorTokenSupportRemoved,
} from "ponder:schema";

// ─── Officer Factory ─────────────────────────────────────────────────────────

ponder.on(
  "OfficerFactoryBeacon:BeaconProxyCreated",
  async ({ event, context }) => {
    await context.db.insert(team).values({
      address: event.args.proxy,
      deployer: event.args.deployer,
      blockNumber: event.block.number,
      timestamp: Number(event.block.timestamp),
    });
  },
);

ponder.on("Officer:ContractDeployed", async ({ event, context }) => {
  const contractAddress = event.args.deployedAddress.toLowerCase() as `0x${string}`;
  const teamAddress = event.log.address.toLowerCase() as `0x${string}`;

  await context.db.insert(teamContract).values({
    id: `${teamAddress}-${event.args.contractType}`,
    teamAddress,
    contractType: event.args.contractType,
    contractAddress,
    blockNumber: event.block.number,
    timestamp: Number(event.block.timestamp),
  });
});

// ─── Bank ─────────────────────────────────────────────────────────────────────

ponder.on("Bank:Deposited", async ({ event, context }) => {
  await context.db.insert(bankDeposit).values({
    id: `${event.transaction.hash}-${event.log.logIndex}`,
    contractAddress: event.log.address,
    depositor: event.args.depositor,
    amount: event.args.amount,
    blockNumber: event.block.number,
    timestamp: Number(event.block.timestamp),
  });
});

ponder.on("Bank:TokenDeposited", async ({ event, context }) => {
  await context.db.insert(bankTokenDeposit).values({
    id: `${event.transaction.hash}-${event.log.logIndex}`,
    contractAddress: event.log.address,
    depositor: event.args.depositor,
    token: event.args.token,
    amount: event.args.amount,
    blockNumber: event.block.number,
    timestamp: Number(event.block.timestamp),
  });
});

ponder.on("Bank:Transfer", async ({ event, context }) => {
  await context.db.insert(bankTransfer).values({
    id: `${event.transaction.hash}-${event.log.logIndex}`,
    contractAddress: event.log.address,
    sender: event.args.sender,
    to: event.args.to,
    amount: event.args.amount,
    blockNumber: event.block.number,
    timestamp: Number(event.block.timestamp),
  });
});

ponder.on("Bank:TokenTransfer", async ({ event, context }) => {
  await context.db.insert(bankTokenTransfer).values({
    id: `${event.transaction.hash}-${event.log.logIndex}`,
    contractAddress: event.log.address,
    sender: event.args.sender,
    to: event.args.to,
    token: event.args.token,
    amount: event.args.amount,
    blockNumber: event.block.number,
    timestamp: Number(event.block.timestamp),
  });
});

ponder.on("FeeCollector:FeePaid", async ({ event, context }) => {
  const id = `${event.transaction.hash}-${event.log.logIndex}`;

  await context.db.insert(bankFeePaid).values({
    id,
    contractAddress: event.args.payer,
    feeCollector: event.log.address,
    token: event.args.token,
    amount: event.args.amount,
    blockNumber: event.block.number,
    timestamp: Number(event.block.timestamp),
  });

  await context.db.insert(feeCollectorFeePaid).values({
    id,
    contractAddress: event.log.address,
    contractType: event.args.contractType,
    payer: event.args.payer,
    token: event.args.token,
    amount: event.args.amount,
    blockNumber: event.block.number,
    timestamp: Number(event.block.timestamp),
  });
});

ponder.on("FeeCollector:Withdrawn", async ({ event, context }) => {
  await context.db.insert(feeCollectorWithdrawn).values({
    id: `${event.transaction.hash}-${event.log.logIndex}`,
    contractAddress: event.log.address,
    recipient: event.args.recipient,
    amount: event.args.amount,
    blockNumber: event.block.number,
    timestamp: Number(event.block.timestamp),
  });
});

ponder.on("FeeCollector:TokenWithdrawn", async ({ event, context }) => {
  await context.db.insert(feeCollectorTokenWithdrawn).values({
    id: `${event.transaction.hash}-${event.log.logIndex}`,
    contractAddress: event.log.address,
    recipient: event.args.recipient,
    token: event.args.token,
    amount: event.args.amount,
    blockNumber: event.block.number,
    timestamp: Number(event.block.timestamp),
  });
});

ponder.on("FeeCollector:FeeBeneficiaryUpdated", async ({ event, context }) => {
  await context.db.insert(feeCollectorBeneficiaryUpdated).values({
    id: `${event.transaction.hash}-${event.log.logIndex}`,
    contractAddress: event.log.address,
    previousBeneficiary: event.args.previous,
    currentBeneficiary: event.args.current,
    blockNumber: event.block.number,
    timestamp: Number(event.block.timestamp),
  });
});

ponder.on("FeeCollector:FeeConfigUpdated", async ({ event, context }) => {
  await context.db.insert(feeCollectorConfigUpdated).values({
    id: `${event.transaction.hash}-${event.log.logIndex}`,
    contractAddress: event.log.address,
    contractType: event.args.contractType,
    feeBps: event.args.feeBps,
    blockNumber: event.block.number,
    timestamp: Number(event.block.timestamp),
  });
});

ponder.on("FeeCollector:TokenSupportAdded", async ({ event, context }) => {
  await context.db.insert(feeCollectorTokenSupportAdded).values({
    id: `${event.transaction.hash}-${event.log.logIndex}`,
    contractAddress: event.log.address,
    tokenAddress: event.args.tokenAddress,
    blockNumber: event.block.number,
    timestamp: Number(event.block.timestamp),
  });
});

ponder.on("FeeCollector:TokenSupportRemoved", async ({ event, context }) => {
  await context.db.insert(feeCollectorTokenSupportRemoved).values({
    id: `${event.transaction.hash}-${event.log.logIndex}`,
    contractAddress: event.log.address,
    tokenAddress: event.args.tokenAddress,
    blockNumber: event.block.number,
    timestamp: Number(event.block.timestamp),
  });
});

ponder.on("Bank:DividendDistributionTriggered", async ({ event, context }) => {
  await context.db.insert(bankDividendDistributionTriggered).values({
    id: `${event.transaction.hash}-${event.log.logIndex}`,
    contractAddress: event.log.address,
    investor: event.args.investor,
    token: event.args.token,
    totalAmount: event.args.totalAmount,
    blockNumber: event.block.number,
    timestamp: Number(event.block.timestamp),
  });
});

ponder.on("Bank:TokenSupportAdded", async ({ event, context }) => {
  await context.db.insert(bankTokenSupportAdded).values({
    id: `${event.transaction.hash}-${event.log.logIndex}`,
    contractAddress: event.log.address,
    tokenAddress: event.args.tokenAddress,
    blockNumber: event.block.number,
    timestamp: Number(event.block.timestamp),
  });
});

ponder.on("Bank:TokenSupportRemoved", async ({ event, context }) => {
  await context.db.insert(bankTokenSupportRemoved).values({
    id: `${event.transaction.hash}-${event.log.logIndex}`,
    contractAddress: event.log.address,
    tokenAddress: event.args.tokenAddress,
    blockNumber: event.block.number,
    timestamp: Number(event.block.timestamp),
  });
});

// ─── Elections ────────────────────────────────────────────────────────────────

ponder.on("Elections:ElectionCreated", async ({ event, context }) => {
  await context.db.insert(election).values({
    id: `${event.log.address}-${event.args.electionId}`,
    contractAddress: event.log.address,
    electionId: event.args.electionId,
    title: event.args.title,
    createdBy: event.args.createdBy,
    startDate: event.args.startDate,
    endDate: event.args.endDate,
    seatCount: event.args.seatCount,
    blockNumber: event.block.number,
    timestamp: Number(event.block.timestamp),
  });
});

ponder.on("Elections:VoteSubmitted", async ({ event, context }) => {
  await context.db.insert(electionVote).values({
    id: `${event.log.address}-${event.args.electionId}-${event.args.voter}-${event.args.candidate}`,
    contractAddress: event.log.address,
    electionId: event.args.electionId,
    voter: event.args.voter,
    candidate: event.args.candidate,
    blockNumber: event.block.number,
    timestamp: Number(event.block.timestamp),
  });
});

ponder.on("Elections:ResultsPublished", async ({ event, context }) => {
  await context.db.insert(electionResult).values({
    id: `${event.log.address}-${event.args.electionId}`,
    contractAddress: event.log.address,
    electionId: event.args.electionId,
    winners: JSON.stringify(event.args.winners),
    blockNumber: event.block.number,
    timestamp: Number(event.block.timestamp),
  });
});

// ─── Proposals ────────────────────────────────────────────────────────────────

ponder.on("Proposals:ProposalCreated", async ({ event, context }) => {
  await context.db.insert(proposal).values({
    id: `${event.log.address}-${event.args.proposalId}`,
    contractAddress: event.log.address,
    proposalId: event.args.proposalId,
    title: event.args.title,
    creator: event.args.creator,
    startDate: event.args.startDate,
    endDate: event.args.endDate,
    blockNumber: event.block.number,
    timestamp: Number(event.block.timestamp),
  });
});

ponder.on("Proposals:ProposalVoted", async ({ event, context }) => {
  await context.db.insert(proposalVote).values({
    id: `${event.log.address}-${event.args.proposalId}-${event.args.voter}`,
    contractAddress: event.log.address,
    proposalId: event.args.proposalId,
    voter: event.args.voter,
    vote: event.args.vote,
    voteTimestamp: event.args.timestamp,
    blockNumber: event.block.number,
    timestamp: Number(event.block.timestamp),
  });
});

ponder.on("Proposals:ProposalTallyResults", async ({ event, context }) => {
  await context.db.insert(proposalTally).values({
    id: `${event.log.address}-${event.args.proposalId}`,
    contractAddress: event.log.address,
    proposalId: event.args.proposalId,
    state: event.args.state,
    yesCount: event.args.yesCount,
    noCount: event.args.noCount,
    abstainCount: event.args.abstainCount,
    blockNumber: event.block.number,
    timestamp: Number(event.block.timestamp),
  });
});

// ─── BoardOfDirectors ─────────────────────────────────────────────────────────

ponder.on("BoardOfDirectors:ActionAdded", async ({ event, context }) => {
  await context.db.insert(boardAction).values({
    id: `${event.log.address}-${event.args.id}`,
    contractAddress: event.log.address,
    actionId: event.args.id,
    target: event.args.target,
    description: event.args._description,
    data: event.args.data,
    executed: false,
    blockNumber: event.block.number,
    timestamp: Number(event.block.timestamp),
  });
});

ponder.on("BoardOfDirectors:ActionExecuted", async ({ event, context }) => {
  await context.db
    .update(boardAction, { id: `${event.log.address}-${event.args.id}` })
    .set({
      executed: true,
      blockNumber: event.block.number,
      timestamp: Number(event.block.timestamp),
    });
});

ponder.on("BoardOfDirectors:Approval", async ({ event, context }) => {
  await context.db
    .insert(boardApproval)
    .values({
      id: `${event.log.address}-${event.args.id}-${event.args.approver}`,
      contractAddress: event.log.address,
      actionId: event.args.id,
      approver: event.args.approver,
      revoked: false,
      blockNumber: event.block.number,
      timestamp: Number(event.block.timestamp),
    })
    .onConflictDoUpdate({
      revoked: false,
      blockNumber: event.block.number,
      timestamp: Number(event.block.timestamp),
    });
});

ponder.on("BoardOfDirectors:Revocation", async ({ event, context }) => {
  await context.db
    .update(boardApproval, {
      id: `${event.log.address}-${event.args.id}-${event.args.approver}`,
    })
    .set({
      revoked: true,
      blockNumber: event.block.number,
      timestamp: Number(event.block.timestamp),
    });
});

ponder.on("BoardOfDirectors:BoardOfDirectorsChanged", async ({ event, context }) => {
  await context.db.insert(boardDirectorsChanged).values({
    id: `${event.transaction.hash}-${event.log.logIndex}`,
    contractAddress: event.log.address,
    members: JSON.stringify(event.args.boardOfDirectors),
    blockNumber: event.block.number,
    timestamp: Number(event.block.timestamp),
  });
});

ponder.on("BoardOfDirectors:OwnersChanged", async ({ event, context }) => {
  await context.db.insert(boardOwnersChanged).values({
    id: `${event.transaction.hash}-${event.log.logIndex}`,
    contractAddress: event.log.address,
    owners: JSON.stringify(event.args.owners),
    blockNumber: event.block.number,
    timestamp: Number(event.block.timestamp),
  });
});

// ─── InvestorV1 ───────────────────────────────────────────────────────────────

ponder.on("InvestorV1:Minted", async ({ event, context }) => {
  await context.db.insert(investorMint).values({
    id: `${event.transaction.hash}-${event.log.logIndex}`,
    contractAddress: event.log.address,
    shareholder: event.args.shareholder,
    amount: event.args.amount,
    blockNumber: event.block.number,
    timestamp: Number(event.block.timestamp),
  });
});

ponder.on("InvestorV1:DividendDistributed", async ({ event, context }) => {
  await context.db.insert(investorDividendDistributed).values({
    id: `${event.transaction.hash}-${event.log.logIndex}`,
    contractAddress: event.log.address,
    distributor: event.args.distributor,
    token: event.args.token,
    totalAmount: event.args.totalAmount,
    shareholderCount: event.args.shareholderCount,
    blockNumber: event.block.number,
    timestamp: Number(event.block.timestamp),
  });
});

ponder.on("InvestorV1:DividendPaid", async ({ event, context }) => {
  await context.db.insert(investorDividendPaid).values({
    id: `${event.transaction.hash}-${event.log.logIndex}`,
    contractAddress: event.log.address,
    shareholder: event.args.shareholder,
    token: event.args.token,
    amount: event.args.amount,
    blockNumber: event.block.number,
    timestamp: Number(event.block.timestamp),
  });
});

ponder.on("InvestorV1:DividendPaymentFailed", async ({ event, context }) => {
  await context.db.insert(investorDividendPaymentFailed).values({
    id: `${event.transaction.hash}-${event.log.logIndex}`,
    contractAddress: event.log.address,
    shareholder: event.args.shareholder,
    token: event.args.token,
    amount: event.args.amount,
    reason: event.args.reason,
    blockNumber: event.block.number,
    timestamp: Number(event.block.timestamp),
  });
});

// ─── CashRemunerationEIP712 ───────────────────────────────────────────────────

ponder.on("CashRemunerationEIP712:Deposited", async ({ event, context }) => {
  await context.db.insert(cashRemunerationDeposit).values({
    id: `${event.transaction.hash}-${event.log.logIndex}`,
    contractAddress: event.log.address,
    depositor: event.args.depositor,
    amount: event.args.amount,
    blockNumber: event.block.number,
    timestamp: Number(event.block.timestamp),
  });
});

ponder.on("CashRemunerationEIP712:Withdraw", async ({ event, context }) => {
  await context.db.insert(cashRemunerationWithdraw).values({
    id: `${event.transaction.hash}-${event.log.logIndex}`,
    contractAddress: event.log.address,
    withdrawer: event.args.withdrawer,
    amount: event.args.amount,
    blockNumber: event.block.number,
    timestamp: Number(event.block.timestamp),
  });
});

ponder.on(
  "CashRemunerationEIP712:WithdrawToken",
  async ({ event, context }) => {
    await context.db.insert(cashRemunerationWithdrawToken).values({
      id: `${event.transaction.hash}-${event.log.logIndex}`,
      contractAddress: event.log.address,
      withdrawer: event.args.withdrawer,
      tokenAddress: event.args.tokenAddress,
      amount: event.args.amount,
      blockNumber: event.block.number,
      timestamp: Number(event.block.timestamp),
    });
  },
);

ponder.on(
  "CashRemunerationEIP712:WageClaimEnabled",
  async ({ event, context }) => {
    await context.db.insert(cashRemunerationWageClaim).values({
      id: `${event.transaction.hash}-${event.log.logIndex}`,
      contractAddress: event.log.address,
      signatureHash: event.args.signatureHash,
      enabled: true,
      blockNumber: event.block.number,
      timestamp: Number(event.block.timestamp),
    });
  },
);

ponder.on(
  "CashRemunerationEIP712:WageClaimDisabled",
  async ({ event, context }) => {
    await context.db.insert(cashRemunerationWageClaim).values({
      id: `${event.transaction.hash}-${event.log.logIndex}`,
      contractAddress: event.log.address,
      signatureHash: event.args.signatureHash,
      enabled: false,
      blockNumber: event.block.number,
      timestamp: Number(event.block.timestamp),
    });
  },
);

ponder.on(
  "CashRemunerationEIP712:OwnerTreasuryWithdrawNative",
  async ({ event, context }) => {
    await context.db.insert(cashRemunerationOwnerTreasuryWithdrawNative).values({
      id: `${event.transaction.hash}-${event.log.logIndex}`,
      contractAddress: event.log.address,
      ownerAddress: event.args.ownerAddress,
      amount: event.args.amount,
      blockNumber: event.block.number,
      timestamp: Number(event.block.timestamp),
    });
  },
);

ponder.on(
  "CashRemunerationEIP712:OwnerTreasuryWithdrawToken",
  async ({ event, context }) => {
    await context.db.insert(cashRemunerationOwnerTreasuryWithdrawToken).values({
      id: `${event.transaction.hash}-${event.log.logIndex}`,
      contractAddress: event.log.address,
      ownerAddress: event.args.ownerAddress,
      tokenAddress: event.args.tokenAddress,
      amount: event.args.amount,
      blockNumber: event.block.number,
      timestamp: Number(event.block.timestamp),
    });
  },
);

ponder.on(
  "CashRemunerationEIP712:OfficerAddressUpdated",
  async ({ event, context }) => {
    await context.db.insert(cashRemunerationOfficerUpdated).values({
      id: `${event.transaction.hash}-${event.log.logIndex}`,
      contractAddress: event.log.address,
      newOfficerAddress: event.args.newOfficerAddress,
      blockNumber: event.block.number,
      timestamp: Number(event.block.timestamp),
    });
  },
);

ponder.on(
  "CashRemunerationEIP712:TokenSupportAdded",
  async ({ event, context }) => {
    await context.db.insert(cashRemunerationTokenSupportAdded).values({
      id: `${event.transaction.hash}-${event.log.logIndex}`,
      contractAddress: event.log.address,
      tokenAddress: event.args.tokenAddress,
      blockNumber: event.block.number,
      timestamp: Number(event.block.timestamp),
    });
  },
);

ponder.on(
  "CashRemunerationEIP712:TokenSupportRemoved",
  async ({ event, context }) => {
    await context.db.insert(cashRemunerationTokenSupportRemoved).values({
      id: `${event.transaction.hash}-${event.log.logIndex}`,
      contractAddress: event.log.address,
      tokenAddress: event.args.tokenAddress,
      blockNumber: event.block.number,
      timestamp: Number(event.block.timestamp),
    });
  },
);

// ─── SafeDepositRouter ────────────────────────────────────────────────────────

ponder.on("SafeDepositRouter:Deposited", async ({ event, context }) => {
  await context.db.insert(safeDeposit).values({
    id: `${event.transaction.hash}-${event.log.logIndex}`,
    contractAddress: event.log.address,
    depositor: event.args.depositor,
    token: event.args.token,
    tokenAmount: event.args.tokenAmount,
    sherAmount: event.args.sherAmount,
    depositTimestamp: event.args.timestamp,
    blockNumber: event.block.number,
    timestamp: Number(event.block.timestamp),
  });
});

ponder.on("SafeDepositRouter:DepositsEnabled", async ({ event, context }) => {
  await context.db.insert(safeDepositsEnabled).values({
    id: `${event.transaction.hash}-${event.log.logIndex}`,
    contractAddress: event.log.address,
    enabledBy: event.args.enabledBy,
    blockNumber: event.block.number,
    timestamp: Number(event.block.timestamp),
  });
});

ponder.on("SafeDepositRouter:DepositsDisabled", async ({ event, context }) => {
  await context.db.insert(safeDepositsDisabled).values({
    id: `${event.transaction.hash}-${event.log.logIndex}`,
    contractAddress: event.log.address,
    disabledBy: event.args.disabledBy,
    blockNumber: event.block.number,
    timestamp: Number(event.block.timestamp),
  });
});

ponder.on("SafeDepositRouter:SafeAddressUpdated", async ({ event, context }) => {
  await context.db.insert(safeAddressUpdated).values({
    id: `${event.transaction.hash}-${event.log.logIndex}`,
    contractAddress: event.log.address,
    oldSafe: event.args.oldSafe,
    newSafe: event.args.newSafe,
    blockNumber: event.block.number,
    timestamp: Number(event.block.timestamp),
  });
});

ponder.on("SafeDepositRouter:MultiplierUpdated", async ({ event, context }) => {
  await context.db.insert(safeMultiplierUpdated).values({
    id: `${event.transaction.hash}-${event.log.logIndex}`,
    contractAddress: event.log.address,
    oldMultiplier: event.args.oldMultiplier,
    newMultiplier: event.args.newMultiplier,
    blockNumber: event.block.number,
    timestamp: Number(event.block.timestamp),
  });
});

ponder.on(
  "SafeDepositRouter:TokenSupportAdded(address indexed tokenAddress, uint8 decimals)",
  async ({ event, context }) => {
    await context.db.insert(safeTokenSupportAdded).values({
      id: `${event.transaction.hash}-${event.log.logIndex}`,
      contractAddress: event.log.address,
      tokenAddress: event.args.tokenAddress,
      decimals: event.args.decimals,
      blockNumber: event.block.number,
      timestamp: Number(event.block.timestamp),
    });
  },
);

ponder.on(
  "SafeDepositRouter:TokenSupportAdded(address indexed tokenAddress)",
  async ({ event, context }) => {
    await context.db.insert(safeTokenSupportAdded).values({
      id: `${event.transaction.hash}-${event.log.logIndex}`,
      contractAddress: event.log.address,
      tokenAddress: event.args.tokenAddress,
      decimals: null,
      blockNumber: event.block.number,
      timestamp: Number(event.block.timestamp),
    });
  },
);

ponder.on("SafeDepositRouter:TokenSupportRemoved", async ({ event, context }) => {
  await context.db.insert(safeTokenSupportRemoved).values({
    id: `${event.transaction.hash}-${event.log.logIndex}`,
    contractAddress: event.log.address,
    tokenAddress: event.args.tokenAddress,
    blockNumber: event.block.number,
    timestamp: Number(event.block.timestamp),
  });
});

ponder.on("SafeDepositRouter:TokensRecovered", async ({ event, context }) => {
  await context.db.insert(safeTokensRecovered).values({
    id: `${event.transaction.hash}-${event.log.logIndex}`,
    contractAddress: event.log.address,
    token: event.args.token,
    to: event.args.to,
    amount: event.args.amount,
    blockNumber: event.block.number,
    timestamp: Number(event.block.timestamp),
  });
});

// ─── ExpenseAccountEIP712 ─────────────────────────────────────────────────────

ponder.on("ExpenseAccountEIP712:Deposited", async ({ event, context }) => {
  await context.db.insert(expenseDeposit).values({
    id: `${event.transaction.hash}-${event.log.logIndex}`,
    contractAddress: event.log.address,
    depositor: event.args.depositor,
    amount: event.args.amount,
    blockNumber: event.block.number,
    timestamp: Number(event.block.timestamp),
  });
});

ponder.on("ExpenseAccountEIP712:TokenDeposited", async ({ event, context }) => {
  await context.db.insert(expenseTokenDeposit).values({
    id: `${event.transaction.hash}-${event.log.logIndex}`,
    contractAddress: event.log.address,
    depositor: event.args.depositor,
    token: event.args.token,
    amount: event.args.amount,
    blockNumber: event.block.number,
    timestamp: Number(event.block.timestamp),
  });
});

ponder.on("ExpenseAccountEIP712:Transfer", async ({ event, context }) => {
  await context.db.insert(expenseTransfer).values({
    id: `${event.transaction.hash}-${event.log.logIndex}`,
    contractAddress: event.log.address,
    withdrawer: event.args.withdrawer,
    to: event.args.to,
    amount: event.args.amount,
    blockNumber: event.block.number,
    timestamp: Number(event.block.timestamp),
  });
});

ponder.on("ExpenseAccountEIP712:TokenTransfer", async ({ event, context }) => {
  await context.db.insert(expenseTokenTransfer).values({
    id: `${event.transaction.hash}-${event.log.logIndex}`,
    contractAddress: event.log.address,
    withdrawer: event.args.withdrawer,
    to: event.args.to,
    token: event.args.token,
    amount: event.args.amount,
    blockNumber: event.block.number,
    timestamp: Number(event.block.timestamp),
  });
});

ponder.on(
  "ExpenseAccountEIP712:ApprovalActivated",
  async ({ event, context }) => {
    await context.db.insert(expenseApproval).values({
      id: `${event.transaction.hash}-${event.log.logIndex}`,
      contractAddress: event.log.address,
      signatureHash: event.args.signatureHash,
      activated: true,
      blockNumber: event.block.number,
      timestamp: Number(event.block.timestamp),
    });
  },
);

ponder.on(
  "ExpenseAccountEIP712:ApprovalDeactivated",
  async ({ event, context }) => {
    await context.db.insert(expenseApproval).values({
      id: `${event.transaction.hash}-${event.log.logIndex}`,
      contractAddress: event.log.address,
      signatureHash: event.args.signatureHash,
      activated: false,
      blockNumber: event.block.number,
      timestamp: Number(event.block.timestamp),
    });
  },
);

ponder.on(
  "ExpenseAccountEIP712:OwnerTreasuryWithdrawNative",
  async ({ event, context }) => {
    await context.db.insert(expenseOwnerTreasuryWithdrawNative).values({
      id: `${event.transaction.hash}-${event.log.logIndex}`,
      contractAddress: event.log.address,
      ownerAddress: event.args.ownerAddress,
      amount: event.args.amount,
      blockNumber: event.block.number,
      timestamp: Number(event.block.timestamp),
    });
  },
);

ponder.on(
  "ExpenseAccountEIP712:OwnerTreasuryWithdrawToken",
  async ({ event, context }) => {
    await context.db.insert(expenseOwnerTreasuryWithdrawToken).values({
      id: `${event.transaction.hash}-${event.log.logIndex}`,
      contractAddress: event.log.address,
      ownerAddress: event.args.ownerAddress,
      token: event.args.token,
      amount: event.args.amount,
      blockNumber: event.block.number,
      timestamp: Number(event.block.timestamp),
    });
  },
);

ponder.on(
  "ExpenseAccountEIP712:TokenSupportAdded",
  async ({ event, context }) => {
    await context.db.insert(expenseTokenSupportAdded).values({
      id: `${event.transaction.hash}-${event.log.logIndex}`,
      contractAddress: event.log.address,
      tokenAddress: event.args.tokenAddress,
      blockNumber: event.block.number,
      timestamp: Number(event.block.timestamp),
    });
  },
);

ponder.on(
  "ExpenseAccountEIP712:TokenSupportRemoved",
  async ({ event, context }) => {
    await context.db.insert(expenseTokenSupportRemoved).values({
      id: `${event.transaction.hash}-${event.log.logIndex}`,
      contractAddress: event.log.address,
      tokenAddress: event.args.tokenAddress,
      blockNumber: event.block.number,
      timestamp: Number(event.block.timestamp),
    });
  },
);

ponder.on(
  "ExpenseAccountEIP712:TokenAddressChanged",
  async ({ event, context }) => {
    await context.db.insert(expenseTokenAddressChanged).values({
      id: `${event.transaction.hash}-${event.log.logIndex}`,
      contractAddress: event.log.address,
      addressWhoChanged: event.args.addressWhoChanged,
      tokenSymbol: event.args.tokenSymbol,
      oldAddress: event.args.oldAddress,
      newAddress: event.args.newAddress,
      blockNumber: event.block.number,
      timestamp: Number(event.block.timestamp),
    });
  },
);
