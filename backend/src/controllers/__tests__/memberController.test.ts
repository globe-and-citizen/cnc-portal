import request from "supertest";
import express, { Request, Response, NextFunction } from "express";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { prisma } from "../../utils";
import { faker } from "@faker-js/faker";
import teamRoutes from "../../routes/teamRoutes";
import { authorizeUser } from "../../middleware/authMiddleware";

// Hoisted mock variables
const { mockAuthorizeUser } = vi.hoisted(() => ({
  mockAuthorizeUser: vi.fn((req: Request, res: Response, next: NextFunction) => {
    (req as any).address = "0x1234567890123456789012345678901234567890";
    next();
  }),
}));

// Mock the authorizeUser middleware
vi.mock("../../middleware/authMiddleware", () => ({
  authorizeUser: mockAuthorizeUser,
}));


// Mock prisma
vi.mock("../../utils", async () => {
  const actual = await vi.importActual("../../utils");
  return {
    ...actual,
    prisma: {
      team: {
        findUnique: vi.fn(),
        update: vi.fn(),
      },
      teamMember: {
        findUnique: vi.fn(),
        create: vi.fn(),
        delete: vi.fn(),
        createMany: vi.fn(),
      },
      user: {
        findUnique: vi.fn(),
        create: vi.fn(),
      },
      memberTeamsData: {
        delete: vi.fn(),
      },
    },
  };
});

// Create test app with middleware
const createTestApp = () => {
  const app = express();
  app.use(express.json());
  app.use(mockAuthorizeUser);
  app.use("/team", teamRoutes);
  return app;
};

// Test data
const mockOwner = {
  address: "0x1234567890123456789012345678901234567890",
  name: "Test Owner",
  nonce: "123456",
};

const fakeMembers = [
  { address: faker.finance.ethereumAddress(), name: "Member 3" },
  { address: faker.finance.ethereumAddress(), name: "Member 4" },
];

const mockResolvedTeam = {
  createdAt: new Date(),
  updatedAt: new Date(),
  id: 1,
  name: "Test Team",
  description: "Test Description",
  ownerAddress: mockOwner.address,
  officerAddress: "0x3333333333333333333333333333333333333333",
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

describe("Member Controller", () => {
  let app: express.Application;

  beforeEach(() => {
    vi.clearAllMocks();
    app = createTestApp();
    mockAuthorizeUser.mockImplementation((req: Request, res: Response, next: NextFunction) => {
      (req as any).address = mockOwner.address;
      next();
    });
  });

  describe("POST: /team/:id/member", () => {
    it("should add members", async () => {
      vi.mocked(prisma.team.findUnique).mockResolvedValueOnce(mockResolvedTeam);
      vi.mocked(prisma.team.update).mockResolvedValueOnce(mockResolvedTeam);
      
      const response = await request(app)
        .post("/team/1/member")
        .send(fakeMembers);
        
      expect(response.status).toBe(201);
      expect(response.body).toEqual({ members: mockResolvedTeam.members });
    });

    it("should return 400 when Member is not well formatted", async () => {
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
    });

    it("Should return 404 when team is not found", async () => {
      vi.mocked(prisma.team.findUnique).mockResolvedValue(null);
      
      const response = await request(app)
        .post("/team/1/member")
        .send(fakeMembers);
        
      expect(response.status).toBe(404);
      expect(response.body).toEqual({ message: "Team not found" });
    });

    it("Should return 400 when members already exist in the team", async () => {
      const teamWithExistingMembers = {
        ...mockResolvedTeam,
        members: fakeMembers.map(member => ({ address: member.address, name: member.name })),
      };
      vi.mocked(prisma.team.findUnique).mockResolvedValueOnce(teamWithExistingMembers as any);
      
      const response = await request(app)
        .post("/team/1/member")
        .send(fakeMembers);
        
      expect(response.status).toBe(400);
      expect(response.body).toEqual({
        message: `Members ${fakeMembers.map(member => member.address)} already in the team`,
      });
    });

    it("Should return 403 when the caller is not the owner", async () => {
      const teamWithDifferentOwner = {
        ...mockResolvedTeam,
        ownerAddress: "0xNotOwnerAddress",
      };
      vi.mocked(prisma.team.findUnique).mockResolvedValueOnce(teamWithDifferentOwner);
      
      const response = await request(app)
        .post("/team/1/member")
        .send(fakeMembers);
        
      expect(response.status).toBe(403);
      expect(response.body).toEqual({
        message: "Unauthorized: Only the owner can Add a member",
      });
    });

    it("Should return 500 when an error occurs", async () => {
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      vi.mocked(prisma.team.findUnique).mockRejectedValue("Server error");
      
      const response = await request(app)
        .post("/team/1/member")
        .send(fakeMembers);
        
      expect(response.status).toBe(500);
      expect(response.body).toEqual({
        message: "Internal server error has occured",
        error: "",
      });
      
      consoleErrorSpy.mockRestore();
    });
  });

  describe("DELETE: /team/:id/member/:memberAddress", () => {
    it("should delete member", async () => {
      vi.mocked(prisma.team.findUnique).mockResolvedValueOnce(mockResolvedTeam);
      vi.mocked(prisma.team.update).mockResolvedValueOnce(mockResolvedTeam);
      vi.mocked(prisma.memberTeamsData.delete).mockResolvedValueOnce({} as any);
      
      const response = await request(app).delete("/team/1/member/0xMemberAddress1");
      
      expect(response.status).toBe(204);
    });

    it("should return 404 when team is not found", async () => {
      vi.mocked(prisma.team.findUnique).mockResolvedValue(null);
      
      const response = await request(app).delete("/team/1/member/0xMemberAddress1");
      
      expect(response.status).toBe(404);
      expect(response.body).toEqual({ message: "Team not found" });
    });

    it("should return 404 when member is not found in the team", async () => {
      vi.mocked(prisma.team.findUnique).mockResolvedValueOnce(mockResolvedTeam);
      
      const response = await request(app).delete("/team/1/member/0xNotMemberAddress");
      
      expect(response.status).toBe(404);
      expect(response.body).toEqual({
        message: "Member not found in the team",
      });
    });

    it("should return 403 when the caller is not the owner", async () => {
      const teamWithDifferentOwner = {
        ...mockResolvedTeam,
        ownerAddress: "0xNotOwnerAddress",
      };
      vi.mocked(prisma.team.findUnique).mockResolvedValueOnce(teamWithDifferentOwner);
      
      const response = await request(app).delete("/team/1/member/0xMemberAddress1");
      
      expect(response.status).toBe(403);
      expect(response.body).toEqual({
        message: "Unauthorized: Only the owner can delete a member",
      });
    });

    it("should return 403 when the owner is trying to delete himself", async () => {
      vi.mocked(prisma.team.findUnique).mockResolvedValueOnce(mockResolvedTeam);
      
      const response = await request(app).delete(`/team/1/member/${mockOwner.address}`);
      
      expect(response.status).toBe(403);
      expect(response.body).toEqual({
        message: "Unauthorized: The Owner cannot be removed",
      });
    });

    it("should return 500 when an error occurs", async () => {
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      vi.mocked(prisma.team.findUnique).mockRejectedValue("Server error");
      
      const response = await request(app).delete("/team/1/member/0xMemberAddress1");
      
      expect(response.status).toBe(500);
      expect(response.body).toEqual({
        message: "Internal server error has occured",
        error: "",
      });
      
      consoleErrorSpy.mockRestore();
    });
  });
});
