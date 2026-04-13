import { db } from "ponder:api";
import {
  teamContract,
  bankDeposit,
  bankTokenDeposit,
  bankTransfer,
  bankTokenTransfer,
  bankDividendDistributionTriggered,
  cashRemunerationDeposit,
  cashRemunerationWithdraw,
  cashRemunerationWithdrawToken,
  expenseDeposit,
  expenseTokenDeposit,
  expenseTransfer,
  expenseTokenTransfer,
  investorMint,
  investorDividendDistributed,
  investorDividendPaid,
  investorDividendPaymentFailed,
} from "ponder:schema";
import { and, desc, eq, lt } from "ponder";
import type { Context, Hono } from "hono";

type HexAddress = `0x${string}`;

const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000" as HexAddress;

type CompatTransaction = {
  id: string;
  from: HexAddress;
  to: HexAddress;
  amount: bigint;
  contractType: string;
  tokenAddress: HexAddress;
  contractAddress: HexAddress;
  transactionHash: HexAddress;
  blockNumber: bigint;
  blockTimestamp: number;
  transactionType: string;
};

function serializable<T>(value: T): T {
  return JSON.parse(
    JSON.stringify(value, (_key, val) => (typeof val === "bigint" ? val.toString() : val)),
  ) as T;
}

function toHex(s: string): HexAddress {
  return s.toLowerCase() as HexAddress;
}

function toOptionalNumber(value: string | undefined): number | undefined {
  if (!value) return undefined;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function txHashFromId(id: string): HexAddress {
  const matched = id.match(/^0x[a-fA-F0-9]{64}/)?.[0];
  return toHex(matched ?? ZERO_ADDRESS);
}

async function fetchBankCompatTransactions(
  address: HexAddress,
  before: number,
  limit: number,
): Promise<CompatTransaction[]> {
  const [deposits, tokenDeposits, transfers, tokenTransfers, dividendTriggers] = await Promise.all([
    db
      .select()
      .from(bankDeposit)
      .where(and(eq(bankDeposit.contractAddress, address), lt(bankDeposit.timestamp, before)))
      .orderBy(desc(bankDeposit.timestamp))
      .limit(limit),
    db
      .select()
      .from(bankTokenDeposit)
      .where(and(eq(bankTokenDeposit.contractAddress, address), lt(bankTokenDeposit.timestamp, before)))
      .orderBy(desc(bankTokenDeposit.timestamp))
      .limit(limit),
    db
      .select()
      .from(bankTransfer)
      .where(and(eq(bankTransfer.contractAddress, address), lt(bankTransfer.timestamp, before)))
      .orderBy(desc(bankTransfer.timestamp))
      .limit(limit),
    db
      .select()
      .from(bankTokenTransfer)
      .where(and(eq(bankTokenTransfer.contractAddress, address), lt(bankTokenTransfer.timestamp, before)))
      .orderBy(desc(bankTokenTransfer.timestamp))
      .limit(limit),
    db
      .select()
      .from(bankDividendDistributionTriggered)
      .where(
        and(
          eq(bankDividendDistributionTriggered.contractAddress, address),
          lt(bankDividendDistributionTriggered.timestamp, before),
        ),
      )
      .orderBy(desc(bankDividendDistributionTriggered.timestamp))
      .limit(limit),
  ]);

  return [
    ...deposits.map(
      (r): CompatTransaction => ({
        id: r.id,
        from: r.depositor,
        to: r.contractAddress,
        amount: r.amount,
        contractType: "Bank",
        tokenAddress: ZERO_ADDRESS,
        contractAddress: r.contractAddress,
        transactionHash: txHashFromId(r.id),
        blockNumber: r.blockNumber,
        blockTimestamp: r.timestamp,
        transactionType: "deposit",
      }),
    ),
    ...tokenDeposits.map(
      (r): CompatTransaction => ({
        id: r.id,
        from: r.depositor,
        to: r.contractAddress,
        amount: r.amount,
        contractType: "Bank",
        tokenAddress: r.token,
        contractAddress: r.contractAddress,
        transactionHash: txHashFromId(r.id),
        blockNumber: r.blockNumber,
        blockTimestamp: r.timestamp,
        transactionType: "deposit",
      }),
    ),
    ...transfers.map(
      (r): CompatTransaction => ({
        id: r.id,
        from: r.sender,
        to: r.to,
        amount: r.amount,
        contractType: "Bank",
        tokenAddress: ZERO_ADDRESS,
        contractAddress: r.contractAddress,
        transactionHash: txHashFromId(r.id),
        blockNumber: r.blockNumber,
        blockTimestamp: r.timestamp,
        transactionType: "transfer",
      }),
    ),
    ...tokenTransfers.map(
      (r): CompatTransaction => ({
        id: r.id,
        from: r.sender,
        to: r.to,
        amount: r.amount,
        contractType: "Bank",
        tokenAddress: r.token,
        contractAddress: r.contractAddress,
        transactionHash: txHashFromId(r.id),
        blockNumber: r.blockNumber,
        blockTimestamp: r.timestamp,
        transactionType: "transfer",
      }),
    ),
    ...dividendTriggers.map(
      (r): CompatTransaction => ({
        id: r.id,
        from: r.contractAddress,
        to: r.investor,
        amount: r.totalAmount,
        contractType: "Bank",
        tokenAddress: r.token,
        contractAddress: r.contractAddress,
        transactionHash: txHashFromId(r.id),
        blockNumber: r.blockNumber,
        blockTimestamp: r.timestamp,
        transactionType: r.token === ZERO_ADDRESS ? "dividendClaim" : "tokenDividendClaim",
      }),
    ),
  ];
}

async function fetchCashCompatTransactions(
  address: HexAddress,
  before: number,
  limit: number,
): Promise<CompatTransaction[]> {
  const [deposits, withdrawals, tokenWithdrawals] = await Promise.all([
    db
      .select()
      .from(cashRemunerationDeposit)
      .where(
        and(eq(cashRemunerationDeposit.contractAddress, address), lt(cashRemunerationDeposit.timestamp, before)),
      )
      .orderBy(desc(cashRemunerationDeposit.timestamp))
      .limit(limit),
    db
      .select()
      .from(cashRemunerationWithdraw)
      .where(
        and(eq(cashRemunerationWithdraw.contractAddress, address), lt(cashRemunerationWithdraw.timestamp, before)),
      )
      .orderBy(desc(cashRemunerationWithdraw.timestamp))
      .limit(limit),
    db
      .select()
      .from(cashRemunerationWithdrawToken)
      .where(
        and(
          eq(cashRemunerationWithdrawToken.contractAddress, address),
          lt(cashRemunerationWithdrawToken.timestamp, before),
        ),
      )
      .orderBy(desc(cashRemunerationWithdrawToken.timestamp))
      .limit(limit),
  ]);

  return [
    ...deposits.map(
      (r): CompatTransaction => ({
        id: r.id,
        from: r.depositor,
        to: r.contractAddress,
        amount: r.amount,
        contractType: "CashRemunerationEIP712",
        tokenAddress: ZERO_ADDRESS,
        contractAddress: r.contractAddress,
        transactionHash: txHashFromId(r.id),
        blockNumber: r.blockNumber,
        blockTimestamp: r.timestamp,
        transactionType: "deposit",
      }),
    ),
    ...withdrawals.map(
      (r): CompatTransaction => ({
        id: r.id,
        from: r.contractAddress,
        to: r.withdrawer,
        amount: r.amount,
        contractType: "CashRemunerationEIP712",
        tokenAddress: ZERO_ADDRESS,
        contractAddress: r.contractAddress,
        transactionHash: txHashFromId(r.id),
        blockNumber: r.blockNumber,
        blockTimestamp: r.timestamp,
        transactionType: "withdraw",
      }),
    ),
    ...tokenWithdrawals.map(
      (r): CompatTransaction => ({
        id: r.id,
        from: r.contractAddress,
        to: r.withdrawer,
        amount: r.amount,
        contractType: "CashRemunerationEIP712",
        tokenAddress: r.tokenAddress,
        contractAddress: r.contractAddress,
        transactionHash: txHashFromId(r.id),
        blockNumber: r.blockNumber,
        blockTimestamp: r.timestamp,
        transactionType: "withdraw",
      }),
    ),
  ];
}

async function fetchExpenseCompatTransactions(
  address: HexAddress,
  before: number,
  limit: number,
): Promise<CompatTransaction[]> {
  const [deposits, tokenDeposits, transfers, tokenTransfers] = await Promise.all([
    db
      .select()
      .from(expenseDeposit)
      .where(and(eq(expenseDeposit.contractAddress, address), lt(expenseDeposit.timestamp, before)))
      .orderBy(desc(expenseDeposit.timestamp))
      .limit(limit),
    db
      .select()
      .from(expenseTokenDeposit)
      .where(and(eq(expenseTokenDeposit.contractAddress, address), lt(expenseTokenDeposit.timestamp, before)))
      .orderBy(desc(expenseTokenDeposit.timestamp))
      .limit(limit),
    db
      .select()
      .from(expenseTransfer)
      .where(and(eq(expenseTransfer.contractAddress, address), lt(expenseTransfer.timestamp, before)))
      .orderBy(desc(expenseTransfer.timestamp))
      .limit(limit),
    db
      .select()
      .from(expenseTokenTransfer)
      .where(and(eq(expenseTokenTransfer.contractAddress, address), lt(expenseTokenTransfer.timestamp, before)))
      .orderBy(desc(expenseTokenTransfer.timestamp))
      .limit(limit),
  ]);

  return [
    ...deposits.map(
      (r): CompatTransaction => ({
        id: r.id,
        from: r.depositor,
        to: r.contractAddress,
        amount: r.amount,
        contractType: "ExpenseAccountEIP712",
        tokenAddress: ZERO_ADDRESS,
        contractAddress: r.contractAddress,
        transactionHash: txHashFromId(r.id),
        blockNumber: r.blockNumber,
        blockTimestamp: r.timestamp,
        transactionType: "deposit",
      }),
    ),
    ...tokenDeposits.map(
      (r): CompatTransaction => ({
        id: r.id,
        from: r.depositor,
        to: r.contractAddress,
        amount: r.amount,
        contractType: "ExpenseAccountEIP712",
        tokenAddress: r.token,
        contractAddress: r.contractAddress,
        transactionHash: txHashFromId(r.id),
        blockNumber: r.blockNumber,
        blockTimestamp: r.timestamp,
        transactionType: "deposit",
      }),
    ),
    ...transfers.map(
      (r): CompatTransaction => ({
        id: r.id,
        from: r.withdrawer,
        to: r.to,
        amount: r.amount,
        contractType: "ExpenseAccountEIP712",
        tokenAddress: ZERO_ADDRESS,
        contractAddress: r.contractAddress,
        transactionHash: txHashFromId(r.id),
        blockNumber: r.blockNumber,
        blockTimestamp: r.timestamp,
        transactionType: "transfer",
      }),
    ),
    ...tokenTransfers.map(
      (r): CompatTransaction => ({
        id: r.id,
        from: r.withdrawer,
        to: r.to,
        amount: r.amount,
        contractType: "ExpenseAccountEIP712",
        tokenAddress: r.token,
        contractAddress: r.contractAddress,
        transactionHash: txHashFromId(r.id),
        blockNumber: r.blockNumber,
        blockTimestamp: r.timestamp,
        transactionType: "transfer",
      }),
    ),
  ];
}

async function fetchInvestorCompatTransactions(
  address: HexAddress,
  before: number,
  limit: number,
): Promise<CompatTransaction[]> {
  const [mints, distributed, paid, failed] = await Promise.all([
    db
      .select()
      .from(investorMint)
      .where(and(eq(investorMint.contractAddress, address), lt(investorMint.timestamp, before)))
      .orderBy(desc(investorMint.timestamp))
      .limit(limit),
    db
      .select()
      .from(investorDividendDistributed)
      .where(
        and(
          eq(investorDividendDistributed.contractAddress, address),
          lt(investorDividendDistributed.timestamp, before),
        ),
      )
      .orderBy(desc(investorDividendDistributed.timestamp))
      .limit(limit),
    db
      .select()
      .from(investorDividendPaid)
      .where(and(eq(investorDividendPaid.contractAddress, address), lt(investorDividendPaid.timestamp, before)))
      .orderBy(desc(investorDividendPaid.timestamp))
      .limit(limit),
    db
      .select()
      .from(investorDividendPaymentFailed)
      .where(
        and(
          eq(investorDividendPaymentFailed.contractAddress, address),
          lt(investorDividendPaymentFailed.timestamp, before),
        ),
      )
      .orderBy(desc(investorDividendPaymentFailed.timestamp))
      .limit(limit),
  ]);

  return [
    ...mints.map(
      (r): CompatTransaction => ({
        id: r.id,
        from: ZERO_ADDRESS,
        to: r.shareholder,
        amount: r.amount,
        contractType: "InvestorV1",
        tokenAddress: r.contractAddress,
        contractAddress: r.contractAddress,
        transactionHash: txHashFromId(r.id),
        blockNumber: r.blockNumber,
        blockTimestamp: r.timestamp,
        transactionType: "mint",
      }),
    ),
    ...distributed.map(
      (r): CompatTransaction => ({
        id: r.id,
        from: r.distributor,
        to: r.contractAddress,
        amount: r.totalAmount,
        contractType: "InvestorV1",
        tokenAddress: r.token,
        contractAddress: r.contractAddress,
        transactionHash: txHashFromId(r.id),
        blockNumber: r.blockNumber,
        blockTimestamp: r.timestamp,
        transactionType: "dividend",
      }),
    ),
    ...paid.map(
      (r): CompatTransaction => ({
        id: r.id,
        from: r.contractAddress,
        to: r.shareholder,
        amount: r.amount,
        contractType: "InvestorV1",
        tokenAddress: r.token,
        contractAddress: r.contractAddress,
        transactionHash: txHashFromId(r.id),
        blockNumber: r.blockNumber,
        blockTimestamp: r.timestamp,
        transactionType: "dividend",
      }),
    ),
    ...failed.map(
      (r): CompatTransaction => ({
        id: r.id,
        from: r.contractAddress,
        to: r.shareholder,
        amount: r.amount,
        contractType: "InvestorV1",
        tokenAddress: r.token,
        contractAddress: r.contractAddress,
        transactionHash: txHashFromId(r.id),
        blockNumber: r.blockNumber,
        blockTimestamp: r.timestamp,
        transactionType: "dividend",
      }),
    ),
  ];
}

async function fetchCompatTransactionsByContractType(
  address: HexAddress,
  contractType: string,
  before: number,
  limit: number,
): Promise<CompatTransaction[]> {
  if (contractType === "Bank") return fetchBankCompatTransactions(address, before, limit);
  if (contractType === "CashRemunerationEIP712")
    return fetchCashCompatTransactions(address, before, limit);
  if (contractType === "ExpenseAccountEIP712")
    return fetchExpenseCompatTransactions(address, before, limit);
  if (contractType === "InvestorV1") return fetchInvestorCompatTransactions(address, before, limit);
  return [];
}

function parseLimit(rawValue: string | undefined, fallback: number): number {
  const parsed = Number(rawValue ?? fallback);
  if (!Number.isFinite(parsed) || parsed <= 0) return fallback;
  return Math.min(Math.floor(parsed), 200);
}

function parseBefore(rawValue: string | undefined): number {
  const fallback = Math.floor(Date.now() / 1000) + 1;
  const parsed = Number(rawValue ?? fallback);
  if (!Number.isFinite(parsed) || parsed <= 0) return fallback;
  return Math.floor(parsed);
}

async function handleCompatTransactionsRequest(
  c: Context,
  expectedContractType?: string,
  forcedTransactionTypes?: string[],
) {
  const rawAddress = c.req.param("address");
  if (!rawAddress) {
    return c.json({ error: "Missing address parameter" }, 400);
  }
  const address = toHex(rawAddress);
  const limit = parseLimit(c.req.query("limit"), 100);
  const before = parseBefore(c.req.query("before"));
  const orderDirection = (c.req.query("orderDirection") ?? "desc").toLowerCase();
  const transactionType = c.req.query("transactionType");
  const transactionTypeIn = c.req.query("transactionType_in");
  const blockTimestampGte = toOptionalNumber(c.req.query("blockTimestamp_gte"));
  const blockTimestampLte = toOptionalNumber(c.req.query("blockTimestamp_lte"));

  const contracts = await db
    .select()
    .from(teamContract)
    .where(eq(teamContract.contractAddress, address));

  if (contracts.length === 0 && !expectedContractType) {
    return c.json({ error: "Contract not found" }, 404);
  }

  const contractType = contracts[0]?.contractType ?? expectedContractType!;
  const teamAddress = contracts[0]?.teamAddress ?? null;

  if (expectedContractType && contractType !== expectedContractType) {
    return c.json(
      {
        error: "Contract type mismatch",
        expected: expectedContractType,
        actual: contractType,
      },
      400,
    );
  }

  let transactions = await fetchCompatTransactionsByContractType(address, contractType, before, limit);

  if (forcedTransactionTypes && forcedTransactionTypes.length > 0) {
    const forced = new Set(forcedTransactionTypes);
    transactions = transactions.filter((tx) => forced.has(tx.transactionType));
  }

  if (transactionType) {
    transactions = transactions.filter((tx) => tx.transactionType === transactionType);
  }

  if (transactionTypeIn) {
    const wanted = new Set(
      transactionTypeIn
        .split(",")
        .map((v) => v.trim())
        .filter(Boolean),
    );
    transactions = transactions.filter((tx) => wanted.has(tx.transactionType));
  }

  if (blockTimestampGte !== undefined) {
    transactions = transactions.filter((tx) => tx.blockTimestamp >= blockTimestampGte);
  }

  if (blockTimestampLte !== undefined) {
    transactions = transactions.filter((tx) => tx.blockTimestamp <= blockTimestampLte);
  }

  transactions.sort((a, b) =>
    orderDirection === "asc" ? a.blockTimestamp - b.blockTimestamp : b.blockTimestamp - a.blockTimestamp,
  );

  const page = transactions.slice(0, limit);
  const nextBefore = page.length === limit ? page[page.length - 1]!.blockTimestamp : null;

  return c.json(
    serializable({
      contractAddress: address,
      contractType,
      teamAddress,
      nextBefore,
      results: page,
    }),
  );
}

export function registerTheGraphCompatRoutes(app: Hono) {
  // Generic compatibility endpoint for `transactions(...)` style TheGraph queries.
  // GET /thegraph/contracts/:address/transactions
  app.get("/thegraph/contracts/:address/transactions", async (c) => handleCompatTransactionsRequest(c));

  // App-level aliases matching current TheGraph usage by feature.
  app.get("/thegraph/bank/:address/transactions", async (c) =>
    handleCompatTransactionsRequest(c, "Bank"),
  );
  app.get("/thegraph/cash-remuneration/:address/transactions", async (c) =>
    handleCompatTransactionsRequest(c, "CashRemunerationEIP712"),
  );
  app.get("/thegraph/expense/:address/transactions", async (c) =>
    handleCompatTransactionsRequest(c, "ExpenseAccountEIP712"),
  );
  app.get("/thegraph/investor/:address/transactions", async (c) =>
    handleCompatTransactionsRequest(c, "InvestorV1"),
  );

  // Equivalent of:
  // transactionType_in: ["dividendClaim", "tokenDividendClaim"]
  app.get("/thegraph/bank/:address/dividend-claims", async (c) =>
    handleCompatTransactionsRequest(c, "Bank", ["dividendClaim", "tokenDividendClaim"]),
  );
}
