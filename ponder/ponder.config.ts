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
import { TIPS_ABI } from "./abis/tips";

const CONTRACT_DEPLOYED_EVENT = parseAbiItem(
  "event ContractDeployed(string contractType, address deployedAddress)"
);
const ERC20_TRANSFER_EVENT = parseAbiItem(
  "event Transfer(address indexed from, address indexed to, uint256 value)"
);
const ERC20_TRANSFER_ABI = [ERC20_TRANSFER_EVENT] as const;
const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000" as const;

const getRequiredAddress = (
  value: string | undefined,
  label: string
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

// ─── Network selection ────────────────────────────────────────────────────────
// Set NETWORK=hardhat in .env.local to index a local Hardhat node.
// Default: polygon
const isHardhat = process.env.NETWORK === "hardhat";

// Both chains are defined so TypeScript can resolve contract `chain` references.
// Only the active chain is actually used by ponder at runtime.
const chainName = isHardhat ? "hardhat" : "polygon";

// Factory contract address differs per network.
// On Hardhat this changes every redeployment, but we keep one env name for all networks.
const factoryAddress = getRequiredAddress(
  process.env.FACTORY_ADDRESS,
  "FACTORY_ADDRESS"
);

// On Hardhat start from block 0; on Polygon skip pre-deployment blocks.
const startBlock = isHardhat ? 0 : 79743826;

const feeCollectorAddress = getOptionalAddress(process.env.FEE_COLLECTOR_ADDRESS);

const vestingAddress = getOptionalAddress(process.env.VESTING_ADDRESS);

const tipsAddress = getOptionalAddress(process.env.TIPS_ADDRESS);
const usdcAddress = getOptionalAddress(process.env.USDC_ADDRESS);
const usdceAddress = getOptionalAddress(process.env.USDC_E_ADDRESS);
const usdtAddress = getOptionalAddress(process.env.USDT_ADDRESS);

// ─── Shared factory helper ────────────────────────────────────────────────────
const subContractFactory = factory({
  event: CONTRACT_DEPLOYED_EVENT,
  parameter: "deployedAddress",
});

export default createConfig({
  chains: {
    polygon: {
      id: 137,
      rpc: process.env.PONDER_RPC_URL_137,
    },
    hardhat: {
      id: 31337,
      rpc: process.env.PONDER_RPC_URL_HARDHAT ?? "http://127.0.0.1:8545",
    },
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
          "event BeaconProxyCreated(address indexed proxy, address indexed deployer)"
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
    Tips: {
      chain: chainName,
      abi: TIPS_ABI,
      address: tipsAddress,
      startBlock,
    },
    USDC: {
      chain: chainName,
      abi: ERC20_TRANSFER_ABI,
      address: usdcAddress,
      startBlock,
    },
    USDCe: {
      chain: chainName,
      abi: ERC20_TRANSFER_ABI,
      address: usdceAddress,
      startBlock,
    },
    USDT: {
      chain: chainName,
      abi: ERC20_TRANSFER_ABI,
      address: usdtAddress,
      startBlock,
    },
  },
});
