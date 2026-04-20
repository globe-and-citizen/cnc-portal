import { createConfig, factory } from "ponder";
import { parseAbiItem } from "viem";
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
import { VESTING_ABI } from "./abis/vesting";

const CONTRACT_DEPLOYED_EVENT = parseAbiItem(
  "event ContractDeployed(string contractType, address deployedAddress)",
);
const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000" as const;

const getRequiredAddress = (
  value: string | undefined,
  label: string,
): `0x${string}` => {
  if (!value || value.trim() === "") {
    throw new Error(`${label} must be set in .env.local`);
  }
  return value as `0x${string}`;
};

const getOptionalAddress = (value: string | undefined): `0x${string}` => {
  if (!value || value.trim() === "") return ZERO_ADDRESS;
  return value as `0x${string}`;
};

const getStartBlock = (value: string | undefined, fallback: number): number => {
  if (!value || value.trim() === "") return fallback;
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 0) {
    throw new Error("START_BLOCK must be a non-negative integer");
  }
  return parsed;
};

// ─── Network selection ────────────────────────────────────────────────────────
// Set NETWORK=hardhat in .env.local to index a local Hardhat node.
// Default: polygon
const isHardhat = process.env.NETWORK === "hardhat";

const chainName = isHardhat ? "hardhat" : "polygon";

const activeChains = isHardhat
  ? {
      hardhat: {
        id: 31337,
        rpc: process.env.PONDER_RPC_URL_HARDHAT ?? "http://127.0.0.1:8545",
      },
    }
  : {
      polygon: {
        id: 137,
        rpc: process.env.PONDER_RPC_URL_137,
      },
    };

// Factory contract address differs per network.
// On Hardhat this changes every redeployment, but we keep one env name for all networks.
const factoryAddress = getRequiredAddress(
  process.env.FACTORY_ADDRESS,
  "FACTORY_ADDRESS",
);

console.log(`Using factory address ${factoryAddress} on chain ${chainName}`);
// On Hardhat start from block 0; on Polygon use an early deployment block by default.
// You can override with START_BLOCK in .env.local.
const defaultStartBlock = isHardhat ? 0 : 79743826;
const startBlock = getStartBlock(process.env.START_BLOCK, defaultStartBlock);

const feeCollectorAddress = getOptionalAddress(
  process.env.FEE_COLLECTOR_ADDRESS,
);

const vestingAddress = getOptionalAddress(process.env.VESTING_ADDRESS);

// ─── Shared factory helper ────────────────────────────────────────────────────
const subContractFactory = factory({
  event: CONTRACT_DEPLOYED_EVENT,
  parameter: "deployedAddress",
});

export default createConfig({
  chains: activeChains,
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
    Vesting: {
      chain: chainName,
      abi: VESTING_ABI,
      address: vestingAddress,
      startBlock,
    },
  },
});
