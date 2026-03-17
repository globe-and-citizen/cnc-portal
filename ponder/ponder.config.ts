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

const CONTRACT_DEPLOYED_EVENT = parseAbiItem(
  "event ContractDeployed(string contractType, address deployedAddress)"
);

export default createConfig({
  chains: {
    polygon: {
      id: 137,
      rpc: process.env.PONDER_RPC_URL_137,
    },
  },
  contracts: {
    OfficerFactoryBeacon: {
      chain: "polygon",
      abi: FACTORY_BEACON_ABI,
      address: "0x0205fd32175241aA6f7398073b64bC03f910a6A0",
      startBlock: 79743826,
    },
    Officer: {
      chain: "polygon",
      abi: OFFICER_ABI,
      address: factory({
        address: "0x0205fd32175241aA6f7398073b64bC03f910a6A0",
        event: parseAbiItem(
          "event BeaconProxyCreated(address indexed proxy, address indexed deployer)"
        ),
        parameter: "proxy",
      }),
      startBlock: 79743826,
    },
    Bank: {
      chain: "polygon",
      abi: BANK_ABI,
      address: factory({
        event: CONTRACT_DEPLOYED_EVENT,
        parameter: "deployedAddress",
      }),
      startBlock: 79743826,
    },
    Elections: {
      chain: "polygon",
      abi: ELECTIONS_ABI,
      address: factory({
        event: CONTRACT_DEPLOYED_EVENT,
        parameter: "deployedAddress",
      }),
      startBlock: 79743826,
    },
    Proposals: {
      chain: "polygon",
      abi: PROPOSALS_ABI,
      address: factory({
        event: CONTRACT_DEPLOYED_EVENT,
        parameter: "deployedAddress",
      }),
      startBlock: 79743826,
    },
    BoardOfDirectors: {
      chain: "polygon",
      abi: BOARD_OF_DIRECTORS_ABI,
      address: factory({
        event: CONTRACT_DEPLOYED_EVENT,
        parameter: "deployedAddress",
      }),
      startBlock: 79743826,
    },
    InvestorV1: {
      chain: "polygon",
      abi: INVESTOR_V1_ABI,
      address: factory({
        event: CONTRACT_DEPLOYED_EVENT,
        parameter: "deployedAddress",
      }),
      startBlock: 79743826,
    },
    CashRemunerationEIP712: {
      chain: "polygon",
      abi: CASH_REMUNERATION_EIP712_ABI,
      address: factory({
        event: CONTRACT_DEPLOYED_EVENT,
        parameter: "deployedAddress",
      }),
      startBlock: 79743826,
    },
    SafeDepositRouter: {
      chain: "polygon",
      abi: SAFE_DEPOSIT_ROUTER_ABI,
      address: factory({
        event: CONTRACT_DEPLOYED_EVENT,
        parameter: "deployedAddress",
      }),
      startBlock: 79743826,
    },
    ExpenseAccountEIP712: {
      chain: "polygon",
      abi: EXPENSE_ACCOUNT_EIP712_ABI,
      address: factory({
        event: CONTRACT_DEPLOYED_EVENT,
        parameter: "deployedAddress",
      }),
      startBlock: 79743826,
    },
  },
});
