import { createConfig, factory, loadBalance, rateLimit } from "ponder";
import { http, fallback, parseAbiItem } from "viem";
import { FACTORY_BEACON_ABI } from "./abis/factory-beacon";
import { OFFICER_ABI } from "./abis/officer";
import { BANK_ABI } from "./abis/bank";
import { ELECTIONS_ABI } from "./abis/elections";
import { PROPOSALS_ABI } from "./abis/proposals";
import { BOARD_OF_DIRECTORS_ABI } from "./abis/board-of-directors";
import { INVESTOR_V1_ABI } from "./abis/investor-v1";
import { CASH_REMUNERATION_EIP712_ABI } from "./abis/cash-remuneration-eip712";
import { SAFE_DEPOSIT_ROUTER_ABI } from "./abis/safe-deposit-router";
import { EXPENSE_ACCOUNT_EIP712_ABI } from "./abis/expense-account-eip712";
import { FEE_COLLECTOR_ABI } from "./abis/fee-collector";

const CONTRACT_DEPLOYED_EVENT = parseAbiItem(
  "event ContractDeployed(string contractType, address deployedAddress)",
);

// ─── Network selection ────────────────────────────────────────────────────────
// Set NETWORK=hardhat in .env.local to index a local Hardhat node.
// Default: polygon
const isHardhat = process.env.NETWORK === "hardhat";
const chainName = isHardhat ? "hardhat" : "polygon";

// Factory contract address differs per network.
// On Hardhat this changes every redeployment — set FACTORY_ADDRESS in .env.local.
if (isHardhat && !process.env.FACTORY_ADDRESS) {
  throw new Error(
    "FACTORY_ADDRESS must be set in .env.local when NETWORK=hardhat. " +
      "Deploy contracts and copy the OfficerFactoryBeacon address.",
  );
}
const factoryAddress = (
  isHardhat
    ? process.env.FACTORY_ADDRESS!
    : "0x0205fd32175241aA6f7398073b64bC03f910a6A0"
) as `0x${string}`;

if (!process.env.FEE_COLLECTOR_ADDRESS) {
  throw new Error("FEE_COLLECTOR_ADDRESS must be set in .env.local.");
}
const feeCollectorAddress = process.env.FEE_COLLECTOR_ADDRESS as `0x${string}`;

// On Hardhat start from block 0; on Polygon skip pre-deployment blocks.
const startBlock = isHardhat ? 0 : Number(process.env.START_BLOCK);

// ─── Polygon RPC transport ──────────────────────────────────────────────────
// Two pools of comma-separated URLs: a primary pool that is load-balanced
// (round-robin), and an optional backup pool used only when the whole primary
// pool fails. Each endpoint is independently rate-limited to stay under the
// provider's per-key limit and avoid 429s.
const POLYGON_RPS = Number(process.env.PONDER_RPC_MAX_RPS ?? 25);

const parseRpcUrls = (value: string | undefined): string[] =>
  (value ?? "")
    .split(",")
    .map((url) => url.trim())
    .filter(Boolean);

// Falls back to the legacy single-URL var so existing deployments keep working.
const primaryRpcUrls = parseRpcUrls(
  process.env.PONDER_RPC_URLS_137 ?? process.env.PONDER_RPC_URL_137,
);
const backupRpcUrls = parseRpcUrls(process.env.PONDER_RPC_URLS_137_BACKUP);

if (!isHardhat && primaryRpcUrls.length === 0) {
  throw new Error(
    "Set PONDER_RPC_URLS_137 (comma-separated) or PONDER_RPC_URL_137 for Polygon.",
  );
}

const rateLimitedPool = (urls: string[]) =>
  loadBalance(
    urls.map((url) => rateLimit(http(url), { requestsPerSecond: POLYGON_RPS })),
  );

const polygonRpc =
  primaryRpcUrls.length === 0
    ? undefined
    : backupRpcUrls.length > 0
      ? fallback([
          rateLimitedPool(primaryRpcUrls),
          rateLimitedPool(backupRpcUrls),
        ])
      : rateLimitedPool(primaryRpcUrls);

// Optional WebSocket endpoint for real-time block subscriptions (newHeads).
// Cuts realtime RPC usage vs polling; Ponder reverts to polling if it drops.
// Ponder's `ws` field takes a single URL, so we accept a comma-separated list
// and use the first entry; the rest are documented alternates (reorder to swap).
const wsUrls = parseRpcUrls(
  process.env.PONDER_WS_URLS_137 ?? process.env.PONDER_WS_URL_137,
);
const polygonWs = wsUrls[0] || undefined;

// ─── Shared factory helper ────────────────────────────────────────────────────
const subContractFactory = factory({
  event: CONTRACT_DEPLOYED_EVENT,
  parameter: "deployedAddress",
});
export default createConfig({
  chains: {
    polygon: {
      id: 137,
      rpc: polygonRpc,
      ws: polygonWs,
    },
    ...(isHardhat
      ? {
          hardhat: {
            id: 31337,
            rpc: process.env.PONDER_RPC_URL_HARDHAT ?? "http://127.0.0.1:8545",
          },
        }
      : {}),
  },
  contracts: {
    OfficerFactoryBeacon: {
      chain: chainName,
      abi: FACTORY_BEACON_ABI,
      address: factoryAddress,
      startBlock,
    },
    Officer: {
      chain: chainName,
      abi: OFFICER_ABI,
      address: factory({
        address: factoryAddress,
        event: parseAbiItem(
          "event BeaconProxyCreated(address indexed proxy, address indexed deployer)",
        ),
        parameter: "proxy",
      }),
      startBlock,
    },
    Bank: {
      chain: chainName,
      abi: BANK_ABI,
      address: subContractFactory,
      startBlock,
    },
    Elections: {
      chain: chainName,
      abi: ELECTIONS_ABI,
      address: subContractFactory,
      startBlock,
    },
    Proposals: {
      chain: chainName,
      abi: PROPOSALS_ABI,
      address: subContractFactory,
      startBlock,
    },
    BoardOfDirectors: {
      chain: chainName,
      abi: BOARD_OF_DIRECTORS_ABI,
      address: subContractFactory,
      startBlock,
    },
    InvestorV1: {
      chain: chainName,
      abi: INVESTOR_V1_ABI,
      address: subContractFactory,
      startBlock,
    },
    CashRemunerationEIP712: {
      chain: chainName,
      abi: CASH_REMUNERATION_EIP712_ABI,
      address: subContractFactory,
      startBlock,
    },
    SafeDepositRouter: {
      chain: chainName,
      abi: SAFE_DEPOSIT_ROUTER_ABI,
      address: subContractFactory,
      startBlock,
    },
    ExpenseAccountEIP712: {
      chain: chainName,
      abi: EXPENSE_ACCOUNT_EIP712_ABI,
      address: subContractFactory,
      startBlock,
    },
    FeeCollector: {
      chain: chainName,
      abi: FEE_COLLECTOR_ABI,
      address: feeCollectorAddress,
      startBlock,
    },
  },
});
