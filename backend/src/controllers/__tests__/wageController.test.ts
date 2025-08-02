import request from "supertest";
import express, { Request, Response, NextFunction } from "express";
import { getWages, setWage } from "../wageController";
import { prisma } from "../../utils";
import { describe, it, beforeEach, expect, vi } from "vitest";
import { Team, Wage } from "@prisma/client";

const app = express();
app.use(express.json());
app.use(setAddressMiddleware("0xOwnerAddress"));
app.put("/wage", setWage);
app.get("/", getWages);

function setAddressMiddleware(address: string) {
  return (req: Request, res: Response, next: NextFunction) => {
    (req as any).address = address;
    next();
  };
}

const mockTeam = {
  id: 1,
  name: "TeamName",
  ownerAddress: "0xOwnerAddress",
  description: null,
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
  // cashRatePerHour: 50,
  // tokenRatePerHour: 100,
  ratePerHour: [
    { type: "cash", amount: 50 },
    { type: "token", amount: 100 },
  ],
  maximumHoursPerWeek: 40,
  nextWageId: null,
} as unknown as Wage;

describe("Wage Controller", () => {
  describe("PUT: /wage", () => {
    beforeEach(() => {
      vi.clearAllMocks();
    });

    it("should return 400 if required parameters are missing", async () => {
      const response = await request(app).put("/wage").send({});

      expect(response.status).toBe(400);
      expect(response.body.message).toContain(
        "Missing or invalid parameters: teamId, userAddress, maximumHoursPerWeek, ratePerHour"
      );
    });

    it("should return 400 if parameters are invalid", async () => {
      const response = await request(app)
        .put("/wage")
        .send({
          teamId: 1,
          userAddress: "0xMemberAddress",
          // cashRatePerHour: -50,
          // tokenRatePerHour: 100,
          ratePerHour: [
            { type: "cash", amount: -50 },
            { type: "token", amount: 100 },
          ],
          maximumHoursPerWeek: "0.5",
        });

      expect(response.status).toBe(400);
      expect(response.body.message).toContain(
        "Errors: Invalid maximumHoursPerWeek, Invalid wage rate"
      );
    });

    it("should return 403 if caller is not the owner of the team", async () => {
      vi.spyOn(prisma.team, "findFirst").mockResolvedValueOnce(null);
      vi.spyOn(prisma.wage, "create").mockResolvedValue(mockWage);
      const response = await request(app)
        .put("/wage")
        .send({
          teamId: 1,
          userAddress: "0xMemberAddress",
          // cashRatePerHour: 50,
          // tokenRatePerHour: 100,
          ratePerHour: [
            { type: "cash", amount: 50 },
            { type: "token", amount: 100 },
          ],
          maximumHoursPerWeek: 40,
        });

      expect(response.status).toBe(403);
      expect(response.body.message).toBe("Caller is not the owner of the team");
    });

    it("should create a new wage if no previous wage exists", async () => {
      vi.spyOn(prisma.team, "findFirst").mockResolvedValue(mockTeam);
      vi.spyOn(prisma.wage, "findFirst").mockResolvedValue(null);
      vi.spyOn(prisma.wage, "findMany").mockResolvedValue([]);
      vi.spyOn(prisma.wage, "create").mockResolvedValue(mockWage);

      const response = await request(app)
        .put("/wage")
        .set("address", "0xOwnerAddress")
        .send({
          teamId: 1,
          userAddress: "0xMemberAddress",
          // cashRatePerHour: 50,
          // tokenRatePerHour: 100,
          ratePerHour: [
            { type: "cash", amount: 50 },
            { type: "token", amount: 100 },
          ],
          maximumHoursPerWeek: 40,
        });

      expect(response.status).toBe(201);
      expect(prisma.wage.create).toHaveBeenCalled();
    });

    it("should return 500 if all wage have a next wage", async () => {
      vi.spyOn(prisma.team, "findFirst").mockResolvedValue(mockTeam);
      vi.spyOn(prisma.wage, "findFirst").mockResolvedValue(null);
      vi.spyOn(prisma.wage, "findMany").mockResolvedValue([mockWage]);
      vi.spyOn(prisma.wage, "create").mockResolvedValue(mockWage);

      const response = await request(app)
        .put("/wage")
        .set("address", "0xOwnerAddress")
        .send({
          teamId: 1,
          userAddress: "0xMemberAddress",
          // cashRatePerHour: 50,
          // tokenRatePerHour: 100,
          ratePerHour: [
            { type: "cash", amount: 50 },
            { type: "token", amount: 100 },
          ],
          maximumHoursPerWeek: 40,
        });

      expect(response.status).toBe(500);
      expect(response.body.message).toContain(
        "Internal server error has occured"
      );
    });

    it("should chain a new wage to the previous wage if it exists", async () => {
      vi.spyOn(prisma.team, "findFirst").mockResolvedValue(mockTeam);
      vi.spyOn(prisma.wage, "findFirst").mockResolvedValue(mockWage);
      vi.spyOn(prisma.wage, "create").mockResolvedValue(mockWage);

      const response = await request(app)
        .put("/wage")
        .set("address", "0xOwnerAddress")
        .send({
          teamId: 1,
          userAddress: "0xMemberAddress",
          // cashRatePerHour: 50,
          // tokenRatePerHour: 100,
          ratePerHour: [
            { type: "cash", amount: 50 },
            { type: "token", amount: 100 },
          ],
          maximumHoursPerWeek: 40,
        });

      expect(response.status).toBe(201);
      expect(prisma.wage.create).toHaveBeenCalled();
    });

    it("should return 500 if there is a server error", async () => {
      vi.spyOn(prisma.team, "findFirst").mockResolvedValue(mockTeam);
      vi.spyOn(prisma.wage, "findFirst").mockRejectedValue("Server error");

      const response = await request(app)
        .put("/wage")
        .send({
          teamId: 1,
          userAddress: "0xMemberAddress",
          // cashRatePerHour: 50,
          // tokenRatePerHour: 100,
          ratePerHour: [
            { type: "cash", amount: 50 },
            { type: "token", amount: 100 },
          ],
          maximumHoursPerWeek: 40,
        });

      // console.log({ body: response.body, status: response.status });
      expect(response.status).toBe(500);
      expect(response.body.message).toBe("Internal server error has occured");
    });
  });

  describe("GET: /", () => {
    // Reset all mock functions before each test
    beforeEach(() => {
      vi.clearAllMocks();
    });

    it("should return 403 if user is not a team member", async () => {
      // Simulate the case where the user is not a member of the team
      vi.spyOn(prisma.team, "findFirst").mockResolvedValue(null); //  return false

      const response = await request(app).get("/").query({ teamId: 1 });

      expect(response.status).toBe(403);
      expect(response.body.message).toBe("Member is not a team member");
    });

    it("should return 200 and wages if user is a team member", async () => {
      // Simulate that the user is indeed a member of the team
      vi.spyOn(prisma.team, "findFirst").mockResolvedValue(mockTeam);

      // Simulate returning wages data
      vi.spyOn(prisma.wage, "findMany").mockResolvedValue([
        {
          ...mockWage,
          //@ts-expect-error: wage relationship
          previousWage: { id: 0 },
        },
      ]);

      const response = await request(app).get("/").query({ teamId: 1 });

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body[0]).toHaveProperty("userAddress", "0xMemberAddress");
    });

    it("should return 500 on internal server error", async () => {
      // Simulate a database error when checking team membership
      vi.spyOn(prisma.team, "findFirst").mockRejectedValue(
        new Error("Database error")
      );

      const response = await request(app).get("/").query({ teamId: 1 });

      expect(response.status).toBe(500);
      expect(response.body.message).toContain("Internal server error");
    });
  });
});
