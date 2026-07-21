import fs from "node:fs";
import { fileURLToPath } from "node:url";
import { createConfig, factory, loadBalance, rateLimit } from "ponder";
import { http, fallback, parseAbiItem } from "viem";
import { FACTORY_BEACON_ABI } from "./abis/factory-beacon";
import { OFFICER_ABI } from "./abis/officer";
import { BANK_ABI } from "./abis/bank";
import { ELECTIONS_ABI } from "./abis/elections";
import { PROPOSALS_ABI } from "./abis/proposals";
import { BOARD_OF_DIRECTORS_ABI } from "./abis/board-of-directors";
import { INVESTOR_V1_ABI } from "./abis/investor-v1";
import { INVESTOR_ABI } from "./abis/investor";
import { CASH_REMUNERATION_EIP712_ABI } from "./abis/cash-remuneration-eip712";
import { SAFE_DEPOSIT_ROUTER_ABI } from "./abis/safe-deposit-router";
import { VESTING_ABI } from "./abis/vesting";
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
const chainId = isHardhat ? 31337 : 137;

// ─── Address resolution ───────────────────────────────────────────────────────
// Addresses come from the per-network deployment artifact synced by `npm run mc`
// in contract/ — the same chain-<id>.json the frontend consumes. So a local
// redeploy + `npm run mc` keeps Ponder in sync with zero manual copy.
// Env vars (FACTORY_ADDRESS / FEE_COLLECTOR_ADDRESS) override the artifact.
const deployedAddresses = ((): Record<string, string> => {
  const file = fileURLToPath(
    new URL(
      `./artifacts/deployed_addresses/chain-${chainId}.json`,
      import.meta.url,
    ),
  );
  try {
    return JSON.parse(fs.readFileSync(file, "utf8"));
  } catch {
    // chain-31337.json is gitignored — absent until the dev deploys + runs `mc`.
    return {};
  }
})();

// Polygon's production indexer has historically pointed at this factory, which
// currently differs from the artifact's Officer#FactoryBeacon. Keep it pinned
// until the canonical mainnet factory is verified on-chain, then delete this map
// to fall back to the artifact like every other network.
const FACTORY_PIN: Record<number, `0x${string}`> = {
  137: "0x0205fd32175241aA6f7398073b64bC03f910a6A0",
};

const missing = (label: string, envVar: string) =>
  `No ${label} address for chain ${chainId}. ` +
  (isHardhat
    ? `Deploy contracts to your local node and run \`npm run mc\` in contract/, or set ${envVar} in .env.local.`
    : `Set ${envVar} in .env.local or sync chain-137.json.`);

const factoryAddress = (process.env.FACTORY_ADDRESS ??
  FACTORY_PIN[chainId] ??
  deployedAddresses["Officer#FactoryBeacon"]) as `0x${string}` | undefined;
if (!factoryAddress)
  throw new Error(missing("OfficerFactoryBeacon", "FACTORY_ADDRESS"));

const feeCollectorAddress = (process.env.FEE_COLLECTOR_ADDRESS ??
  deployedAddresses["FeeCollectorModule#FeeCollector"]) as
  | `0x${string}`
  | undefined;
if (!feeCollectorAddress)
  throw new Error(missing("FeeCollector", "FEE_COLLECTOR_ADDRESS"));

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
    Investor: {
      chain: chainName,
      abi: INVESTOR_ABI,
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
    Vesting: {
      chain: chainName,
      abi: VESTING_ABI,
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
