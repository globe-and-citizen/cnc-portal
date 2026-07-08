import { db } from "ponder:api";
import schema, {
  teamContract,
  bankDeposit,
  bankTokenDeposit,
  bankTransfer,
  bankTokenTransfer,
  bankFeePaid,
  bankDividendDistributionTriggered,
  election,
  electionVote,
  electionResult,
  proposal,
  proposalVote,
  proposalTally,
  boardAction,
  boardApproval,
  investorMint,
  investorDividendDistributed,
  investorDividendPaid,
  investorDividendPaymentFailed,
  cashRemunerationDeposit,
  cashRemunerationWithdraw,
  cashRemunerationWithdrawToken,
  cashRemunerationWageClaim,
  safeDeposit,
  expenseDeposit,
  expenseTokenDeposit,
  expenseTransfer,
  expenseTokenTransfer,
  expenseApproval,
} from "ponder:schema";
import { Hono } from "hono";
import { client, graphql, eq, and, lt, desc, inArray } from "ponder";

const app = new Hono();

app.use("/sql/*", client({ db, schema }));
app.use("/", graphql({ db, schema }));
app.use("/graphql", graphql({ db, schema }));

// ─── Helpers ──────────────────────────────────────────────────────────────────

// JSON.stringify cannot handle bigint — convert all bigints to strings
function serializable<T>(value: T): T {
  return JSON.parse(
    JSON.stringify(value, (_key, val) =>
      typeof val === "bigint" ? val.toString() : val,
    ),
  ) as T;
}

type HexAddress = `0x${string}`;

function toHex(s: string): HexAddress {
  return s.toLowerCase() as HexAddress;
}

// Query all event tables for a given contractAddress and contractType, returns grouped events
async function fetchContractEvents(
  address: HexAddress,
  contractType: string,
): Promise<Record<string, unknown[]>> {
  if (contractType === "Bank") {
    const [
      deposits,
      tokenDeposits,
      transfers,
      tokenTransfers,
      feesPaid,
      dividendTriggers,
    ] = await Promise.all([
      db
        .select()
        .from(bankDeposit)
        .where(eq(bankDeposit.contractAddress, address)),
      db
        .select()
        .from(bankTokenDeposit)
        .where(eq(bankTokenDeposit.contractAddress, address)),
      db
        .select()
        .from(bankTransfer)
        .where(eq(bankTransfer.contractAddress, address)),
      db
        .select()
        .from(bankTokenTransfer)
        .where(eq(bankTokenTransfer.contractAddress, address)),
      db
        .select()
        .from(bankFeePaid)
        .where(eq(bankFeePaid.contractAddress, address)),
      db
        .select()
        .from(bankDividendDistributionTriggered)
        .where(eq(bankDividendDistributionTriggered.contractAddress, address)),
    ]);
    return {
      deposits,
      tokenDeposits,
      transfers,
      tokenTransfers,
      feesPaid,
      dividendTriggers,
    };
  }

  if (contractType === "Elections") {
    const [elections, votes, results] = await Promise.all([
      db.select().from(election).where(eq(election.contractAddress, address)),
      db
        .select()
        .from(electionVote)
        .where(eq(electionVote.contractAddress, address)),
      db
        .select()
        .from(electionResult)
        .where(eq(electionResult.contractAddress, address)),
    ]);
    return { elections, votes, results };
  }

  if (contractType === "Proposals") {
    const [proposals, votes, tallies] = await Promise.all([
      db.select().from(proposal).where(eq(proposal.contractAddress, address)),
      db
        .select()
        .from(proposalVote)
        .where(eq(proposalVote.contractAddress, address)),
      db
        .select()
        .from(proposalTally)
        .where(eq(proposalTally.contractAddress, address)),
    ]);
    return { proposals, votes, tallies };
  }

  if (contractType === "BoardOfDirectors") {
    const [actions, approvals] = await Promise.all([
      db
        .select()
        .from(boardAction)
        .where(eq(boardAction.contractAddress, address)),
      db
        .select()
        .from(boardApproval)
        .where(eq(boardApproval.contractAddress, address)),
    ]);
    return { actions, approvals };
  }

  if (contractType === "InvestorV1") {
    const [mints, distributed, paid, failed] = await Promise.all([
      db
        .select()
        .from(investorMint)
        .where(eq(investorMint.contractAddress, address)),
      db
        .select()
        .from(investorDividendDistributed)
        .where(eq(investorDividendDistributed.contractAddress, address)),
      db
        .select()
        .from(investorDividendPaid)
        .where(eq(investorDividendPaid.contractAddress, address)),
      db
        .select()
        .from(investorDividendPaymentFailed)
        .where(eq(investorDividendPaymentFailed.contractAddress, address)),
    ]);
    return { mints, distributed, paid, failed };
  }

  if (contractType === "CashRemunerationEIP712") {
    const [deposits, withdrawals, tokenWithdrawals, wageClaims] =
      await Promise.all([
        db
          .select()
          .from(cashRemunerationDeposit)
          .where(eq(cashRemunerationDeposit.contractAddress, address)),
        db
          .select()
          .from(cashRemunerationWithdraw)
          .where(eq(cashRemunerationWithdraw.contractAddress, address)),
        db
          .select()
          .from(cashRemunerationWithdrawToken)
          .where(eq(cashRemunerationWithdrawToken.contractAddress, address)),
        db
          .select()
          .from(cashRemunerationWageClaim)
          .where(eq(cashRemunerationWageClaim.contractAddress, address)),
      ]);
    return { deposits, withdrawals, tokenWithdrawals, wageClaims };
  }

  if (contractType === "SafeDepositRouter") {
    const deposits = await db
      .select()
      .from(safeDeposit)
      .where(eq(safeDeposit.contractAddress, address));
    return { deposits };
  }

  if (contractType === "ExpenseAccountEIP712") {
    const [deposits, tokenDeposits, transfers, tokenTransfers, approvals] =
      await Promise.all([
        db
          .select()
          .from(expenseDeposit)
          .where(eq(expenseDeposit.contractAddress, address)),
        db
          .select()
          .from(expenseTokenDeposit)
          .where(eq(expenseTokenDeposit.contractAddress, address)),
        db
          .select()
          .from(expenseTransfer)
          .where(eq(expenseTransfer.contractAddress, address)),
        db
          .select()
          .from(expenseTokenTransfer)
          .where(eq(expenseTokenTransfer.contractAddress, address)),
        db
          .select()
          .from(expenseApproval)
          .where(eq(expenseApproval.contractAddress, address)),
      ]);
    return { deposits, tokenDeposits, transfers, tokenTransfers, approvals };
  }

  return {};
}

// ─── Endpoint A: All events for a sub-contract ────────────────────────────────
// GET /contracts/:address/events
app.get("/contracts/:address/events", async (c) => {
  const address = toHex(c.req.param("address"));

  const contracts = await db
    .select()
    .from(teamContract)
    .where(eq(teamContract.contractAddress, address));

  if (contracts.length === 0) {
    return c.json({ error: "Contract not found" }, 404);
  }

  const { contractType, teamAddress } = contracts[0]!;
  const events = await fetchContractEvents(address, contractType);

  return c.json(
    serializable({
      contractAddress: address,
      contractType,
      teamAddress,
      events,
    }),
  );
});

// ─── Endpoint B: All events for a team ────────────────────────────────────────
// GET /teams/:teamAddress/events
app.get("/teams/:teamAddress/events", async (c) => {
  const teamAddress = toHex(c.req.param("teamAddress"));

  const contracts = await db
    .select()
    .from(teamContract)
    .where(eq(teamContract.teamAddress, teamAddress));

  if (contracts.length === 0) {
    return c.json({ teamAddress, events: {} });
  }

  const eventsByType: Record<
    string,
    { contractAddress: string; events: Record<string, unknown[]> }
  > = {};

  await Promise.all(
    contracts.map(async ({ contractAddress, contractType }) => {
      const events = await fetchContractEvents(contractAddress, contractType);
      eventsByType[contractType] = { contractAddress, events };
    }),
  );

  return c.json(serializable({ teamAddress, events: eventsByType }));
});

// ─── Endpoint C: Activity timeline for a team ─────────────────────────────────
// GET /teams/:teamAddress/timeline?limit=50&before=<unix_timestamp>
app.get("/teams/:teamAddress/timeline", async (c) => {
  const teamAddress = toHex(c.req.param("teamAddress"));
  const limit = Math.min(Number(c.req.query("limit") ?? 50), 200);
  const before = Number(
    c.req.query("before") ?? Math.floor(Date.now() / 1000) + 1,
  );

  const contracts = await db
    .select()
    .from(teamContract)
    .where(eq(teamContract.teamAddress, teamAddress));

  if (contracts.length === 0) {
    return c.json({ teamAddress, nextBefore: null, events: [] });
  }

  const addresses = contracts.map((c) => c.contractAddress);

  // Query all event tables with timestamp < before, ordered desc
  const [
    bankDeposits,
    bankTokenDeposits,
    bankTransfers,
    bankTokenTransfers,
    bankFeesPaid,
    bankDividendTriggers,
    elections,
    electionVotes,
    electionResults,
    proposals,
    proposalVotes,
    proposalTallies,
    boardActions,
    boardApprovals,
    investorMints,
    investorDividendsDistributed,
    investorDividendsPaid,
    investorDividendsFailed,
    cashDeposits,
    cashWithdrawals,
    cashTokenWithdrawals,
    cashWageClaims,
    safeDeposits,
    expenseDeposits,
    expenseTokenDeposits,
    expenseTransfers,
    expenseTokenTransfers,
    expenseApprovals,
  ] = await Promise.all([
    db
      .select()
      .from(bankDeposit)
      .where(
        and(
          inArray(bankDeposit.contractAddress, addresses),
          lt(bankDeposit.timestamp, before),
        ),
      )
      .orderBy(desc(bankDeposit.timestamp))
      .limit(limit),
    db
      .select()
      .from(bankTokenDeposit)
      .where(
        and(
          inArray(bankTokenDeposit.contractAddress, addresses),
          lt(bankTokenDeposit.timestamp, before),
        ),
      )
      .orderBy(desc(bankTokenDeposit.timestamp))
      .limit(limit),
    db
      .select()
      .from(bankTransfer)
      .where(
        and(
          inArray(bankTransfer.contractAddress, addresses),
          lt(bankTransfer.timestamp, before),
        ),
      )
      .orderBy(desc(bankTransfer.timestamp))
      .limit(limit),
    db
      .select()
      .from(bankTokenTransfer)
      .where(
        and(
          inArray(bankTokenTransfer.contractAddress, addresses),
          lt(bankTokenTransfer.timestamp, before),
        ),
      )
      .orderBy(desc(bankTokenTransfer.timestamp))
      .limit(limit),
    db
      .select()
      .from(bankFeePaid)
      .where(
        and(
          inArray(bankFeePaid.contractAddress, addresses),
          lt(bankFeePaid.timestamp, before),
        ),
      )
      .orderBy(desc(bankFeePaid.timestamp))
      .limit(limit),
    db
      .select()
      .from(bankDividendDistributionTriggered)
      .where(
        and(
          inArray(bankDividendDistributionTriggered.contractAddress, addresses),
          lt(bankDividendDistributionTriggered.timestamp, before),
        ),
      )
      .orderBy(desc(bankDividendDistributionTriggered.timestamp))
      .limit(limit),
    db
      .select()
      .from(election)
      .where(
        and(
          inArray(election.contractAddress, addresses),
          lt(election.timestamp, before),
        ),
      )
      .orderBy(desc(election.timestamp))
      .limit(limit),
    db
      .select()
      .from(electionVote)
      .where(
        and(
          inArray(electionVote.contractAddress, addresses),
          lt(electionVote.timestamp, before),
        ),
      )
      .orderBy(desc(electionVote.timestamp))
      .limit(limit),
    db
      .select()
      .from(electionResult)
      .where(
        and(
          inArray(electionResult.contractAddress, addresses),
          lt(electionResult.timestamp, before),
        ),
      )
      .orderBy(desc(electionResult.timestamp))
      .limit(limit),
    db
      .select()
      .from(proposal)
      .where(
        and(
          inArray(proposal.contractAddress, addresses),
          lt(proposal.timestamp, before),
        ),
      )
      .orderBy(desc(proposal.timestamp))
      .limit(limit),
    db
      .select()
      .from(proposalVote)
      .where(
        and(
          inArray(proposalVote.contractAddress, addresses),
          lt(proposalVote.timestamp, before),
        ),
      )
      .orderBy(desc(proposalVote.timestamp))
      .limit(limit),
    db
      .select()
      .from(proposalTally)
      .where(
        and(
          inArray(proposalTally.contractAddress, addresses),
          lt(proposalTally.timestamp, before),
        ),
      )
      .orderBy(desc(proposalTally.timestamp))
      .limit(limit),
    db
      .select()
      .from(boardAction)
      .where(
        and(
          inArray(boardAction.contractAddress, addresses),
          lt(boardAction.timestamp, before),
        ),
      )
      .orderBy(desc(boardAction.timestamp))
      .limit(limit),
    db
      .select()
      .from(boardApproval)
      .where(
        and(
          inArray(boardApproval.contractAddress, addresses),
          lt(boardApproval.timestamp, before),
        ),
      )
      .orderBy(desc(boardApproval.timestamp))
      .limit(limit),
    db
      .select()
      .from(investorMint)
      .where(
        and(
          inArray(investorMint.contractAddress, addresses),
          lt(investorMint.timestamp, before),
        ),
      )
      .orderBy(desc(investorMint.timestamp))
      .limit(limit),
    db
      .select()
      .from(investorDividendDistributed)
      .where(
        and(
          inArray(investorDividendDistributed.contractAddress, addresses),
          lt(investorDividendDistributed.timestamp, before),
        ),
      )
      .orderBy(desc(investorDividendDistributed.timestamp))
      .limit(limit),
    db
      .select()
      .from(investorDividendPaid)
      .where(
        and(
          inArray(investorDividendPaid.contractAddress, addresses),
          lt(investorDividendPaid.timestamp, before),
        ),
      )
      .orderBy(desc(investorDividendPaid.timestamp))
      .limit(limit),
    db
      .select()
      .from(investorDividendPaymentFailed)
      .where(
        and(
          inArray(investorDividendPaymentFailed.contractAddress, addresses),
          lt(investorDividendPaymentFailed.timestamp, before),
        ),
      )
      .orderBy(desc(investorDividendPaymentFailed.timestamp))
      .limit(limit),
    db
      .select()
      .from(cashRemunerationDeposit)
      .where(
        and(
          inArray(cashRemunerationDeposit.contractAddress, addresses),
          lt(cashRemunerationDeposit.timestamp, before),
        ),
      )
      .orderBy(desc(cashRemunerationDeposit.timestamp))
      .limit(limit),
    db
      .select()
      .from(cashRemunerationWithdraw)
      .where(
        and(
          inArray(cashRemunerationWithdraw.contractAddress, addresses),
          lt(cashRemunerationWithdraw.timestamp, before),
        ),
      )
      .orderBy(desc(cashRemunerationWithdraw.timestamp))
      .limit(limit),
    db
      .select()
      .from(cashRemunerationWithdrawToken)
      .where(
        and(
          inArray(cashRemunerationWithdrawToken.contractAddress, addresses),
          lt(cashRemunerationWithdrawToken.timestamp, before),
        ),
      )
      .orderBy(desc(cashRemunerationWithdrawToken.timestamp))
      .limit(limit),
    db
      .select()
      .from(cashRemunerationWageClaim)
      .where(
        and(
          inArray(cashRemunerationWageClaim.contractAddress, addresses),
          lt(cashRemunerationWageClaim.timestamp, before),
        ),
      )
      .orderBy(desc(cashRemunerationWageClaim.timestamp))
      .limit(limit),
    db
      .select()
      .from(safeDeposit)
      .where(
        and(
          inArray(safeDeposit.contractAddress, addresses),
          lt(safeDeposit.timestamp, before),
        ),
      )
      .orderBy(desc(safeDeposit.timestamp))
      .limit(limit),
    db
      .select()
      .from(expenseDeposit)
      .where(
        and(
          inArray(expenseDeposit.contractAddress, addresses),
          lt(expenseDeposit.timestamp, before),
        ),
      )
      .orderBy(desc(expenseDeposit.timestamp))
      .limit(limit),
    db
      .select()
      .from(expenseTokenDeposit)
      .where(
        and(
          inArray(expenseTokenDeposit.contractAddress, addresses),
          lt(expenseTokenDeposit.timestamp, before),
        ),
      )
      .orderBy(desc(expenseTokenDeposit.timestamp))
      .limit(limit),
    db
      .select()
      .from(expenseTransfer)
      .where(
        and(
          inArray(expenseTransfer.contractAddress, addresses),
          lt(expenseTransfer.timestamp, before),
        ),
      )
      .orderBy(desc(expenseTransfer.timestamp))
      .limit(limit),
    db
      .select()
      .from(expenseTokenTransfer)
      .where(
        and(
          inArray(expenseTokenTransfer.contractAddress, addresses),
          lt(expenseTokenTransfer.timestamp, before),
        ),
      )
      .orderBy(desc(expenseTokenTransfer.timestamp))
      .limit(limit),
    db
      .select()
      .from(expenseApproval)
      .where(
        and(
          inArray(expenseApproval.contractAddress, addresses),
          lt(expenseApproval.timestamp, before),
        ),
      )
      .orderBy(desc(expenseApproval.timestamp))
      .limit(limit),
  ]);

  type TimelineEvent = {
    eventType: string;
    timestamp: number;
    contractAddress: string;
    data: unknown;
  };

  const tagged: TimelineEvent[] = [
    ...bankDeposits.map((r) => ({
      eventType: "BankDeposit",
      timestamp: r.timestamp,
      contractAddress: r.contractAddress,
      data: r,
    })),
    ...bankTokenDeposits.map((r) => ({
      eventType: "BankTokenDeposit",
      timestamp: r.timestamp,
      contractAddress: r.contractAddress,
      data: r,
    })),
    ...bankTransfers.map((r) => ({
      eventType: "BankTransfer",
      timestamp: r.timestamp,
      contractAddress: r.contractAddress,
      data: r,
    })),
    ...bankTokenTransfers.map((r) => ({
      eventType: "BankTokenTransfer",
      timestamp: r.timestamp,
      contractAddress: r.contractAddress,
      data: r,
    })),
    ...bankFeesPaid.map((r) => ({
      eventType: "BankFeePaid",
      timestamp: r.timestamp,
      contractAddress: r.contractAddress,
      data: r,
    })),
    ...bankDividendTriggers.map((r) => ({
      eventType: "BankDividendDistributionTriggered",
      timestamp: r.timestamp,
      contractAddress: r.contractAddress,
      data: r,
    })),
    ...elections.map((r) => ({
      eventType: "ElectionCreated",
      timestamp: r.timestamp,
      contractAddress: r.contractAddress,
      data: r,
    })),
    ...electionVotes.map((r) => ({
      eventType: "ElectionVote",
      timestamp: r.timestamp,
      contractAddress: r.contractAddress,
      data: r,
    })),
    ...electionResults.map((r) => ({
      eventType: "ElectionResult",
      timestamp: r.timestamp,
      contractAddress: r.contractAddress,
      data: r,
    })),
    ...proposals.map((r) => ({
      eventType: "ProposalCreated",
      timestamp: r.timestamp,
      contractAddress: r.contractAddress,
      data: r,
    })),
    ...proposalVotes.map((r) => ({
      eventType: "ProposalVote",
      timestamp: r.timestamp,
      contractAddress: r.contractAddress,
      data: r,
    })),
    ...proposalTallies.map((r) => ({
      eventType: "ProposalTally",
      timestamp: r.timestamp,
      contractAddress: r.contractAddress,
      data: r,
    })),
    ...boardActions.map((r) => ({
      eventType: "BoardActionAdded",
      timestamp: r.timestamp,
      contractAddress: r.contractAddress,
      data: r,
    })),
    ...boardApprovals.map((r) => ({
      eventType: "BoardApproval",
      timestamp: r.timestamp,
      contractAddress: r.contractAddress,
      data: r,
    })),
    ...investorMints.map((r) => ({
      eventType: "InvestorMint",
      timestamp: r.timestamp,
      contractAddress: r.contractAddress,
      data: r,
    })),
    ...investorDividendsDistributed.map((r) => ({
      eventType: "InvestorDividendDistributed",
      timestamp: r.timestamp,
      contractAddress: r.contractAddress,
      data: r,
    })),
    ...investorDividendsPaid.map((r) => ({
      eventType: "InvestorDividendPaid",
      timestamp: r.timestamp,
      contractAddress: r.contractAddress,
      data: r,
    })),
    ...investorDividendsFailed.map((r) => ({
      eventType: "InvestorDividendPaymentFailed",
      timestamp: r.timestamp,
      contractAddress: r.contractAddress,
      data: r,
    })),
    ...cashDeposits.map((r) => ({
      eventType: "CashRemunerationDeposit",
      timestamp: r.timestamp,
      contractAddress: r.contractAddress,
      data: r,
    })),
    ...cashWithdrawals.map((r) => ({
      eventType: "CashRemunerationWithdraw",
      timestamp: r.timestamp,
      contractAddress: r.contractAddress,
      data: r,
    })),
    ...cashTokenWithdrawals.map((r) => ({
      eventType: "CashRemunerationWithdrawToken",
      timestamp: r.timestamp,
      contractAddress: r.contractAddress,
      data: r,
    })),
    ...cashWageClaims.map((r) => ({
      eventType: "CashRemunerationWageClaim",
      timestamp: r.timestamp,
      contractAddress: r.contractAddress,
      data: r,
    })),
    ...safeDeposits.map((r) => ({
      eventType: "SafeDeposit",
      timestamp: r.timestamp,
      contractAddress: r.contractAddress,
      data: r,
    })),
    ...expenseDeposits.map((r) => ({
      eventType: "ExpenseDeposit",
      timestamp: r.timestamp,
      contractAddress: r.contractAddress,
      data: r,
    })),
    ...expenseTokenDeposits.map((r) => ({
      eventType: "ExpenseTokenDeposit",
      timestamp: r.timestamp,
      contractAddress: r.contractAddress,
      data: r,
    })),
    ...expenseTransfers.map((r) => ({
      eventType: "ExpenseTransfer",
      timestamp: r.timestamp,
      contractAddress: r.contractAddress,
      data: r,
    })),
    ...expenseTokenTransfers.map((r) => ({
      eventType: "ExpenseTokenTransfer",
      timestamp: r.timestamp,
      contractAddress: r.contractAddress,
      data: r,
    })),
    ...expenseApprovals.map((r) => ({
      eventType: "ExpenseApproval",
      timestamp: r.timestamp,
      contractAddress: r.contractAddress,
      data: r,
    })),
  ];

  tagged.sort((a, b) => b.timestamp - a.timestamp);
  const page = tagged.slice(0, limit);
  const nextBefore =
    page.length === limit ? page[page.length - 1]!.timestamp : null;

  return c.json(serializable({ teamAddress, nextBefore, events: page }));
});

// ─── Endpoint D: All activity by a user ───────────────────────────────────────
// GET /users/:userAddress/activity?limit=50&before=<unix_timestamp>
app.get("/users/:userAddress/activity", async (c) => {
  const userAddress = toHex(c.req.param("userAddress"));
  const limit = Math.min(Number(c.req.query("limit") ?? 50), 200);
  const before = Number(
    c.req.query("before") ?? Math.floor(Date.now() / 1000) + 1,
  );

  const [
    bankDeposits,
    bankTokenDeposits,
    bankTransfers,
    bankTokenTransfers,
    electionVotes,
    proposalVotes,
    boardApprovals,
    investorMints,
    investorDividendsPaid,
    investorDividendsFailed,
    cashDeposits,
    cashWithdrawals,
    cashTokenWithdrawals,
    safeDeposits,
    expenseDeposits,
    expenseTokenDeposits,
    expenseTransfers,
    expenseTokenTransfers,
  ] = await Promise.all([
    db
      .select()
      .from(bankDeposit)
      .where(
        and(
          eq(bankDeposit.depositor, userAddress),
          lt(bankDeposit.timestamp, before),
        ),
      )
      .orderBy(desc(bankDeposit.timestamp))
      .limit(limit),
    db
      .select()
      .from(bankTokenDeposit)
      .where(
        and(
          eq(bankTokenDeposit.depositor, userAddress),
          lt(bankTokenDeposit.timestamp, before),
        ),
      )
      .orderBy(desc(bankTokenDeposit.timestamp))
      .limit(limit),
    db
      .select()
      .from(bankTransfer)
      .where(
        and(
          eq(bankTransfer.sender, userAddress),
          lt(bankTransfer.timestamp, before),
        ),
      )
      .orderBy(desc(bankTransfer.timestamp))
      .limit(limit),
    db
      .select()
      .from(bankTokenTransfer)
      .where(
        and(
          eq(bankTokenTransfer.sender, userAddress),
          lt(bankTokenTransfer.timestamp, before),
        ),
      )
      .orderBy(desc(bankTokenTransfer.timestamp))
      .limit(limit),
    db
      .select()
      .from(electionVote)
      .where(
        and(
          eq(electionVote.voter, userAddress),
          lt(electionVote.timestamp, before),
        ),
      )
      .orderBy(desc(electionVote.timestamp))
      .limit(limit),
    db
      .select()
      .from(proposalVote)
      .where(
        and(
          eq(proposalVote.voter, userAddress),
          lt(proposalVote.timestamp, before),
        ),
      )
      .orderBy(desc(proposalVote.timestamp))
      .limit(limit),
    db
      .select()
      .from(boardApproval)
      .where(
        and(
          eq(boardApproval.approver, userAddress),
          lt(boardApproval.timestamp, before),
        ),
      )
      .orderBy(desc(boardApproval.timestamp))
      .limit(limit),
    db
      .select()
      .from(investorMint)
      .where(
        and(
          eq(investorMint.shareholder, userAddress),
          lt(investorMint.timestamp, before),
        ),
      )
      .orderBy(desc(investorMint.timestamp))
      .limit(limit),
    db
      .select()
      .from(investorDividendPaid)
      .where(
        and(
          eq(investorDividendPaid.shareholder, userAddress),
          lt(investorDividendPaid.timestamp, before),
        ),
      )
      .orderBy(desc(investorDividendPaid.timestamp))
      .limit(limit),
    db
      .select()
      .from(investorDividendPaymentFailed)
      .where(
        and(
          eq(investorDividendPaymentFailed.shareholder, userAddress),
          lt(investorDividendPaymentFailed.timestamp, before),
        ),
      )
      .orderBy(desc(investorDividendPaymentFailed.timestamp))
      .limit(limit),
    db
      .select()
      .from(cashRemunerationDeposit)
      .where(
        and(
          eq(cashRemunerationDeposit.depositor, userAddress),
          lt(cashRemunerationDeposit.timestamp, before),
        ),
      )
      .orderBy(desc(cashRemunerationDeposit.timestamp))
      .limit(limit),
    db
      .select()
      .from(cashRemunerationWithdraw)
      .where(
        and(
          eq(cashRemunerationWithdraw.withdrawer, userAddress),
          lt(cashRemunerationWithdraw.timestamp, before),
        ),
      )
      .orderBy(desc(cashRemunerationWithdraw.timestamp))
      .limit(limit),
    db
      .select()
      .from(cashRemunerationWithdrawToken)
      .where(
        and(
          eq(cashRemunerationWithdrawToken.withdrawer, userAddress),
          lt(cashRemunerationWithdrawToken.timestamp, before),
        ),
      )
      .orderBy(desc(cashRemunerationWithdrawToken.timestamp))
      .limit(limit),
    db
      .select()
      .from(safeDeposit)
      .where(
        and(
          eq(safeDeposit.depositor, userAddress),
          lt(safeDeposit.timestamp, before),
        ),
      )
      .orderBy(desc(safeDeposit.timestamp))
      .limit(limit),
    db
      .select()
      .from(expenseDeposit)
      .where(
        and(
          eq(expenseDeposit.depositor, userAddress),
          lt(expenseDeposit.timestamp, before),
        ),
      )
      .orderBy(desc(expenseDeposit.timestamp))
      .limit(limit),
    db
      .select()
      .from(expenseTokenDeposit)
      .where(
        and(
          eq(expenseTokenDeposit.depositor, userAddress),
          lt(expenseTokenDeposit.timestamp, before),
        ),
      )
      .orderBy(desc(expenseTokenDeposit.timestamp))
      .limit(limit),
    db
      .select()
      .from(expenseTransfer)
      .where(
        and(
          eq(expenseTransfer.withdrawer, userAddress),
          lt(expenseTransfer.timestamp, before),
        ),
      )
      .orderBy(desc(expenseTransfer.timestamp))
      .limit(limit),
    db
      .select()
      .from(expenseTokenTransfer)
      .where(
        and(
          eq(expenseTokenTransfer.withdrawer, userAddress),
          lt(expenseTokenTransfer.timestamp, before),
        ),
      )
      .orderBy(desc(expenseTokenTransfer.timestamp))
      .limit(limit),
  ]);

  type ActivityEvent = {
    eventType: string;
    timestamp: number;
    contractAddress: string;
    data: unknown;
  };

  const tagged: ActivityEvent[] = [
    ...bankDeposits.map((r) => ({
      eventType: "BankDeposit",
      timestamp: r.timestamp,
      contractAddress: r.contractAddress,
      data: r,
    })),
    ...bankTokenDeposits.map((r) => ({
      eventType: "BankTokenDeposit",
      timestamp: r.timestamp,
      contractAddress: r.contractAddress,
      data: r,
    })),
    ...bankTransfers.map((r) => ({
      eventType: "BankTransfer",
      timestamp: r.timestamp,
      contractAddress: r.contractAddress,
      data: r,
    })),
    ...bankTokenTransfers.map((r) => ({
      eventType: "BankTokenTransfer",
      timestamp: r.timestamp,
      contractAddress: r.contractAddress,
      data: r,
    })),
    ...electionVotes.map((r) => ({
      eventType: "ElectionVote",
      timestamp: r.timestamp,
      contractAddress: r.contractAddress,
      data: r,
    })),
    ...proposalVotes.map((r) => ({
      eventType: "ProposalVote",
      timestamp: r.timestamp,
      contractAddress: r.contractAddress,
      data: r,
    })),
    ...boardApprovals.map((r) => ({
      eventType: "BoardApproval",
      timestamp: r.timestamp,
      contractAddress: r.contractAddress,
      data: r,
    })),
    ...investorMints.map((r) => ({
      eventType: "InvestorMint",
      timestamp: r.timestamp,
      contractAddress: r.contractAddress,
      data: r,
    })),
    ...investorDividendsPaid.map((r) => ({
      eventType: "InvestorDividendPaid",
      timestamp: r.timestamp,
      contractAddress: r.contractAddress,
      data: r,
    })),
    ...investorDividendsFailed.map((r) => ({
      eventType: "InvestorDividendPaymentFailed",
      timestamp: r.timestamp,
      contractAddress: r.contractAddress,
      data: r,
    })),
    ...cashDeposits.map((r) => ({
      eventType: "CashRemunerationDeposit",
      timestamp: r.timestamp,
      contractAddress: r.contractAddress,
      data: r,
    })),
    ...cashWithdrawals.map((r) => ({
      eventType: "CashRemunerationWithdraw",
      timestamp: r.timestamp,
      contractAddress: r.contractAddress,
      data: r,
    })),
    ...cashTokenWithdrawals.map((r) => ({
      eventType: "CashRemunerationWithdrawToken",
      timestamp: r.timestamp,
      contractAddress: r.contractAddress,
      data: r,
    })),
    ...safeDeposits.map((r) => ({
      eventType: "SafeDeposit",
      timestamp: r.timestamp,
      contractAddress: r.contractAddress,
      data: r,
    })),
    ...expenseDeposits.map((r) => ({
      eventType: "ExpenseDeposit",
      timestamp: r.timestamp,
      contractAddress: r.contractAddress,
      data: r,
    })),
    ...expenseTokenDeposits.map((r) => ({
      eventType: "ExpenseTokenDeposit",
      timestamp: r.timestamp,
      contractAddress: r.contractAddress,
      data: r,
    })),
    ...expenseTransfers.map((r) => ({
      eventType: "ExpenseTransfer",
      timestamp: r.timestamp,
      contractAddress: r.contractAddress,
      data: r,
    })),
    ...expenseTokenTransfers.map((r) => ({
      eventType: "ExpenseTokenTransfer",
      timestamp: r.timestamp,
      contractAddress: r.contractAddress,
      data: r,
    })),
  ];

  tagged.sort((a, b) => b.timestamp - a.timestamp);
  const page = tagged.slice(0, limit);
  const nextBefore =
    page.length === limit ? page[page.length - 1]!.timestamp : null;

  return c.json(serializable({ userAddress, nextBefore, events: page }));
});

// ─── Endpoint E: Contract state queries ───────────────────────────────────────

// GET /contracts/:address/board-actions?open=true
app.get("/contracts/:address/board-actions", async (c) => {
  const address = toHex(c.req.param("address"));
  const openOnly = c.req.query("open") === "true";

  const actionsQuery = db
    .select()
    .from(boardAction)
    .where(
      openOnly
        ? and(
            eq(boardAction.contractAddress, address),
            eq(boardAction.executed, false),
          )
        : eq(boardAction.contractAddress, address),
    )
    .orderBy(desc(boardAction.timestamp));

  const actions = await actionsQuery;

  if (actions.length === 0) {
    return c.json(serializable({ contractAddress: address, actions: [] }));
  }

  const actionIds = actions.map((a) => a.actionId);

  // For each action, fetch active (non-revoked) approvals
  const allApprovals = await db
    .select()
    .from(boardApproval)
    .where(
      and(
        eq(boardApproval.contractAddress, address),
        eq(boardApproval.revoked, false),
        inArray(boardApproval.actionId, actionIds),
      ),
    );

  const approvalsByActionId = new Map<bigint, typeof allApprovals>();
  for (const approval of allApprovals) {
    const existing = approvalsByActionId.get(approval.actionId) ?? [];
    existing.push(approval);
    approvalsByActionId.set(approval.actionId, existing);
  }

  const result = actions.map((action) => ({
    ...action,
    approvals: approvalsByActionId.get(action.actionId) ?? [],
  }));

  return c.json(serializable({ contractAddress: address, actions: result }));
});

// GET /contracts/:address/wage-claims?enabled=true
app.get("/contracts/:address/wage-claims", async (c) => {
  const address = toHex(c.req.param("address"));
  const enabledFilter = c.req.query("enabled");

  // Fetch all wage claim events for the contract, newest first
  const rows = await db
    .select()
    .from(cashRemunerationWageClaim)
    .where(eq(cashRemunerationWageClaim.contractAddress, address))
    .orderBy(desc(cashRemunerationWageClaim.timestamp));

  // Deduplicate by signatureHash — keep only the latest row per hash
  const seen = new Set<string>();
  const deduplicated = rows.filter((row) => {
    if (seen.has(row.signatureHash)) return false;
    seen.add(row.signatureHash);
    return true;
  });

  const filtered =
    enabledFilter !== undefined
      ? deduplicated.filter((r) => r.enabled === (enabledFilter === "true"))
      : deduplicated;

  return c.json(
    serializable({ contractAddress: address, wageClaims: filtered }),
  );
});

// GET /contracts/:address/expense-approvals?activated=true
app.get("/contracts/:address/expense-approvals", async (c) => {
  const address = toHex(c.req.param("address"));
  const activatedFilter = c.req.query("activated");

  // Fetch all expense approval events for the contract, newest first
  const rows = await db
    .select()
    .from(expenseApproval)
    .where(eq(expenseApproval.contractAddress, address))
    .orderBy(desc(expenseApproval.timestamp));

  // Deduplicate by signatureHash — keep only the latest row per hash
  const seen = new Set<string>();
  const deduplicated = rows.filter((row) => {
    if (seen.has(row.signatureHash)) return false;
    seen.add(row.signatureHash);
    return true;
  });

  const filtered =
    activatedFilter !== undefined
      ? deduplicated.filter((r) => r.activated === (activatedFilter === "true"))
      : deduplicated;

  return c.json(
    serializable({ contractAddress: address, expenseApprovals: filtered }),
  );
});

export default app;
