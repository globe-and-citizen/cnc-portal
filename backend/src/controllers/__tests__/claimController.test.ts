import request from "supertest";
import express, { Request, Response, NextFunction } from "express";
import claimRoutes from "../../routes/claimRoute";
import { prisma } from "../../utils";
import { describe, it, beforeEach, expect, vi } from "vitest";
import { Claim, Wage, WeeklyClaim } from "@prisma/client";
import dayjs from "dayjs";

vi.mock("../../utils");
vi.mock("../../utils/viem.config");

// Mock the authorization middleware with proper hoisting
vi.mock("../../middleware/authMiddleware", () => ({
  authorizeUser: vi.fn((req: Request, res: Response, next: NextFunction) => {
    // Default behavior - can be overridden in tests
    (req as any).address = "0x1234567890123456789012345678901234567890";
    next();
  }),
}));

// Import the mocked function after mocking
import { authorizeUser } from "../../middleware/authMiddleware";
const mockAuthorizeUser = vi.mocked(authorizeUser);

const app = express();
app.use(express.json());
// Use the actual claimRoutes from the routes file
app.use("/", claimRoutes);
const mockWage = {
  id: 1,
  teamId: 1,
  userAddress: "0x1234567890123456789012345678901234567890",
  ratePerHour: [{ type: "cash", amount: 50 }],
  maximumHoursPerWeek: 40,
  nextWageId: null,
  createdAt: new Date(),
  updatedAt: new Date(),
} as Wage;

const mockWeeklyClaims: WeeklyClaim = {
  id: 1,
  teamId: 1,
  createdAt: new Date(),
  updatedAt: new Date(),
  weekStart: new Date(),
  data: {},
  memberAddress: "0x1234567890123456789012345678901234567890",
  signature: null,
  claims: [{ hoursWorked: 30 }],
  wageId: 1,
  status: "pending",
} as WeeklyClaim;

const mockClaim = {
  id: 123,
  hoursWorked: 5,
  memo: "test memo",
  wageId: 1,
  status: "pending",
  weeklyClaimId: 1,
  dayWorked: new Date(),
  createdAt: new Date(),
  updatedAt: new Date(),
  signature: null,
  tokenTx: null,
} as Claim;

const mockClaimWithWage = [
  {
    id: 1,
    hoursWorked: 5,
    status: "pending",
    createdAt: new Date(),
    updatedAt: new Date(),
    signature: null,
    wageId: 1,
    dayWorked: new Date(),
    memo: "Test memo",
    tokenTx: null,
    weeklyClaimId: 1,
    wage: {
      teamId: 1,
      userAddress: "0x1234567890123456789012345678901234567890",
      user: {
        address: "0x1234567890123456789012345678901234567890",
        name: "User1",
      },
    },
  },
];

describe("Claim Controller", () => {
  describe("POST: /", () => {
    beforeEach(() => {
      vi.clearAllMocks();
      // Reset to default behavior
      mockAuthorizeUser.mockImplementation((req: Request, res: Response, next: NextFunction) => {
        (req as any).address = "0x1234567890123456789012345678901234567890";
        next();
      });
    });

    it("should return 400 if memo is missing", async () => {
      const response = await request(app)
        .post("/")
        .send({ teamId: 1, descpription: "" });
      expect(response.status).toBe(400);
      expect(response.body.message).toContain("Invalid request body");
    });

    it("should return 400 if memo is only spaces", async () => {
      const response = await request(app)
        .post("/")
        .send({ teamId: 1, hoursWorked: 5, memo: " " });
      expect(response.status).toBe(400);
      expect(response.body.message).toContain("Invalid request body");
    });

    it("should return 400 if memo exceeds 200 words", async () => {
      const longmemo = Array(201).fill("word").join(" ");

      const response = await request(app)
        .post("/")
        .send({ teamId: 1, hoursWorked: 5, memo: longmemo });

      expect(response.status).toBe(400);
      expect(response.body.message).toContain("Invalid request body");
    });

    it("should return 400 if user don't have wage", async () => {
      vi.spyOn(prisma.wage, "findFirst").mockResolvedValue(null);

      const response = await request(app)
        .post("/")
        .send({ teamId: 1, hoursWorked: 5, memo: "memo" });

      expect(response.status).toBe(400);
      expect(response.body.message).toBe("No wage found for the user");
    });

    it("should return 400 if maximum claim is reached", async () => {
      vi.spyOn(prisma.wage, "findFirst").mockResolvedValue(mockWage);
      vi.spyOn(prisma.weeklyClaim, "findFirst").mockResolvedValue(
        mockWeeklyClaims
      );

      const response = await request(app)
        .post("/")
        .send({ teamId: 1, hoursWorked: 45, memo: "memo" });

      expect(response.body.message).toMatch(
        /^Maximum weekly hours reached, cannot submit more claims for this week\. You have \d+ hours remaining\.$/
      );
      expect(response.status).toBe(400);
    });

    it("should return 400 if required fields are missing", async () => {
      const response = await request(app).post("/").send({});
      expect(response.status).toBe(400);
      expect(response.body.message).toContain("Invalid request body");
    });

    it("should return 400 if hoursWorked is invalid", async () => {
      const response = await request(app)
        .post("/")
        .send({ teamId: 1, hoursWorked: -5, memo: "" });
      expect(response.status).toBe(400);
      expect(response.body.message).toContain("Invalid request body");
    });

    it("should return 400 if total hours exceed 24 hours for a single day", async () => {
      const testDate = dayjs.utc().startOf("day").toDate(); // Use start of day to avoid timezone issues
      const modifiedMockWeeklyClaims = {
        ...mockWeeklyClaims,
        claims: [
          {
            ...mockClaim,
            dayWorked: testDate,
            hoursWorked: 20,
          },
        ],
      };

      vi.spyOn(prisma.wage, "findFirst").mockResolvedValue(mockWage);
      vi.spyOn(prisma.weeklyClaim, "findFirst").mockResolvedValue(
        modifiedMockWeeklyClaims
      );
      const response = await request(app).post("/").send({
        teamId: 1,
        hoursWorked: 5, // 5 + 20 = 25 heures > 24 heures
        memo: "memo",
        dayWorked: testDate.toISOString(),
      });
      // console.log(response.error)
      expect(response.status).toBe(400);
      expect(response.body.message).toBe(
        "Submission failed: the total number of hours for this day would exceed 24 hours."
      );
    });

    it("should return 201 when you create a weekly claim an created", async () => {
      vi.spyOn(prisma.wage, "findFirst").mockResolvedValue(mockWage);
      vi.spyOn(prisma.weeklyClaim, "findFirst").mockResolvedValue(null);
      vi.spyOn(prisma.weeklyClaim, "create").mockResolvedValue(
        mockWeeklyClaims
      );

      vi.spyOn(prisma.claim, "create").mockResolvedValue(mockClaim);
      const response = await request(app)
        .post("/")
        .send({ teamId: 1, hoursWorked: 5, memo: "test memo" });

      expect(response.status).toBe(201);
      expect(response.body).toMatchObject({
        id: mockClaim.id,
        hoursWorked: mockClaim.hoursWorked,
        memo: mockClaim.memo,
        wageId: mockClaim.wageId,
        status: mockClaim.status,
        weeklyClaimId: mockClaim.weeklyClaimId,
      });
    });

    it("should return 201 when you add a claim an existing weekly claim", async () => {
      vi.spyOn(prisma.wage, "findFirst").mockResolvedValue(mockWage);
      vi.spyOn(prisma.weeklyClaim, "findFirst").mockResolvedValue(
        mockWeeklyClaims
      );
      vi.spyOn(prisma.weeklyClaim, "create").mockResolvedValue(
        mockWeeklyClaims
      );

      vi.spyOn(prisma.claim, "create").mockResolvedValue(mockClaim);
      const response = await request(app)
        .post("/")
        .send({ teamId: 1, hoursWorked: 5, memo: "test memo" });

      expect(response.status).toBe(201);
      expect(response.body).toMatchObject({
        id: mockClaim.id,
        hoursWorked: mockClaim.hoursWorked,
        memo: mockClaim.memo,
        wageId: mockClaim.wageId,
        status: mockClaim.status,
        weeklyClaimId: mockClaim.weeklyClaimId,
      });
    });

    it("should return 500 if internal server error", async () => {
      vi.spyOn(prisma.wage, "findFirst").mockRejectedValue(
        new Error("DB error")
      );

      const response = await request(app)
        .post("/")
        .send({ teamId: 1, hoursWorked: 5, memo: "memo" });

      expect(prisma.wage.findFirst).toHaveBeenCalled();
      expect(response.status).toBe(500);
      expect(response.body).toHaveProperty("message");
      expect(response.body.message).toBe("Internal server error has occured");
    });
  });

  describe("GET: /", () => {
    beforeEach(() => {
      vi.clearAllMocks();
      // Reset to default behavior
      mockAuthorizeUser.mockImplementation((req: Request, res: Response, next: NextFunction) => {
        (req as any).address = "0x1234567890123456789012345678901234567890";
        next();
      });
    });

    it("should return 400 if teamId is invalid", async () => {
      const response = await request(app)
        .get("/")
        .query({ teamId: "abc" });
      expect(response.status).toBe(400);
      expect(response.body.message).toContain("Invalid request query");
    });

    it("should return 403 if caller is not a member of the team", async () => {
      vi.spyOn(prisma.team, "findFirst").mockResolvedValue(null);

      const response = await request(app).get("/").query({ teamId: 1 });

      expect(response.status).toBe(403);
      expect(response.body.message).toBe("Caller is not a member of the team");
    });

    it("should return 200 and list claims filtered by memberAddress", async () => {
      vi.spyOn(prisma.team, "findFirst").mockResolvedValue({});

      vi.spyOn(prisma.claim, "findMany").mockResolvedValue(mockClaimWithWage);

      const response = await request(app)
        .get("/")
        .query({ teamId: 1, memberAddress: "0x1234567890123456789012345678901234567890" });

      expect(response.status).toBe(200);
      expect(response.body).toBeInstanceOf(Array);
      expect(response.body).toHaveLength(1);
    });

    it("should return 200 and list claims for a team", async () => {
      // mock on isUserMemberOfTeam

      // @ts-ignore
      vi.spyOn(prisma.team, "findFirst").mockResolvedValue({});
      // @ts-ignore
      vi.spyOn(prisma.claim, "findMany").mockResolvedValue([
        {
          id: 1,
          hoursWorked: 5,
          status: "pending",
          // @ts-ignore
          wage: { teamId: 1, user: { address: "0x123", name: "User1" } },
        },
      ]);

      const response = await request(app).get("/").query({ teamId: 1 });

      expect(response.status).toBe(200);
      expect(response.body).toBeInstanceOf(Array);
      expect(response.body[0]).toHaveProperty("id");
    });

    it("should return 200 and list claims based on status filter", async () => {
      // mock on isUserMemberOfTeam

      // @ts-ignore
      vi.spyOn(prisma.team, "findFirst").mockResolvedValue({});
      // @ts-ignore
      vi.spyOn(prisma.claim, "findMany").mockResolvedValue([
        {
          id: 1,
          hoursWorked: 5,
          status: "pending",
          // @ts-ignore
          wage: { teamId: 1, user: { address: "0x123", name: "User1" } },
        },
      ]);

      const response = await request(app)
        .get("/")
        .query({ teamId: 1, status: "pending" });

      expect(response.status).toBe(200);
      expect(response.body).toBeInstanceOf(Array);
      expect(response.body[0]).toHaveProperty("id");
    });

    it("should return 500 if an error occurs", async () => {
      // @ts-ignore
      vi.spyOn(prisma.team, "findFirst").mockRejectedValue("Test");
      const response = await request(app).get("/").query({ teamId: 1 });

      expect(response.status).toBe(500);
      expect(response.body.message).toBe("Internal server error has occured");
    });
  });

  describe("PUT: /:claimId", () => {
    beforeEach(() => {
      vi.clearAllMocks();
      // Reset to default behavior
      mockAuthorizeUser.mockImplementation((req: Request, res: Response, next: NextFunction) => {
        (req as any).address = "0x1234567890123456789012345678901234567890";
        next();
      });
    });

    it("should return 400 for invalid action", async () => {
      const response = await request(app)
        .put("/1")
        .query({ action: "invalid" });

      expect(response.status).toBe(400);
      expect(response.body.message).toContain("Invalid request query");
    });

    it("should return 400 for missing signature", async () => {
      const response = await request(app)
        .put("/1")
        .query({ action: "sign" });

      expect(response.status).toBe(400);
      expect(response.body.message).toContain("Invalid request body");
    });

    it("should return 404 if claim is not found", async () => {
      vi.spyOn(prisma.claim, "findFirst").mockResolvedValue(null);

      const response = await request(app)
        .put("/1")
        .query({ action: "sign" })
        .send({ signature: "0xabc" });

      expect(response.status).toBe(404);
      expect(response.body.message).toBe("Claim not found");
    });

    it("should return 403 if is not cash Remuneration owner or team owner", async () => {
      vi.spyOn(prisma.claim, "findFirst").mockResolvedValue({
        id: 1,
        status: "pending",
        // @ts-ignore
        wage: { team: { ownerAddress: "0x456" } },
      });

      const response = await request(app)
        .put("/1")
        .query({ action: "sign" })
        .send({ signature: "0xabc" });

      expect(response.status).toBe(403);
      expect(response.body.message).toBe(
        "Caller is not the Cash Remuneration owner or the team owner"
      );
    });

    it("should return 403 if caller is not the owner of the claim for withdraw action", async () => {
      vi.spyOn(prisma.claim, "findFirst").mockResolvedValue({
        id: 1,
        status: "pending",
        // @ts-ignore
        wage: { userAddress: "0x456" },
      });

      const response = await request(app)
        .put("/1")
        .query({ action: "withdraw" });

      expect(response.status).toBe(403);
      expect(response.body.message).toBe(
        "Caller is not the owner of the claim"
      );
    });

    it("should return 403 if claim is not in a valid state for the action", async () => {
      // List of invalid states for sign action: signed, withdrawn, disabled
      vi.spyOn(prisma.claim, "findFirst").mockResolvedValue({
        id: 1,
        status: "signed",
        // @ts-ignore
        wage: { team: { ownerAddress: "0x1234567890123456789012345678901234567890" } },
      });

      const response = await request(app)
        .put("/1")
        .query({ action: "sign" })
        .send({ signature: "0xabc" });
      expect(response.status).toBe(403);
      expect(response.body.message).toContain("Can't signe");
    });

    it("should update claim status successfully", async () => {
      vi.spyOn(prisma.claim, "findFirst").mockResolvedValue({
        id: 1,
        status: "pending",
        // @ts-ignore
        wage: { team: { ownerAddress: "0x1234567890123456789012345678901234567890" } },
      });
      // @ts-ignore
      vi.spyOn(prisma.claim, "update").mockResolvedValue({
        id: 1,
        status: "signed",
      });

      const response = await request(app)
        .put("/1")
        .query({ action: "sign" })
        .send({ signature: "0xabc" });

      expect(response.status).toBe(200);
      expect(response.body.status).toBe("signed");
    });

    describe("Withdraw action", () => {
      it("should return 403 if claim is not signed", async () => {
        vi.spyOn(prisma.claim, "findFirst").mockResolvedValue({
          id: 1,
          status: "pending",
          // @ts-ignore
          wage: { userAddress: "0x1234567890123456789012345678901234567890" },
        });

        const response = await request(app)
          .put("/1")
          .query({ action: "withdraw" });

        expect(response.status).toBe(403);
        expect(response.body.message).toContain("Can't withdraw");
      });

      it("should update claim status to withdrawn", async () => {
        vi.spyOn(prisma.claim, "findFirst").mockResolvedValue({
          id: 1,
          status: "signed",
          // @ts-ignore
          wage: { userAddress: "0x1234567890123456789012345678901234567890" },
        });
        // @ts-ignore
        vi.spyOn(prisma.claim, "update").mockResolvedValue({
          id: 1,
          status: "withdrawn",
        });

        const response = await request(app)
          .put("/1")
          .query({ action: "withdraw" });

        expect(response.status).toBe(200);
        expect(response.body.status).toBe("withdrawn");
      });
    });

    describe("Disable action", () => {
      it("should return 403 if claim is not signed", async () => {
        vi.spyOn(prisma.claim, "findFirst").mockResolvedValue({
          id: 1,
          status: "pending",
          // @ts-ignore
          wage: { team: { ownerAddress: "0x1234567890123456789012345678901234567890" } },
        });

        const response = await request(app)
          .put("/1")
          .query({ action: "disable" });

        expect(response.status).toBe(403);
        expect(response.body.message).toContain("Can't disable");
      });

      it("should update claim status to disabled", async () => {
        vi.spyOn(prisma.claim, "findFirst").mockResolvedValue({
          id: 1,
          status: "signed",
          // @ts-ignore
          wage: { team: { ownerAddress: "0x1234567890123456789012345678901234567890" } },
        });
        // @ts-ignore
        vi.spyOn(prisma.claim, "update").mockResolvedValue({
          id: 1,
          status: "disabled",
        });

        const response = await request(app)
          .put("/1")
          .query({ action: "disable" });

        expect(response.status).toBe(200);
        expect(response.body.status).toBe("disabled");
      });
    });

    describe("Enable action", () => {
      it("should return 403 if claim is not disabled", async () => {
        vi.spyOn(prisma.claim, "findFirst").mockResolvedValue({
          id: 1,
          status: "pending",
          // @ts-ignore
          wage: { team: { ownerAddress: "0x1234567890123456789012345678901234567890" } },
        });

        const response = await request(app)
          .put("/1")
          .query({ action: "enable" });

        expect(response.status).toBe(403);
        expect(response.body.message).toContain("Can't enable");
      });

      it("should update claim status to enabled", async () => {
        vi.spyOn(prisma.claim, "findFirst").mockResolvedValue({
          id: 1,
          status: "disabled",
          // @ts-ignore
          wage: { team: { ownerAddress: "0x1234567890123456789012345678901234567890" } },
        });
        // @ts-ignore
        vi.spyOn(prisma.claim, "update").mockResolvedValue({
          id: 1,
          status: "enabled",
        });

        const response = await request(app)
          .put("/1")
          .query({ action: "enable" });

        expect(response.status).toBe(200);
        expect(response.body.status).toBe("enabled");
      });
    });

    describe("Reject action", () => {
      it("should return 403 if claim is not pending", async () => {
        vi.spyOn(prisma.claim, "findFirst").mockResolvedValue({
          id: 1,
          status: "signed",
          // @ts-ignore
          wage: { team: { ownerAddress: "0x1234567890123456789012345678901234567890" } },
        });

        const response = await request(app)
          .put("/1")
          .query({ action: "reject" });

        expect(response.status).toBe(403);
        expect(response.body.message).toContain("Can't reject");
      });

      it("should update claim status to rejected", async () => {
        vi.spyOn(prisma.claim, "findFirst").mockResolvedValue({
          id: 1,
          status: "pending",
          // @ts-ignore
          wage: { team: { ownerAddress: "0x1234567890123456789012345678901234567890" } },
        });
        // @ts-ignore
        vi.spyOn(prisma.claim, "update").mockResolvedValue({
          id: 1,
          status: "rejected",
        });

        const response = await request(app)
          .put("/1")
          .query({ action: "reject" });

        expect(response.status).toBe(200);
        expect(response.body.status).toBe("rejected");
      });
    });

    it("should return 500 if an error occurs", async () => {
      vi.spyOn(prisma.claim, "findFirst").mockRejectedValue("Test");

      const response = await request(app)
        .put("/1")
        .query({ action: "sign" })
        .send({ signature: "0xabc" });

      expect(response.status).toBe(500);
      expect(response.body.message).toBe("Internal server error has occured");
    });
  });
});
