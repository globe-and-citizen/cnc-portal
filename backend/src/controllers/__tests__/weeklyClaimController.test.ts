import request from "supertest";
import express, { Request, Response, NextFunction } from "express";
import { getTeamWeeklyClaims } from "../weeklyClaimController";
import { prisma } from "../../utils";
import { describe, it, beforeEach, expect, vi } from "vitest";
import { WeeklyClaim } from "@prisma/client";

function setAddressMiddleware(address: string) {
  return (req: Request, res: Response, next: NextFunction) => {
    (req as any).address = address;
    next();
  };
}

const app = express();
app.use(express.json());
app.use(setAddressMiddleware("0xMemberAddress"));
app.get("/", getTeamWeeklyClaims);

describe("Weekly Claim Controller", () => {
  describe("GET: /", () => {
    beforeEach(() => {
      vi.clearAllMocks();
    });

    it("should return 400 if teamId is missing", async () => {
      const response = await request(app).get("/");
      expect(response.status).toBe(400);
      expect(response.body).toEqual({ message: "Missing or invalid teamId" });
    });

    it("should return 400 if status is invalid", async () => {
      const response = await request(app).get("/?teamId=1&status=invalid");
      expect(response.status).toBe(400);
      expect(response.body).toEqual({
        message: "Invalid status. Allowed status are: sign, withdraw, pending",
      });
    });

    it("should return 200 if status is valid", async () => {
      vi.spyOn(prisma.weeklyClaim, "findMany").mockResolvedValue([]);
      const response = await request(app).get("/?teamId=1&status=pending");
      expect(response.status).toBe(200);
      expect(response.body).toEqual([]);
    });

    it("should get weekly claims for a valid teamId", async () => {
      const testDate = new Date();
      const mockWeeklyClaims: WeeklyClaim[] = [
        {
          id: 1,
          weekStart: testDate,
          memberAddress: "0xMemberAddress",
          teamId: 1,
          data: {},
          signature: null,
          createdAt: testDate,
          updatedAt: testDate,
          wageId: 0,
          status: null,
        },
        {
          id: 2,
          weekStart: testDate,
          memberAddress: "0xMemberAddress",
          teamId: 1,
          data: {},
          signature: null,
          createdAt: testDate,
          updatedAt: testDate,
          wageId: 0,
          status: null,
        },
      ];

      vi.spyOn(prisma.weeklyClaim, "findMany").mockResolvedValue(
        mockWeeklyClaims
      );

      const response = await request(app).get("/?teamId=1");
      expect(response.status).toBe(200);

      // Correction: comparer avec les dates sérialisées en JSON
      const expectedResponse = mockWeeklyClaims.map((claim) => ({
        ...claim,
        weekStart: claim.weekStart.toISOString(),
        createdAt: claim.createdAt.toISOString(),
        updatedAt: claim.updatedAt.toISOString(),
      }));

      expect(response.body).toEqual(expectedResponse);
    });

    it("should return 500 on database error", async () => {
      vi.spyOn(prisma.weeklyClaim, "findMany").mockRejectedValue(
        new Error("Database error")
      );

      const response = await request(app).get("/?teamId=1");
      expect(response.status).toBe(500);
      expect(response.body).toEqual({
        message: "Internal server error has occured",
        error: expect.any(String),
      });
    });

    it("should filter weekly claims by memberAddress if provided", async () => {
      const testDate = new Date();
      const mockWeeklyClaims: WeeklyClaim[] = [
        {
          id: 1,
          weekStart: testDate,
          memberAddress: "0xAnotherAddress",
          teamId: 1,
          data: {},
          signature: null,
          createdAt: testDate,
          updatedAt: testDate,
          wageId: 0,
          status: null,
        },
      ];

      const findManySpy = vi
        .spyOn(prisma.weeklyClaim, "findMany")
        .mockResolvedValue(mockWeeklyClaims);

      const response = await request(app).get(
        "/?teamId=1&memberAddress=0xAnotherAddress"
      );
      expect(response.status).toBe(200);

      const expectedResponse = mockWeeklyClaims.map((claim) => ({
        ...claim,
        weekStart: claim.weekStart.toISOString(),
        createdAt: claim.createdAt.toISOString(),
        updatedAt: claim.updatedAt.toISOString(),
      }));

      expect(response.body).toEqual(expectedResponse);
    });
  });
});
