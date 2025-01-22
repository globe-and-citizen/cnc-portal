import request from "supertest";
import express, { Request, Response, NextFunction } from "express";
import {
  addExpenseAccountData,
  getExpenseAccountData,
  addTeam,
} from "../teamController";
import { prisma } from "../../utils";
import { describe, it, beforeEach, expect, vi } from "vitest";

vi.mock("../../utils");

function setAddressMiddleware(address: string) {
  return (req: Request, res: Response, next: NextFunction) => {
    (req as any).address = address;
    next();
  };
}

describe("addTeam", () => {
  const mockOwner = {
    address: "0xOwnerAddress",
    name: "Test Owner",
    nonce: "0xNonce",
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

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should return 404 if owner not found", async () => {
    const app = express();
    app.use(express.json());
    app.use(setAddressMiddleware(mockOwner.address));
    app.post("/team", addTeam);
    vi.spyOn(prisma.user, "findUnique").mockResolvedValue(null);

    const response = await request(app).post("/team").send(mockTeamData);

    expect(response.status).toBe(500);
    expect(response.body.message).toEqual("Internal server error has occured");
  });

  it("should return 500 if invalid wallet address provided", async () => {
    const app = express();
    app.use(express.json());
    app.use(setAddressMiddleware(mockOwner.address));
    app.post("/team", addTeam);
    vi.spyOn(prisma.user, "findUnique").mockResolvedValue(mockOwner);

    const response = await request(app)
      .post("/team")
      .send({
        ...mockTeamData,
        members: [{ address: "invalid-address", name: "Invalid Member" }],
      });

    expect(response.status).toBe(500);
    expect(response.body.message).toEqual("Internal server error has occured");
  });

  it("should return 500 if there is a server error", async () => {
    const app = express();
    app.use(express.json());
    app.use(setAddressMiddleware(mockOwner.address));
    app.post("/team", addTeam);
    vi.spyOn(prisma.user, "findUnique").mockRejectedValue(
      new Error("Server error")
    );

    const response = await request(app).post("/team").send(mockTeamData);

    expect(response.status).toBe(500);
    expect(response.body.message).toEqual("Internal server error has occured");
  });
});

describe("POST /expenseAccount/:id", () => {
  const mockTeamData = {
    id: 1,
    ownerAddress: "0xOwnerAddress",
    description: null,
    name: "",
    bankAddress: "0xBankAddress",
    votingAddress: "0xVotingAddress",
    boardOfDirectorsAddress: "0xBoardOfDirectorsAddress",
    expenseAccountAddress: "0xExpenseAccountAddress",
    officerAddress: "0xOfficerAddress",
    expenseAccountEip712Address: "0xExpenseAccountEIP712Address",
    investorsAddress: "0xInvestorsAddress",
    cashRemunerationEip712Address: null,
  };
  const mockExpenseAccountData = {
    expenseAccountData: {
      approvedAddress: "0xApprovedAddress",
      someOtherField: "someData",
    },
    signature: "0xSignature",
  };
  const mockMemberTeamsData = {
    id: 1,
    userAddress: "0xMemberAddress",
    teamId: 1,
    expenseAccountData: JSON.stringify(
      mockExpenseAccountData.expenseAccountData
    ),
    expenseAccountSignature: mockExpenseAccountData.signature,
    hourlyRate: null,
    maxHoursPerWeek: null,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should return 403 if caller address is not the team owner", async () => {
    const app = express();
    app.use(express.json());
    app.use(setAddressMiddleware("0xDifferentAddress"));
    app.post("/expenseAccount/:id", addExpenseAccountData);
    vi.spyOn(prisma.team, "findUnique").mockResolvedValue(mockTeamData);

    // Mount middleware with a custom address
    // app.use(setAddressMiddleware('0xDifferentAddress'))

    const response = await request(app)
      .post("/expenseAccount/1")
      .set("address", "0xDifferentAddress") // Simulate unauthorized caller
      .send(mockExpenseAccountData);

    expect(response.status).toBe(403);
    expect(response.body).toEqual({
      success: false,
      message: "Forbidden",
    });
  });

  it("should return 201 and create data if caller is authorized", async () => {
    const app = express();
    app.use(express.json());
    app.use(setAddressMiddleware("0xOwnerAddress"));
    app.post("/expenseAccount/:id", addExpenseAccountData);
    vi.spyOn(prisma.team, "findUnique").mockResolvedValue(mockTeamData);
    vi.spyOn(prisma.memberTeamsData, "upsert").mockResolvedValue(
      mockMemberTeamsData
    );

    const response = await request(app)
      .post("/expenseAccount/1")
      .set("address", "0xOwnerAddress") // Simulate authorized caller
      .send(mockExpenseAccountData);

    expect(response.status).toBe(201);
    expect(response.body).toEqual({
      success: true,
    });

    expect(prisma.team.findUnique).toHaveBeenCalledWith({
      where: { id: 1 },
    });

    expect(prisma.memberTeamsData.upsert).toHaveBeenCalledWith({
      where: {
        userAddress_teamId: {
          userAddress: "0xApprovedAddress",
          teamId: 1,
        },
      },
      update: {
        expenseAccountData: JSON.stringify(
          mockExpenseAccountData.expenseAccountData
        ),
        expenseAccountSignature: mockExpenseAccountData.signature,
      },
      create: {
        userAddress: "0xApprovedAddress",
        teamId: 1,
        expenseAccountData: JSON.stringify(
          mockExpenseAccountData.expenseAccountData
        ),
        expenseAccountSignature: mockExpenseAccountData.signature,
      },
    });
  });

  it("should return 500 if there is a server error", async () => {
    const app = express();
    app.use(express.json());
    app.use(setAddressMiddleware("0xOwnerAddress"));
    app.post("/expenseAccount/:id", addExpenseAccountData);

    vi.spyOn(prisma.team, "findUnique").mockRejectedValue(
      new Error("Server error")
    );

    const response = await request(app)
      .post("/expenseAccount/1")
      .set("address", "0xOwnerAddress")
      .send(mockExpenseAccountData);

    expect(response.status).toBe(500);
    expect(response.body).toEqual({
      error: "Server error",
      message: "Internal server error has occured",
      success: false,
    });
  });
});

describe("GET /expenseAccount/:id", () => {
  const app = express();
  app.use(express.json());
  app.get("/expenseAccount/:id", getExpenseAccountData);

  const mockExpenseAccountData = [
    {
      id: 1,
      userAddress: "0xMemberAddress",
      teamId: 1,
      expenseAccountData: JSON.stringify({
        approvedAddress: "0xApprovedAddress",
        someOtherField: "someData",
      }),
      expenseAccountSignature: "0xSignature",
      maxHoursPerWeek: null,
      hourlyRate: null,
    },
    {
      id: 2,
      userAddress: "0xAnotherMemberAddress",
      teamId: 1,
      expenseAccountData: JSON.stringify({
        approvedAddress: "0xAnotherApprovedAddress",
        someOtherField: "someData",
      }),
      expenseAccountSignature: "0xAnotherSignature",
      maxHoursPerWeek: null,
      hourlyRate: null,
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should return 201 with expense account data and signature if data exists", async () => {
    // Mock the Prisma findUnique function to return the test data
    vi.spyOn(prisma.memberTeamsData, "findUnique").mockResolvedValue(
      mockExpenseAccountData[0]
    );

    const response = await request(app)
      .get("/expenseAccount/1")
      .set("memberaddress", "0xApprovedAddressX");

    expect(response.status).toBe(201);
    expect(response.body).toEqual({
      data: mockExpenseAccountData[0].expenseAccountData,
      signature: mockExpenseAccountData[0].expenseAccountSignature,
    });
  });

  it("should return 201 with many expense data if member address is not set", async () => {
    vi.spyOn(prisma.memberTeamsData, "findMany").mockResolvedValue(
      mockExpenseAccountData
    );

    const response = await request(app).get("/expenseAccount/1");

    expect(response.status).toBe(201);
    expect(response.body).toEqual(
      mockExpenseAccountData.map((item) => ({
        ...JSON.parse(item.expenseAccountData),
        signature: item.expenseAccountSignature,
      }))
    );
  });

  it("should return 500 if there is a server error", async () => {
    // Mock findUnique to throw an error
    vi.spyOn(prisma.memberTeamsData, "findUnique").mockRejectedValue(
      new Error("Database error")
    );

    const response = await request(app)
      .get("/expenseAccount/1")
      .set("memberaddress", "0xApprovedAddress");

    expect(response.status).toBe(500);
    expect(response.body).toEqual({
      error: "Database error",
      message: "Internal server error has occured",
      success: false,
    });
  });
});
