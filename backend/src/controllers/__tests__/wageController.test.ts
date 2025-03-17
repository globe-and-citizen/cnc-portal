import request from "supertest";
import express, { NextFunction } from "express";
import { setWage } from "../wageController";
import { prisma } from "../../utils";
import { describe, it, beforeEach, expect, vi } from "vitest";
import { Team, Wage } from "@prisma/client";

vi.mock("../../utils");

const app = express();
app.use(express.json());
app.post("/wage", setWage);
function setAddressMiddleware(address: string) {
  return (req: Request, res: Response, next: NextFunction) => {
    (req as any).address = address;
    next();
  };
}

describe("setWage", () => {
  const mockTeam = {
    id: 1,
    name: "TeamName",
    ownerAddress: "0xOwnerAddress",
    description: null,
    bankAddress: null,
    votingAddress: null,
    boardOfDirectorsAddress: null,
    expenseAccountAddress: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  } as Team;
  const mockMember = {
    address: "0xMemberAddress",
  };
  const mockWage = {
    id: 1,
    teamId: 1,
    userAddress: "0xMemberAddress",
    cashRatePerHour: 50,
    tokenRatePerHour: 100,
    maximumHoursPerWeek: 40,
    nextWageId: null,
  } as Wage;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should return 400 if required parameters are missing", async () => {
    const response = await request(app)
      .post("/wage")
      .send({ teamId: 1, userAddress: "0xMemberAddress" });

    expect(response.status).toBe(400);
    expect(response.body.message).toContain(
      "Missing or invalid parameters: cashRatePerHour, tokenRatePerHour, maximumHoursPerWeek"
    );
  });

  it("should return 400 if parameters are invalid", async () => {
    const response = await request(app).post("/wage").send({
      teamId: 1,
      userAddress: "0xMemberAddress",
      cashRatePerHour: -50,
      tokenRatePerHour: 100,
      maximumHoursPerWeek: "0.5",
    });

    expect(response.status).toBe(400);
    expect(response.body.message).toContain(
      "Errors: Invalid maximumHoursPerWeek, Invalid cashRatePerHour"
    );
  });

  it("should return 404 if member is not part of the team", async () => {
    vi.spyOn(prisma.team, "findFirst").mockResolvedValue(null);

    const response = await request(app).post("/wage").send({
      teamId: 1,
      userAddress: "0xMemberAddress",
      cashRatePerHour: 50,
      tokenRatePerHour: 100,
      maximumHoursPerWeek: 40,
    });

    expect(response.status).toBe(404);
    expect(response.body.message).toBe("Member not found in the team");
  });

  it.only("should return 403 if caller is not the owner of the team", async () => {
    vi.spyOn(prisma.team, "findFirst").mockResolvedValue(mockTeam);
    vi.spyOn(prisma.wage, "create").mockResolvedValue(mockWage);

    const response = await request(app)
      .post("/wage")
      .set("address", "0xNotOwnerAddress")
      .send({
        teamId: 1,
        userAddress: "0xMemberAddress",
        cashRatePerHour: 50,
        tokenRatePerHour: 100,
        maximumHoursPerWeek: 40,
      });
    console.log({ body: response.body, status: response.status });
    expect(response.status).toBe(403);
    expect(response.body.message).toBe("Caller is not the owner of the team");
  });

  it("should create a new wage if no previous wage exists", async () => {
    vi.spyOn(prisma.team, "findFirst").mockResolvedValue(mockTeam);
    vi.spyOn(prisma.wage, "findFirst").mockResolvedValue(null);
    vi.spyOn(prisma.wage, "create").mockResolvedValue(mockWage);

    const response = await request(app)
      .post("/wage")
      .set("address", "0xOwnerAddress")
      .send({
        teamId: 1,
        userAddress: "0xMemberAddress",
        cashRatePerHour: 50,
        tokenRatePerHour: 100,
        maximumHoursPerWeek: 40,
      });

    expect(response.status).toBe(201);
    expect(prisma.wage.create).toHaveBeenCalled();
  });

  it("should chain a new wage to the previous wage if it exists", async () => {
    vi.spyOn(prisma.team, "findFirst").mockResolvedValue(mockTeam);
    vi.spyOn(prisma.wage, "findFirst").mockResolvedValue(mockWage);
    vi.spyOn(prisma.wage, "create").mockResolvedValue(mockWage);

    const response = await request(app)
      .post("/wage")
      .set("address", "0xOwnerAddress")
      .send({
        teamId: 1,
        userAddress: "0xMemberAddress",
        cashRatePerHour: 50,
        tokenRatePerHour: 100,
        maximumHoursPerWeek: 40,
      });

    expect(response.status).toBe(201);
    expect(prisma.wage.create).toHaveBeenCalled();
  });

  it("should return 500 if there is a server error", async () => {
    vi.spyOn(prisma.team, "findFirst").mockRejectedValue(
      new Error("Server error")
    );

    const response = await request(app)
      .post("/wage")
      .set("address", "0xOwnerAddress")
      .send({
        teamId: 1,
        userAddress: "0xMemberAddress",
        cashRatePerHour: 50,
        tokenRatePerHour: 100,
        maximumHoursPerWeek: 40,
      });

    expect(response.status).toBe(500);
    expect(response.body.message).toBe("Internal server error");
  });
});
