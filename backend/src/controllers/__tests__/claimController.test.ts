import request from "supertest";
import express, { Request, Response, NextFunction } from "express";
import { prisma } from "../../utils";
import { describe, it, beforeEach, expect, vi } from "vitest";
import { addClaim, getClaims, updateClaim } from "../claimController";

function setAddressMiddleware(address: string) {
  return (req: Request, res: Response, next: NextFunction) => {
    (req as any).address = address;
    next();
  };
}

const app = express();
app.use(express.json());
app.post("/claim", setAddressMiddleware("0x123"), addClaim);
app.get("/claim", setAddressMiddleware("0x123"), getClaims);
app.put("/claim/:claimId", setAddressMiddleware("0x123"), updateClaim);

describe("Claim Controller", () => {
  describe("POST: /claim", () => {
    beforeEach(() => {
      vi.clearAllMocks();
    });

    it("should return 400 if required fields are missing", async () => {
      const response = await request(app).post("/claim").send({});
      expect(response.status).toBe(400);
      expect(response.body.message).toContain("Missing teamId");
    });

    it("should return 400 if hoursWorked is invalid", async () => {
      const response = await request(app)
        .post("/claim")
        .send({ teamId: 1, hoursWorked: -5 });
      expect(response.status).toBe(400);
      expect(response.body.message).toContain(
        "Invalid hoursWorked, hoursWorked must be greater than 0"
      );
    });

    it("should return 400 if no wage is found for the user", async () => {
      vi.spyOn(prisma.wage, "findFirst").mockResolvedValue(null);

      const response = await request(app)
        .post("/claim")
        .send({ teamId: 1, hoursWorked: 5 });

      expect(response.status).toBe(400);
      expect(response.body.message).toBe("No wage found for the user");
    });

    it("should return 201 and create a claim successfully", async () => {
      // @ts-ignore
      vi.spyOn(prisma.wage, "findFirst").mockResolvedValue({ id: 1 });
      // @ts-ignore
      vi.spyOn(prisma.claim, "create").mockResolvedValue({
        id: 1,
        hoursWorked: 5,
        status: "pending",
        wageId: 1,
      });

      const response = await request(app)
        .post("/claim")
        .send({ teamId: 1, hoursWorked: 5 });

      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty("id");
      expect(response.body.status).toBe("pending");
    });
    it("should return 500 if an error occurs", async () => {
      vi.spyOn(prisma.wage, "findFirst").mockRejectedValue("Test");

      const response = await request(app)
        .post("/claim")
        .send({ teamId: 1, hoursWorked: 5 });

      expect(response.status).toBe(500);
      expect(response.body.message).toBe("Internal server error has occured");
    });
  });

  describe("GET: /claim", () => {
    it("should return 400 if teamId is invalid", async () => {
      const response = await request(app)
        .get("/claim")
        .query({ teamId: "abc" });
      expect(response.status).toBe(400);
      expect(response.body.message).toBe("Invalid or missing teamId");
    });

    it("should return 403 if caller is not a member of the team", async () => {
      vi.spyOn(prisma.team, "findFirst").mockResolvedValue(null);

      const response = await request(app).get("/claim").query({ teamId: 1 });

      expect(response.status).toBe(403);
      expect(response.body.message).toBe("Caller is not a member of the team");
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

      const response = await request(app).get("/claim").query({ teamId: 1 });

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
        .get("/claim")
        .query({ teamId: 1, status: "pending" });

      expect(response.status).toBe(200);
      expect(response.body).toBeInstanceOf(Array);
      expect(response.body[0]).toHaveProperty("id");
    });

    it("should return 500 if an error occurs", async () => {
      // @ts-ignore
      vi.spyOn(prisma.team, "findFirst").mockRejectedValue("Test");
      const response = await request(app).get("/claim").query({ teamId: 1 });

      expect(response.status).toBe(500);
      expect(response.body.message).toBe("Internal server error has occured");
    });
  });

  describe("PUT: /claim/:claimId", () => {
    it("should return 400 for invalid action", async () => {
      const response = await request(app)
        .put("/claim/1")
        .query({ action: "invalid" });

      expect(response.status).toBe(400);
      expect(response.body.message).toContain("Invalid action");
    });

    it("should return 400 for missing signature", async () => {
      const response = await request(app)
        .put("/claim/1")
        .query({ action: "sign" });

      expect(response.status).toBe(400);
      expect(response.body.message).toContain("Missing signature");
    });

    it("should return 404 if claim is not found", async () => {
      vi.spyOn(prisma.claim, "findFirst").mockResolvedValue(null);

      const response = await request(app)
        .put("/claim/1")
        .query({ action: "sign" })
        .send({ signature: "0xabc" });

      expect(response.status).toBe(404);
      expect(response.body.message).toBe("Claim not found");
    });

    it("should return 403 if caller is not the owner of the team for sign action", async () => {
      vi.spyOn(prisma.claim, "findFirst").mockResolvedValue({
        id: 1,
        status: "pending",
        // @ts-ignore
        wage: { team: { ownerAddress: "0x456" } },
      });

      const response = await request(app)
        .put("/claim/1")
        .query({ action: "sign" })
        .send({ signature: "0xabc" });

      expect(response.status).toBe(403);
      expect(response.body.message).toBe("Caller is not the owner of the team");
    });

    it("should return 403 if caller is not the owner of the claim for withdraw action", async () => {
      vi.spyOn(prisma.claim, "findFirst").mockResolvedValue({
        id: 1,
        status: "pending",
        // @ts-ignore
        wage: { userAddress: "0x456" },
      });

      const response = await request(app)
        .put("/claim/1")
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
        wage: { team: { ownerAddress: "0x123" } },
      });

      const response = await request(app)
        .put("/claim/1")
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
        wage: { team: { ownerAddress: "0x123" } },
      });
      // @ts-ignore
      vi.spyOn(prisma.claim, "update").mockResolvedValue({
        id: 1,
        status: "signed",
      });

      const response = await request(app)
        .put("/claim/1")
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
          wage: { userAddress: "0x123" },
        });

        const response = await request(app)
          .put("/claim/1")
          .query({ action: "withdraw" });

        expect(response.status).toBe(403);
        expect(response.body.message).toContain("Can't withdraw");
      });

      it("should update claim status to withdrawn", async () => {
        vi.spyOn(prisma.claim, "findFirst").mockResolvedValue({
          id: 1,
          status: "signed",
          // @ts-ignore
          wage: { userAddress: "0x123" },
        });
        // @ts-ignore
        vi.spyOn(prisma.claim, "update").mockResolvedValue({
          id: 1,
          status: "withdrawn",
        });

        const response = await request(app)
          .put("/claim/1")
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
          wage: { team: { ownerAddress: "0x123" } },
        });

        const response = await request(app)
          .put("/claim/1")
          .query({ action: "disable" });

        expect(response.status).toBe(403);
        expect(response.body.message).toContain("Can't disable");
      });

      it("should update claim status to disabled", async () => {
        vi.spyOn(prisma.claim, "findFirst").mockResolvedValue({
          id: 1,
          status: "signed",
          // @ts-ignore
          wage: { team: { ownerAddress: "0x123" } },
        });
        // @ts-ignore
        vi.spyOn(prisma.claim, "update").mockResolvedValue({
          id: 1,
          status: "disabled",
        });

        const response = await request(app)
          .put("/claim/1")
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
          wage: { team: { ownerAddress: "0x123" } },
        });

        const response = await request(app)
          .put("/claim/1")
          .query({ action: "enable" });

        expect(response.status).toBe(403);
        expect(response.body.message).toContain("Can't enable");
      });

      it("should update claim status to enabled", async () => {
        vi.spyOn(prisma.claim, "findFirst").mockResolvedValue({
          id: 1,
          status: "disabled",
          // @ts-ignore
          wage: { team: { ownerAddress: "0x123" } },
        });
        // @ts-ignore
        vi.spyOn(prisma.claim, "update").mockResolvedValue({
          id: 1,
          status: "enabled",
        });

        const response = await request(app)
          .put("/claim/1")
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
          wage: { team: { ownerAddress: "0x123" } },
        });

        const response = await request(app)
          .put("/claim/1")
          .query({ action: "reject" });

        expect(response.status).toBe(403);
        expect(response.body.message).toContain("Can't reject");
      });

      it("should update claim status to rejected", async () => {
        vi.spyOn(prisma.claim, "findFirst").mockResolvedValue({
          id: 1,
          status: "pending",
          // @ts-ignore
          wage: { team: { ownerAddress: "0x123" } },
        });
        // @ts-ignore
        vi.spyOn(prisma.claim, "update").mockResolvedValue({
          id: 1,
          status: "rejected",
        });

        const response = await request(app)
          .put("/claim/1")
          .query({ action: "reject" });

        expect(response.status).toBe(200);
        expect(response.body.status).toBe("rejected");
      });
    });

    it("should return 500 if an error occurs", async () => {
      vi.spyOn(prisma.claim, "findFirst").mockRejectedValue("Test");

      const response = await request(app)
        .put("/claim/1")
        .query({ action: "sign" })
        .send({ signature: "0xabc" });

      expect(response.status).toBe(500);
      expect(response.body.message).toBe("Internal server error has occured");
    });
  });
});
