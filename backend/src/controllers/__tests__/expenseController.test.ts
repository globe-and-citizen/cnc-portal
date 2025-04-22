import request from "supertest";
import express, { Request, Response, NextFunction } from "express";
import { addExpense, getExpenses, updateExpense } from "../expenseController";
import { prisma } from "../../utils";
import { describe, it, beforeEach, expect, vi } from "vitest";
import { Expense, Team } from "@prisma/client";
import publicClient from "../../utils/viem.config";

const app = express();
app.use(express.json());
app.use(setAddressMiddleware("0xCallerAddress"));
app.post("/expense", addExpense);
app.get("/expenses", getExpenses);
app.put("/expense/:id", updateExpense);

function setAddressMiddleware(address: string) {
  return (req: Request, res: Response, next: NextFunction) => {
    (req as any).address = address;
    next();
  };
}

const mockExpense = {
  id: 1,
  teamId: 1,
  userAddress: "0xCallerAddress",
  signature: "mockSignature",
  data: JSON.stringify({
    approvedAddress: '0x1234567890123456789012345678901234567890',
    tokenAddress: '0xTiokenAddress',
    budgetData: [
      { budgetType: 0, value: 10 },
      { budgetType: 1, value: 100 },
      { budgetType: 2, value: 10 }
    ],
    expiry: new Date().getTime() / 1000 + 60 * 60
  }),
  status: "signed",
} as Expense;
const mockTeam = {
  id: 1,
  name: "TeamName",
  ownerAddress: "0xOwnerAddress",
  description: null,
  createdAt: new Date(),
  updatedAt: new Date(),
} as Team;

describe("Expense Controller", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("POST: /expense", () => {
    it("should return 400 if required parameters are missing", async () => {
      const response = await request(app).post("/expense").send({ teamId: 1 });

      expect(response.status).toBe(400);
      expect(response.body.message).toContain(
        "Missing signature, Missing data"
      );
    });

    it("Should return 403 if the caller is not the owner of the team", async () => {
      vi.spyOn(prisma.team, "findFirst").mockResolvedValueOnce(null);
      const response = await request(app).post("/expense").send({
        teamId: 1,
        signature: "mockSignature",
        data: mockExpense.data,
      });

      expect(response.status).toBe(403);
      expect(response.body.message).toBe("Caller is not the owner of the team");
    });
    it("should create a new expense", async () => {
      vi.spyOn(prisma.team, "findFirst").mockResolvedValueOnce(mockTeam);
      vi.spyOn(prisma.expense, "create").mockResolvedValueOnce(mockExpense);
 
      const response = await request(app).post("/expense").send({
        teamId: 1,
        signature: "0xmockSignature",
        data: JSON.stringify({
          approvedAddress: "0xApprovedAddress",
        }),
      });

      expect(response.status).toBe(201);
      expect(response.body).toEqual(mockExpense);
    });

    it("should return 500 if there is a server error", async () => {
      vi.spyOn(prisma.team, "findFirst").mockRejectedValue("Server error");

      const response = await request(app).post("/expense").send({
        teamId: 1,
        signature: "mockSignature",
        data: mockExpense.data,
      });

      expect(response.status).toBe(500);
      expect(response.body.message).toBe("Internal server error has occured");
    });
  });

  describe("GET: /expenses", () => {
    it("should return 400 if teamId is invalid", async () => {
      const response = await request(app)
        .get("/expenses")
        .query({ teamId: "abc" });

      expect(response.status).toBe(400);
      expect(response.body.message).toBe("Invalid teamId");
    });

    it("should return 403 if caller is not a team member", async () => {
      vi.spyOn(prisma.team, "findFirst").mockResolvedValue(null);

      const response = await request(app).get("/expenses").query({ teamId: 1 });

      expect(response.status).toBe(403);
      expect(response.body.message).toBe("Caller is not a member of the team");
    });

    it("should return expenses for a valid team", async () => {
      vi.spyOn(prisma.team, "findFirst").mockResolvedValue(mockTeam);
      vi.spyOn(prisma.expense, "findMany").mockResolvedValue([{...mockExpense, data: JSON.parse(mockExpense.data as string)}]);
      vi.spyOn(prisma.expense, "update")
      vi.spyOn(publicClient, "readContract").mockResolvedValue([0n, 0n, 1])

      const response = await request(app).get("/expenses").query({ teamId: 1 });

      expect(response.status).toBe(200);
      expect(response.body).toEqual([{
        ...mockExpense,
        data: JSON.parse(mockExpense.data as string),
        status: "enabled",
        balances: {
          0: "0",
          1: "0"
        }
      }]);
    });

    it("should return 500 if there is a server error", async () => {
      vi.spyOn(prisma.team, "findFirst").mockRejectedValue("Server error");

      const response = await request(app).get("/expenses").query({ teamId: 1 });

      expect(response.status).toBe(500);
      expect(response.body.message).toBe("Internal server error has occured");
    });
  });

  describe("PUT: /expense/:id", () => {
    it("should return 400 if expense ID is invalid", async () => {
      const response = await request(app)
        .put("/expense/abc")
        .send({ status: "disable" });

      expect(response.status).toBe(400);
      expect(response.body.message).toBe("Invalid expense ID");
    });

    it("should return 400 if status is missing", async () => {
      const response = await request(app).put("/expense/1").send({});

      expect(response.status).toBe(400);
      expect(response.body.message).toBe("Missing status");
    });

    it("should return 400 if status is invalid", async () => {
      const response = await request(app)
        .put("/expense/1")
        .send({ status: "invalidStatus" });

      expect(response.status).toBe(400);
      expect(response.body.message).toBe("Invalid status");
    });

    it("should return 403 if caller is not the owner of the team and the status is disable", async () => {

      vi.spyOn(prisma.expense, "findUnique").mockResolvedValue(null);

      const response = await request(app)
        .put("/expense/1")
        .send({ status: "disable" });

      expect(response.status).toBe(403);
      expect(response.body.message).toBe("Caller is not the owner of the team");
    })

    it("should update the expense status", async () => {
      vi.spyOn(prisma.expense, "update").mockResolvedValue({
        ...mockExpense,
        status: "expired",
      });

      const response = await request(app)
        .put("/expense/1")
        .send({ status: "expired" });

      expect(response.status).toBe(200);
      expect(response.body.status).toBe("expired");
    });

    it("should return 500 if there is a server error", async () => {
      vi.spyOn(prisma.expense, "update").mockRejectedValue("Server error");

      const response = await request(app)
        .put("/expense/1")
        .send({ status: "expired" });

      expect(response.status).toBe(500);
      expect(response.body.message).toBe("Internal server error has occured");
    });
  });
});
