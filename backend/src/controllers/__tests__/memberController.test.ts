import request from "supertest";
import express, { Request, Response, NextFunction } from "express";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { prisma } from "../../utils";
import { deleteMember, addMembers } from "../memberController";
import { faker } from "@faker-js/faker";
import { Team } from "@prisma/client";
const mockOwner = {
  address: "0xOwnerAddress",
  name: "Test Owner",
  nonce: "123456",
};
const mockTeamData = {
  name: "Test Team",
  description: "Test Description",
  members: [
    { address: "0xMemberAddress1", name: "Member 1" },
    { address: "0xMemberAddress2", name: "Member 2" },
  ],
  officerAddress: "0xOfficerAddress",
};
const fakeMembers = [
  { address: faker.finance.ethereumAddress(), name: "Member 3" },
  { address: faker.finance.ethereumAddress(), name: "Member 4" },
];
const mockCreatedTeam = {
  id: 1,
  name: mockTeamData.name,
  description: mockTeamData.description,
  ownerAddress: mockOwner.address,
  officerAddress: mockTeamData.officerAddress,
  members: [
    { address: "0xMemberAddress1", name: "Member 1" },
    { address: "0xMemberAddress2", name: "Member 2" },
    { address: mockOwner.address, name: mockOwner.name },
  ],
};

// const mockResolvedTeam = <Team>{
const mockResolvedTeam = {
  createdAt: new Date(),
  updatedAt: new Date(),
  id: 1,
  name: mockTeamData.name,
  description: mockTeamData.description,
  ownerAddress: mockOwner.address,
  officerAddress: mockTeamData.officerAddress,
  bankAddress: null,
  votingAddress: null,
  boardOfDirectorsAddress: null,
  expenseAccountAddress: null,
  investorsAddress: null,
  expenseAccountEip712Address: null,
  cashRemunerationEip712Address: null,
  BoardOfDirectorActions: null,
  members: [
    { address: "0xMemberAddress1", name: "Member 1" },
    { address: "0xMemberAddress2", name: "Member 2" },
    { address: mockOwner.address, name: mockOwner.name },
  ],
};
type TeamMemberData = {
  id: number;
  userAddress: string;
  teamId: number;
  expenseAccountData: string | null;
  expenseAccountSignature: string | null;
  hourlyRate: string | null;
  maxHoursPerWeek: number | null;
};

const mockTeamMemberData = <TeamMemberData>{
  id: 1,
  userAddress: "0xMemberAddress1",
  teamId: 1,
  expenseAccountData: null,
  expenseAccountSignature: null,
  hourlyRate: "10",
  maxHoursPerWeek: 40,
};

function setAddressMiddleware(address: string) {
  return (req: Request, res: Response, next: NextFunction) => {
    (req as any).address = address;
    next();
  };
}

describe("Member Controller", () => {
  describe("POST: /team/:id/member", () => {
    // Prepare context
    const app = express();
    app.use(express.json());
    app.use(setAddressMiddleware(mockOwner.address));
    app.post("/team/:id/member", addMembers);

    beforeEach(() => {
      vi.clearAllMocks();
    });

    // Start testing
    it("should add members", async () => {
      vi.spyOn(prisma.team, "findUnique").mockResolvedValueOnce(
        mockResolvedTeam
      );
      vi.spyOn(prisma.team, "update").mockResolvedValueOnce(mockResolvedTeam);
      const response = await request(app)
        .post("/team/1/member")
        .send(fakeMembers);
      expect(response.status).toBe(201);
      expect(response.body).toEqual({ members: mockResolvedTeam.members });
    });

    describe("Error cases", () => {
      it("should return 400 when Member is not well formated", async () => {
        const response = await request(app)
          .post("/team/1/member")
          .send([
            { address: "Not Valid address", name: "Member 3" },
            { address: faker.finance.ethereumAddress(), name: "Member 4" },
          ]);
        expect(response.status).toBe(400);
        expect(response.body).toEqual({
          message: "Bad Request: Members data is not well formated",
        });
        // TODO check also, case of : the data provided is not an array or an empty array
      });

      it("Should return 404 when team is not found", async () => {
        vi.spyOn(prisma.team, "findUnique").mockResolvedValue(null);
        const response = await request(app)
          .post("/team/1/member")
          .send(fakeMembers);
        expect(response.status).toBe(404);
        expect(response.body).toEqual({ message: "Team not found" });
      });

      it("Should return 400 when members already exist in the team", async () => {
        vi.spyOn(prisma.team, "findUnique").mockResolvedValueOnce({
          ...mockResolvedTeam,
          members: fakeMembers as any,
        });
        const response = await request(app)
          .post("/team/1/member")
          .send(fakeMembers);
        expect(response.status).toBe(400);
        expect(response.body).toEqual({
          message: `Members ${fakeMembers.map(
            (member) => member.address
          )} already in the team`,
        });
      });
      it("Should return 403 when the caller is not the owner", async () => {
        vi.spyOn(prisma.team, "findUnique").mockResolvedValueOnce({
          ...mockResolvedTeam,
          ownerAddress: "0xNotOwnerAddress",
        });
        const response = await request(app)
          .post("/team/1/member")
          .send(fakeMembers);
        expect(response.status).toBe(403);
        expect(response.body).toEqual({
          message: "Unauthorized: Only the owner can Add a member",
        });
      });
      it("Should return 500 when an error occurs", async () => {
        // Make prisma to throw an error
        vi.spyOn(prisma.team, "findUnique").mockRejectedValue(new Error(""));
        const response = await request(app)
          .post("/team/1/member")
          .send(fakeMembers);
        expect(response.status).toBe(500);
        expect(response.body).toEqual({
          error: "",
          message: "Internal server error has occured",
        });
      });
    });
  });

  describe("DELET: /team/:id/member/:memberAddress", () => {
    // Prepare context
    const app = express();
    app.use(express.json());
    app.use(setAddressMiddleware(mockOwner.address));
    app.delete("/team/:id/member/:memberAddress", deleteMember);

    beforeEach(() => {
      vi.clearAllMocks();
    });

    it("should delete member", async () => {
      vi.spyOn(prisma.team, "findUnique").mockResolvedValueOnce(
        mockResolvedTeam
      );
      vi.spyOn(prisma.team, "update").mockResolvedValueOnce(mockResolvedTeam);
      vi.spyOn(prisma.memberTeamsData, "delete").mockRejectedValue(null);
      const response = await request(app).delete(
        "/team/1/member/0xMemberAddress1"
      );
      expect(response.status).toBe(204);
    });

    it("should return 404 when team is not found", async () => {
      vi.spyOn(prisma.team, "findUnique").mockResolvedValue(null);
      const response = await request(app).delete(
        "/team/1/member/0xMemberAddress1"
      );
      expect(response.status).toBe(404);
      expect(response.body).toEqual({ message: "Team not found" });
    });

    it("should return 404 when member is not found in the team", async () => {
      vi.spyOn(prisma.team, "findUnique").mockResolvedValueOnce(
        mockResolvedTeam
      );
      const response = await request(app).delete(
        "/team/1/member/0xNotMemberAddress"
      );
      expect(response.status).toBe(404);
      expect(response.body).toEqual({
        message: "Member not found in the team",
      });
    });

    it("should return 403 when the caller is not the owner", async () => {
      vi.spyOn(prisma.team, "findUnique").mockResolvedValueOnce({
        ...mockResolvedTeam,
        ownerAddress: "0xNotOwnerAddress",
      });
      const response = await request(app).delete(
        "/team/1/member/0xMemberAddress1"
      );
      expect(response.status).toBe(403);
      expect(response.body).toEqual({
        message: "Unauthorized: Only the owner can delete a member",
      });
    });

    it("should return 403 when the owner is trying to delete himself", async () => {
      vi.spyOn(prisma.team, "findUnique").mockResolvedValueOnce(
        mockResolvedTeam
      );
      const response = await request(app).delete(
        "/team/1/member/0xOwnerAddress"
      );
      expect(response.status).toBe(403);
      expect(response.body).toEqual({
        message: "Unauthorized: The Owner cannot be removed",
      });
    });

    it("should return 500 when an error occurs", async () => {
      vi.spyOn(prisma.team, "findUnique").mockRejectedValue(new Error(""));
      const response = await request(app).delete(
        "/team/1/member/0xMemberAddress1"
      );
      expect(response.status).toBe(500);
      expect(response.body).toEqual({
        error: "",
        message: "Internal server error has occured",
      });
    });
  });

});
