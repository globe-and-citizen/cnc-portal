import request from "supertest";
import { beforeEach } from "node:test";
import { describe, expect, it, vi } from "vitest";
import publicClient from "../../utils/viem.config";
import OFFICER_ABI from "../../artifacts/officer_abi.json";
import { Team } from "@prisma/client";
import express, { Request, Response, NextFunction } from "express";
import {
  addContract,
  syncContracts,
  getContracts,
} from "../contractController";
import { prisma } from "../../utils";

vi.mock("../../utils");
function setAddressMiddleware(address: string) {
  return (req: Request, res: Response, next: NextFunction) => {
    (req as any).address = address;
    next();
  };
}

// app.post("/contract", addContract);
// app.get("/contract", getContracts);

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
  describe("PUT: /contract/sync", () => {
    const app = express();
    app.use(express.json());
    app.use(setAddressMiddleware("0xOwnerAddress"));
    app.put("/contract/sync", syncContracts);
    beforeEach(() => {
      vi.clearAllMocks();
    });

    it.skip("should return 400 if required parameters are missing", async () => {
      const response = await request(app).put("/contract/sync");
      console.log({ body: response.body, status: response.status });
      expect(response.status).toBe(400);
      expect(response.body.message).toContain(
        "Missing or invalid field: teamId"
      );
    });

    it.skip("should return 404 if team is not found", async () => {
      const response = await request(app)
        .put("/contract/sync")
        .send({ teamId: 2 });
      expect(response.status).toBe(404);
      expect(response.body.message).toContain("Team not found");
    });

    it("should return 403 if caller is not the owner of the team", async () => {
      vi.spyOn(prisma.team, "findUnique").mockResolvedValueOnce({
        ...mockTeam,
        ownerAddress: "0xNotOwnerAddress",
      });

      const response = await request(app).post("/contract/sync").send({
        teamId: 1,
      });
      expect(response.status).toBe(403);
      expect(response.body.message).toContain(
        "Unauthorized: Caller is not the owner of the team"
      );
    });
    it("should return 200 and update the team with contract addresses", async () => {
      vi.spyOn(prisma.team, "findUnique").mockResolvedValue(mockTeam);
      vi.spyOn(publicClient, "readContract").mockResolvedValue(mockContracts);
      vi.spyOn(prisma.teamContract, "createMany").mockResolvedValue({
        count: 2,
      });

      const response = await request(app).post("/contract/sync").send({
        teamId: 1,
      });
      expect(response.status).toBe(200);
      expect(response.body).toEqual(mockUpdatedTeam);
    });
  });
});
