import { beforeEach } from "node:test";
import { describe, it, vi } from "vitest";
import publicClient from "../../utils/viem.config";
import OFFICER_ABI from "../../artifacts/officer_abi.json";
import { Team } from "@prisma/client";

const mockTeam = {
  id: 1,
  ownerAddress: "0xOwnerAddress",
  officerAddress: "0xOfficerAddress",
  name: "Test Team",
  description: "Test Description",
} as Team;

const mockContracts = [
  { contractType: "Bank", contractAddress: "0xBankAddress" },
  { contractType: "InvestorsV1", contractAddress: "0xInvestorsAddress" },
  { contractType: "Voting", contractAddress: "0xVotingAddress" },
  {
    contractType: "BoardOfDirectors",
    contractAddress: "0xBoardOfDirectorsAddress",
  },
  {
    contractType: "ExpenseAccount",
    contractAddress: "0xExpenseAccountAddress",
  },
  {
    contractType: "ExpenseAccountEIP712",
    contractAddress: "0xExpenseAccountEIP712Address",
  },
  {
    contractType: "CashRemunerationEIP712",
    contractAddress: "0xCashRemunerationEIP712Address",
  },
];

const mockUpdatedTeam = {
  ...mockTeam,
  bankAddress: "0xBankAddress",
  investorsAddress: "0xInvestorsAddress",
  votingAddress: "0xVotingAddress",
  boardOfDirectorsAddress: "0xBoardOfDirectorsAddress",
  expenseAccountAddress: "0xExpenseAccountAddress",
  expenseAccountEip712Address: "0xExpenseAccountEIP712Address",
  cashRemunerationEip712Address: "0xCashRemunerationEIP712Address",
};

describe("Contract Controller", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });
});
