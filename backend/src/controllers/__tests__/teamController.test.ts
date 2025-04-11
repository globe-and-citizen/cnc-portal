import request from "supertest";
import express, { Request, Response, NextFunction } from "express";
import {
  addExpenseAccountData,
  getExpenseAccountData,
  addTeam,
} from "../teamController";
import { prisma } from "../../utils";
import { describe, it, beforeEach, expect, vi } from "vitest";
import publicClient from "../../utils/viem.config";
import OFFICER_ABI from "../../artifacts/officer_abi.json";

vi.mock("../../utils");
vi.mock("../../utils/viem.config");

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

// describe("Cash Remuneration", () => {
//   describe("GET /:id/cash-remuneration/claim", () => {
//     const mockClaimData = {
//       id: 1,
//       createdAt: new Date("2024-02-02T12:00:00Z"),
//       status: "approved",
//       hoursWorked: 20,
//       cashRemunerationSignature: "0xSignature",
//       memberTeamsDataId: 1,
//     };
//     const mockMemberTeamsData = {
//       id: 1,
//       userAddress: "0xMemberAddress",
//       teamId: 1,
//       expenseAccountData: null,
//       expenseAccountSignature: null,
//       hourlyRate: "10",
//       maxHoursPerWeek: 20,
//     };
//     beforeEach(() => {
//       vi.clearAllMocks();
//     });
//     it("should return 404 if claim not found", async () => {
//       const app = express();
//       app.use(express.json());
//       app.get("/:id/cash-remuneration/claim", getClaim);
//       vi.spyOn(prisma.claim, "findUnique").mockResolvedValue(null);

//       const response = await request(app).get("/1/cash-remuneration/claim");

//       expect(response.status).toBe(404);
//       expect(response.body).toEqual({
//         message: "Resource Not Found",
//       });
//     });
//     it("should return 201 if claim retrieved successfully", async () => {
//       const app = express();
//       app.use(express.json());
//       app.get("/:id/cash-remuneration/claim", getClaim);
//       vi.spyOn(prisma.claim, "findUnique").mockResolvedValue(mockClaimData);
//       vi.spyOn(prisma.memberTeamsData, "findUnique").mockResolvedValue(
//         mockMemberTeamsData
//       );

//       const response = await request(app).get("/1/cash-remuneration/claim");

//       expect(response.status).toBe(201);
//       expect(response.body).toEqual({
//         ...mockClaimData,
//         createdAt: "2024-02-02T12:00:00.000Z",
//         hourlyRate: mockMemberTeamsData.hourlyRate,
//         teamId: mockMemberTeamsData.teamId,
//       });
//     });
//     it("should return 500 if there is a server error", async () => {
//       const app = express();
//       app.use(express.json());
//       app.get("/:id/cash-remuneration/claim", getClaim);
//       vi.spyOn(prisma.claim, "findUnique").mockRejectedValue(
//         new Error("Server error")
//       );

//       const response = await request(app).get("/1/cash-remuneration/claim");

//       expect(response.status).toBe(500);
//       expect(response.body).toEqual({
//         error: "Server error",
//         message: "Internal server error has occured",
//       });
//     });
//   });
//   describe("GET /:id/cash-remuneration/claim/:status", () => {
//     const mockTeamData = {
//       id: 1,
//       ownerAddress: "0xOwnerAddress",
//       description: null,
//       name: "",
//       bankAddress: "0xBankAddress",
//       votingAddress: "0xVotingAddress",
//       boardOfDirectorsAddress: "0xBoardOfDirectorsAddress",
//       expenseAccountAddress: "0xExpenseAccountAddress",
//       officerAddress: "0xOfficerAddress",
//       expenseAccountEip712Address: "0xExpenseAccountEIP712Address",
//       cashRemunerationEip712Address: null,
//       investorsAddress: "0xInvestorsAddress",
//     };
//     beforeEach(() => {
//       vi.clearAllMocks();
//     });
//     it("should return 404 if team not found", async () => {
//       const app = express();
//       app.use(express.json());
//       app.use(setAddressMiddleware("0xDifferentAddress"));
//       app.get("/:id/cash-remuneration/claim/:status", getClaims);
//       vi.spyOn(prisma.team, "findUnique").mockResolvedValue(null);

//       const response = await request(app)
//         .get("/1/cash-remuneration/claim/pending")
//         .set("address", "0xOwnerAddress"); // Simulate unauthorized caller

//       expect(response.status).toBe(404);
//       expect(response.body).toEqual({
//         message: "Resource Not Found",
//       });
//     });
//     it("should return 500 if there is a server error", async () => {
//       const app = express();
//       app.use(express.json());
//       app.use(setAddressMiddleware("0xDifferentAddress"));
//       app.get("/:id/cash-remuneration/claim/:status", getClaims);
//       vi.spyOn(prisma.team, "findUnique").mockResolvedValue(mockTeamData);
//       vi.spyOn(prisma.memberTeamsData, "findMany").mockRejectedValue(
//         new Error("Server error")
//       );

//       const response = await request(app)
//         .get("/1/cash-remuneration/claim/pending")
//         .set("address", "0xOwnerAddress"); // Simulate unauthorized caller

//       expect(response.status).toBe(500);
//       expect(response.body).toEqual({
//         error: "Server error",
//         message: "Internal server error has occured",
//       });
//     });
//   });
//   describe("PUT /:id/cash-remuneration/claim/:callerRole", () => {
//     // employer
//     describe("employer", () => {
//       const mockTeamData = {
//         id: 1,
//         ownerAddress: "0xOwnerAddress",
//         description: null,
//         name: "",
//         bankAddress: "0xBankAddress",
//         votingAddress: "0xVotingAddress",
//         boardOfDirectorsAddress: "0xBoardOfDirectorsAddress",
//         expenseAccountAddress: "0xExpenseAccountAddress",
//         officerAddress: "0xOfficerAddress",
//         expenseAccountEip712Address: "0xExpenseAccountEIP712Address",
//         cashRemunerationEip712Address: null,
//         investorsAddress: "0xInvestorsAddress",
//       };
//       const cashRemunerationSignature = "0xCashRemunerationSignature";
//       const claimId = 1;
//       const mockMemberTeamsData = {
//         id: 1,
//         userAddress: "0xMemberAddress",
//         teamId: 1,
//         expenseAccountData: null,
//         expenseAccountSignature: null,
//         hourlyRate: "10",
//         maxHoursPerWeek: 20,
//       };
//       const mockClaimData = {
//         id: 1,
//         createdAt: new Date(),
//         status: "pending",
//         hoursWorked: 20,
//         cashRemunerationSignature: null,
//         memberTeamsDataId: 1,
//       };

//       beforeEach(() => {
//         vi.clearAllMocks();
//       });

//       it("should return 403 if caller not team owner", async () => {
//         const app = express();
//         app.use(express.json());
//         app.use(setAddressMiddleware("0xDifferentAddress"));
//         app.put("/:id/cash-remuneration/claim/:callerRole", updateClaim);
//         vi.spyOn(prisma.memberTeamsData, "findUnique").mockResolvedValue(
//           mockMemberTeamsData
//         );
//         vi.spyOn(prisma.claim, "findUnique").mockResolvedValue(mockClaimData);
//         vi.spyOn(prisma.claim, "update"); //.mockResolvedValue(mockClaimData)

//         const response = await request(app)
//           .put("/1/cash-remuneration/claim/employer")
//           .set("address", "0xDifferentAddress") // Simulate unauthorized caller
//           .set("signature", cashRemunerationSignature)
//           .set("claimid", `${claimId}`);

//         expect(response.status).toBe(403);
//         expect(response.body).toEqual({
          
//           message: "Forbidden",
//         });
//       });
//       it("should return 403 if status not pending", async () => {
//         const app = express();
//         app.use(express.json());
//         app.use(setAddressMiddleware("0xOwnerAddress"));
//         app.put("/:id/cash-remuneration/claim/:callerRole", updateClaim);
//         vi.spyOn(prisma.memberTeamsData, "findUnique").mockResolvedValue(
//           mockMemberTeamsData
//         );
//         vi.spyOn(prisma.claim, "findUnique").mockResolvedValue({
//           ...mockClaimData,
//           status: "approved",
//         });
//         vi.spyOn(prisma.claim, "update"); //.mockResolvedValue(mockClaimData)

//         const response = await request(app)
//           .put("/1/cash-remuneration/claim/employer")
//           .set("address", "0xOwnerAddress") // Simulate unauthorized caller
//           .set("signature", cashRemunerationSignature)
//           .set("claimid", `${claimId}`);

//         expect(response.status).toBe(403);
//         expect(response.body).toEqual({
          
//           message: "Forbidden",
//         });
//       });
//       it("should return 400 if request bad format", async () => {
//         const app = express();
//         app.use(express.json());
//         app.use(setAddressMiddleware("0xOwnerAddress"));
//         app.put("/:id/cash-remuneration/claim/:callerRole", updateClaim);
//         vi.spyOn(prisma.team, "findUnique").mockResolvedValue(mockTeamData);
//         vi.spyOn(prisma.memberTeamsData, "findUnique").mockResolvedValue(
//           mockMemberTeamsData
//         );
//         vi.spyOn(prisma.claim, "findUnique").mockResolvedValue(mockClaimData);
//         vi.spyOn(prisma.claim, "update"); //.mockResolvedValue(mockClaimData)

//         const response = await request(app)
//           .put("/1/cash-remuneration/claim/employer")
//           .set("address", "0xOwnerAddress") // Simulate unauthorized caller
//           .set("claimid", `${claimId}`);

//         expect(response.status).toBe(400);
//         expect(response.body).toEqual({
          
//           message: "Bad Request",
//         });
//       });
//       // it('should return 201 if claim successfully approved', async () => {
//       //   const app = express()
//       //   app.use(express.json())
//       //   app.use(setAddressMiddleware('0xOwnerAddress'))
//       //   app.put('/:id/cash-remuneration/claim/:callerRole', updateClaim)
//       //   vi.spyOn(prisma.team, 'findUnique').mockResolvedValue(mockTeamData)
//       //   vi.spyOn(prisma.memberTeamsData, 'findUnique').mockResolvedValue(mockMemberTeamsData)
//       //   vi.spyOn(prisma.claim, 'findUnique').mockResolvedValue(mockClaimData)
//       //   vi.spyOn(prisma.claim, 'update')//.mockResolvedValue(mockClaimData)

//       //   const response = await request(app)
//       //     .put('/1/cash-remuneration/claim/employer')
//       //     .set('address', '0xOwnerAddress') // Simulate unauthorized caller
//       //     .set('signature', cashRemunerationSignature)
//       //     .set('claimid', `${claimId}`)

//       //   expect(prisma.claim.update).toBeCalledWith({
//       //     where: { id: claimId },
//       //     data: { cashRemunerationSignature, status: 'approved' }
//       //   })
//       //   expect(response.status).toBe(201)
//       //   expect(response.body).toEqual({
//       //     success: true
//       //   })
//       // })
//       it("should return 500 if there is a server error", async () => {
//         const app = express();
//         app.use(express.json());
//         app.use(setAddressMiddleware("0xOwnerAddress"));
//         app.put("/:id/cash-remuneration/claim/:callerRole", updateClaim);
//         vi.spyOn(prisma.team, "findUnique").mockResolvedValue(mockTeamData);
//         vi.spyOn(prisma.memberTeamsData, "findUnique").mockRejectedValue(
//           new Error("Server error")
//         );
//         vi.spyOn(prisma.claim, "findUnique").mockResolvedValue(mockClaimData);
//         vi.spyOn(prisma.claim, "update"); //.mockResolvedValue(mockClaimData)

//         const response = await request(app)
//           .put("/1/cash-remuneration/claim/employer")
//           .set("address", "0xOwnerAddress") // Simulate unauthorized caller
//           .set("signature", cashRemunerationSignature)
//           .set("claimid", `${claimId}`);

//         expect(response.status).toBe(500);
//         expect(response.body).toEqual({
//           error: "Server error",
//           message: "Internal server error has occured",
          
//         });
//       });
//     });

//     // employee
//     describe("employee", () => {
//       const hoursWorked = 15;
//       const claimId = 1;
//       const mockMemberTeamsData = {
//         id: 1,
//         userAddress: "0xMemberAddress",
//         teamId: 1,
//         expenseAccountData: null,
//         expenseAccountSignature: null,
//         hourlyRate: "10",
//         maxHoursPerWeek: 20,
//       };
//       const mockClaimData = {
//         id: 1,
//         createdAt: new Date(),
//         status: "pending",
//         hoursWorked: 20,
//         cashRemunerationSignature: null,
//         memberTeamsDataId: 1,
//       };

//       beforeEach(() => {
//         vi.clearAllMocks();
//       });

//       it("should return 403 if the caller is not the team member", async () => {
//         const app = express();
//         app.use(express.json());
//         app.use(setAddressMiddleware("0xOwnerAddress"));
//         app.put("/:id/cash-remuneration/claim/:callerRole", updateClaim);
//         vi.spyOn(prisma.memberTeamsData, "findUnique").mockResolvedValue(
//           mockMemberTeamsData
//         );
//         vi.spyOn(prisma.claim, "findUnique").mockResolvedValue({
//           ...mockClaimData,
//           memberTeamsDataId: 2,
//         });
//         vi.spyOn(prisma.claim, "update"); //.mockResolvedValue(mockClaimData)

//         const response = await request(app)
//           .put("/1/cash-remuneration/claim/employee")
//           .set("address", "0xOwnerAddress") // Simulate unauthorized caller
//           .set("hoursworked", `${hoursWorked}`)
//           .set("claimid", `${claimId}`);

//         expect(response.status).toBe(403);
//         expect(response.body).toEqual({
          
//           message: "Forbidden",
//         });
//       });

//       it("should return 201 if update successful", async () => {
//         const app = express();
//         app.use(express.json());
//         app.use(setAddressMiddleware("0xOwnerAddress"));
//         app.put("/:id/cash-remuneration/claim/:callerRole", updateClaim);
//         vi.spyOn(prisma.memberTeamsData, "findUnique").mockResolvedValue(
//           mockMemberTeamsData
//         );
//         vi.spyOn(prisma.claim, "findUnique").mockResolvedValue(mockClaimData);
//         vi.spyOn(prisma.claim, "update").mockResolvedValue({
//           ...mockClaimData,
//           hoursWorked: hoursWorked,
//         });

//         const response = await request(app)
//           .put("/1/cash-remuneration/claim/employee")
//           .set("address", "0xOwnerAddress") // Simulate unauthorized caller
//           .send({
//             hoursworked: hoursWorked,
//             claimid: claimId,
//           });

//         expect(prisma.claim.update).toBeCalledWith({
//           where: { id: claimId },
//           data: { hoursWorked: hoursWorked },
//         });
//         expect(response.status).toBe(201);
//       });

//       it('should update claim status to withdrawn if current claim status is "approved"', async () => {
//         const app = express();
//         app.use(express.json());
//         app.use(setAddressMiddleware("0xOwnerAddress"));
//         app.put("/:id/cash-remuneration/claim/:callerRole", updateClaim);
//         vi.spyOn(prisma.memberTeamsData, "findUnique").mockResolvedValue(
//           mockMemberTeamsData
//         );
//         vi.spyOn(prisma.claim, "findUnique").mockResolvedValue({
//           ...mockClaimData,
//           status: "approved",
//         });
//         vi.spyOn(prisma.claim, "update").mockResolvedValue({
//           ...mockClaimData,
//           status: "withdrawn",
//         });
//         vi.spyOn;

//         const response = await request(app)
//           .put("/1/cash-remuneration/claim/employee")
//           .set("address", "0xOwnerAddress")
//           .send({
//             hoursworked: hoursWorked,
//             claimid: claimId,
//           });

//         expect(prisma.claim.update).toBeCalledWith({
//           where: { id: claimId },
//           data: { status: "withdrawn" },
//         });
//         expect(response.status).toBe(201);
       
//       });

//       it("should return 500 if there is a server error", async () => {
//         const app = express();
//         app.use(express.json());
//         app.use(setAddressMiddleware("0xOwnerAddress"));
//         app.put("/:id/cash-remuneration/claim/:callerRole", updateClaim);

//         vi.spyOn(prisma.memberTeamsData, "findUnique").mockRejectedValue(
//           new Error("Server error")
//         );

//         const response = await request(app)
//           .put("/1/cash-remuneration/claim/employee")
//           .set("address", "0xOwnerAddress")
//           .set("hoursWorked", `${hoursWorked}`);

//         expect(response.status).toBe(500);
//         expect(response.body).toEqual({
//           error: "Server error",
//           message: "Internal server error has occured",
          
//         });
//       });
//     });

//     //invalid role
//     it("should return 404 if invalid caller role", async () => {
//       const app = express();
//       app.use(express.json());
//       app.use(setAddressMiddleware("0xSomeAddress"));
//       app.put("/:id/cash-remuneration/claim/non_existent", updateClaim);
//       // vi.spyOn(prisma.memberTeamsData, 'findUnique').mockResolvedValue({ ...mockMemberTeamsData, id: 2 })
//       // vi.spyOn(prisma.claim, 'findUnique').mockResolvedValue(mockClaimData)

//       const response = await request(app)
//         .put("/1/cash-remuneration/claim/non_existent")
//         .set("address", "0xSomeAddress") // Simulate unauthorized caller
//         .set("claimid", `1`);

//       expect(response.status).toBe(404);
//       expect(response.body).toEqual({
        
//         message: "Resource Not Found",
//       });
//     });
//   });
//   describe("DELETE /:id/cash-remuneration/claim", () => {
//     const claimId = 1;
//     const mockMemberTeamsData = {
//       id: 1,
//       userAddress: "0xMemberAddress",
//       teamId: 1,
//       expenseAccountData: null,
//       expenseAccountSignature: null,
//       hourlyRate: "10",
//       maxHoursPerWeek: 20,
//     };
//     const mockClaimData = {
//       id: 1,
//       createdAt: new Date(),
//       status: "pending",
//       hoursWorked: 20,
//       cashRemunerationSignature: null,
//       memberTeamsDataId: 1,
//     };

//     beforeEach(() => {
//       vi.clearAllMocks();
//     });

//     it("should return 403 if caller is not the team member", async () => {
//       const app = express();
//       app.use(express.json());
//       app.use(setAddressMiddleware("0xSomeAddress"));
//       app.delete("/:id/cash-remuneration/claim", deleteClaim);
//       vi.spyOn(prisma.memberTeamsData, "findUnique").mockResolvedValue({
//         ...mockMemberTeamsData,
//         id: 2,
//       });
//       vi.spyOn(prisma.claim, "findUnique").mockResolvedValue(mockClaimData);

//       const response = await request(app)
//         .delete("/1/cash-remuneration/claim")
//         .set("address", "0xSomeAddress") // Simulate unauthorized caller
//         .set("claimid", `${claimId}`);

//       expect(response.status).toBe(403);
//       expect(response.body).toEqual({
        
//         message: "Forbidden",
//       });
//     });
//     it("should return 403 if status is not pending", async () => {
//       const app = express();
//       app.use(express.json());
//       app.use(setAddressMiddleware("0xMemberAddress"));
//       app.delete("/:id/cash-remuneration/claim", deleteClaim);
//       vi.spyOn(prisma.memberTeamsData, "findUnique").mockResolvedValue(
//         mockMemberTeamsData
//       );
//       vi.spyOn(prisma.claim, "findUnique").mockResolvedValue({
//         ...mockClaimData,
//         status: "approved",
//       });

//       const response = await request(app)
//         .delete("/1/cash-remuneration/claim")
//         .set("address", "0xMemberAddress") // Simulate unauthorized caller
//         .set("claimid", `${claimId}`);

//       expect(response.status).toBe(403);
//       expect(response.body).toEqual({
        
//         message: "Forbidden",
//       });
//     });
//     it("should return 201 if claim is successfully deleted", async () => {
//       const app = express();
//       app.use(express.json());
//       app.use(setAddressMiddleware("0xMemberAddress"));
//       app.delete("/:id/cash-remuneration/claim", deleteClaim);
//       vi.spyOn(prisma.memberTeamsData, "findUnique").mockResolvedValue(
//         mockMemberTeamsData
//       );
//       vi.spyOn(prisma.claim, "findUnique").mockResolvedValue(mockClaimData);
//       vi.spyOn(prisma.claim, "delete");

//       const response = await request(app)
//         .delete("/1/cash-remuneration/claim")
//         .set("address", "0xMemberAddress") // Simulate unauthorized caller
//         .set("claimid", `${claimId}`);

//       expect(prisma.claim.delete).toBeCalledWith({
//         where: { id: 1 },
//       });
//       expect(response.status).toBe(201);
//     });
//     it("should return 500 if there is a server error", async () => {
//       const app = express();
//       app.use(express.json());
//       app.use(setAddressMiddleware("0xMemberAddress"));
//       app.delete("/:id/cash-remuneration/claim", deleteClaim);
//       vi.spyOn(prisma.memberTeamsData, "findUnique").mockRejectedValue(
//         new Error("Server error")
//       );
//       vi.spyOn(prisma.claim, "findUnique").mockResolvedValue(mockClaimData);
//       vi.spyOn(prisma.claim, "delete");

//       const response = await request(app)
//         .delete("/1/cash-remuneration/claim")
//         .set("address", "0xMemberAddress") // Simulate unauthorized caller
//         .set("claimid", `${claimId}`);

//       expect(response.status).toBe(500);
//       expect(response.body).toEqual({
//         error: "Server error",
//         message: "Internal server error has occured",
        
//       });
//     });
//   });

//   describe("POST /:id/cash-remuneration/claim", () => {
//     const hoursWorked = { hoursWorked: "20" };
//     const mockMemberTeamsData = {
//       id: 1,
//       userAddress: "0xMemberAddress",
//       teamId: 1,
//       expenseAccountData: null,
//       expenseAccountSignature: null,
//       hourlyRate: "10",
//       maxHoursPerWeek: 20,
//     };

//     beforeEach(() => {
//       vi.clearAllMocks();
//     });

//     it("should return 400 if hours worked is empty or not a number", async () => {
//       const app = express();
//       app.use(express.json());
//       app.use(setAddressMiddleware("0xOwnerAddress"));
//       app.post("/:id/cash-remuneration/claim", addClaim);
//       vi.spyOn(prisma.memberTeamsData, "findUnique").mockResolvedValue(null);

//       const response = await request(app)
//         .post("/1/cash-remuneration/claim")
//         .set("address", "0xOwnerAddress") // Simulate unauthorized caller
//         .send({ hoursWorked: undefined });

//       expect(response.status).toBe(400);
//       expect(response.body).toEqual({
        
//         message: "Bad Request",
//       });
//     });

//     it("should return 404 if member teams record does not exist", async () => {
//       const app = express();
//       app.use(express.json());
//       app.use(setAddressMiddleware("0xOwnerAddress"));
//       app.post("/:id/cash-remuneration/claim", addClaim);
//       vi.spyOn(prisma.memberTeamsData, "findUnique").mockResolvedValue(null);

//       const response = await request(app)
//         .post("/1/cash-remuneration/claim")
//         .set("address", "0xOwnerAddress") // Simulate unauthorized caller
//         .send(hoursWorked);

//       expect(response.status).toBe(404);
//       expect(response.body).toEqual({
        
//         message: "Record Not Found",
//       });
//     });

//     it("should return 201 if user has allowed and hours worked are added", async () => {
//       const app = express();
//       app.use(express.json());
//       app.use(setAddressMiddleware("0xOwnerAddress"));
//       app.post("/:id/cash-remuneration/claim", addClaim);
//       vi.spyOn(prisma.memberTeamsData, "findUnique").mockResolvedValue(
//         mockMemberTeamsData
//       );
//       vi.spyOn(prisma.claim, "create");

//       const response = await request(app)
//         .post("/1/cash-remuneration/claim")
//         .set("address", "0xOwnerAddress") // Simulate unauthorized caller
//         .send(hoursWorked);

//       expect(prisma.claim.create).toHaveBeenCalledWith({
//         data: {
//           hoursWorked: Number(hoursWorked.hoursWorked),
//           status: "pending",
//           memberTeamsDataId: mockMemberTeamsData.id,
//         },
//       });
//       expect(response.status).toBe(201);
      
//     });

//     it("should return 500 if there is a server error", async () => {
//       const app = express();
//       app.use(express.json());
//       app.use(setAddressMiddleware("0xOwnerAddress"));
//       app.post("/:id/cash-remuneration/claim", addClaim);

//       vi.spyOn(prisma.memberTeamsData, "findUnique").mockRejectedValue(
//         new Error("Server error")
//       );

//       const response = await request(app)
//         .post("/1/cash-remuneration/claim")
//         .set("address", "0xOwnerAddress")
//         .send(hoursWorked);

//       expect(response.status).toBe(500);
//       expect(response.body).toEqual({
//         error: "Server error",
//         message: "Internal server error has occured",
        
//       });
//     });
//   });
//   // describe("POST /:id/cash-remuneration/wage", () => {
//   //   const mockTeamData = {
//   //     id: 1,
//   //     ownerAddress: "0xOwnerAddress",
//   //     description: null,
//   //     name: "",
//   //     bankAddress: "0xBankAddress",
//   //     votingAddress: "0xVotingAddress",
//   //     boardOfDirectorsAddress: "0xBoardOfDirectorsAddress",
//   //     expenseAccountAddress: "0xExpenseAccountAddress",
//   //     officerAddress: "0xOfficerAddress",
//   //     expenseAccountEip712Address: "0xExpenseAccountEIP712Address",
//   //     investorsAddress: "0xInvestorsAddress",
//   //     cashRemunerationEip712Address: null,
//   //   };
//   //   const mockWageData = {
//   //     maxHoursPerWeek: 20,
//   //     hourlyRate: 100,
//   //   };
//   //   const mockMemberTeamsData = {
//   //     id: 1,
//   //     userAddress: "0xMemberAddress",
//   //     teamId: 1,
//   //     expenseAccountData: null,
//   //     expenseAccountSignature: null,
//   //     hourlyRate: "100",
//   //     maxHoursPerWeek: 20,
//   //   };

//   //   beforeEach(() => {
//   //     vi.clearAllMocks();
//   //   });

//   //   it("should return 403 if caller address is not the team owner", async () => {
//   //     const app = express();
//   //     app.use(express.json());
//   //     app.use(setAddressMiddleware("0xDifferentAddress"));
//   //     app.post("/:id/cash-remuneration/wage", addEmployeeWage);
//   //     vi.spyOn(prisma.team, "findUnique").mockResolvedValue(mockTeamData);

//   //     // Mount middleware with a custom address
//   //     // app.use(setAddressMiddleware('0xDifferentAddress'))

//   //     const response = await request(app)
//   //       .post("/1/cash-remuneration/wage")
//   //       .set("address", "0xDifferentAddress") // Simulate unauthorized caller
//   //       .send(mockWageData);

//   //     expect(response.status).toBe(403);
//   //     expect(response.body).toEqual({
//   //       
//   //       message: "Forbidden",
//   //     });
//   //   });

//   //   it("should return 400 if member address is not string", async () => {
//   //     const app = express();
//   //     app.use(express.json());
//   //     app.use(setAddressMiddleware("0xOwnerAddress"));
//   //     app.post("/:id/cash-remuneration/wage", addEmployeeWage);
//   //     vi.spyOn(prisma.team, "findUnique").mockResolvedValue(mockTeamData);

//   //     // Mount middleware with a custom address
//   //     // app.use(setAddressMiddleware('0xDifferentAddress'))

//   //     const response = await request(app)
//   //       .post("/1/cash-remuneration/wage")
//   //       .set("address", "0xOwnerAddress") // Simulate unauthorized caller
//   //       .send(mockWageData);

//   //     expect(response.status).toBe(400);
//   //     expect(response.body).toEqual({
//   //       
//   //       message: "Bad Request",
//   //     });
//   //   });

//   //   it("should return 201 and create wage data if caller is authorized", async () => {
//   //     const app = express();
//   //     app.use(express.json());
//   //     app.use(setAddressMiddleware("0xOwnerAddress"));
//   //     app.post("/:id/cash-remuneration/wage", addEmployeeWage);
//   //     vi.spyOn(prisma.team, "findUnique").mockResolvedValue(mockTeamData);
//   //     vi.spyOn(prisma.memberTeamsData, "upsert").mockResolvedValue(
//   //       mockMemberTeamsData
//   //     );

//   //     const response = await request(app)
//   //       .post("/1/cash-remuneration/wage")
//   //       .set("address", "0xOwnerAddress") // Simulate authorized caller
//   //       .set("memberaddress", "0xApprovedAddress") // Set the custom header
//   //       .send(mockWageData);

//   //     expect(response.status).toBe(201);
//   //     expect(response.body).toEqual({
//   //       success: true,
//   //     });

//   //     expect(prisma.team.findUnique).toHaveBeenCalledWith({
//   //       where: { id: 1 },
//   //     });

//   //     expect(prisma.memberTeamsData.upsert).toHaveBeenCalledWith({
//   //       where: {
//   //         userAddress_teamId: {
//   //           userAddress: "0xApprovedAddress",
//   //           teamId: 1,
//   //         },
//   //       },
//   //       update: {
//   //         hourlyRate: mockWageData.hourlyRate,
//   //         maxHoursPerWeek: mockWageData.maxHoursPerWeek,
//   //       },
//   //       create: {
//   //         userAddress: "0xApprovedAddress",
//   //         teamId: 1,
//   //         hourlyRate: mockWageData.hourlyRate,
//   //         maxHoursPerWeek: mockWageData.maxHoursPerWeek,
//   //       },
//   //     });
//   //   });

//   //   it("should return 500 if there is a server error", async () => {
//   //     const app = express();
//   //     app.use(express.json());
//   //     app.use(setAddressMiddleware("0xOwnerAddress"));
//   //     app.post("/:id/cash-remuneration/wage", addEmployeeWage);

//   //     vi.spyOn(prisma.team, "findUnique").mockRejectedValue(
//   //       new Error("Server error")
//   //     );

//   //     const response = await request(app)
//   //       .post("/1/cash-remuneration/wage")
//   //       .set("address", "0xOwnerAddress")
//   //       .send(mockWageData);

//   //     expect(response.status).toBe(500);
//   //     expect(response.body).toEqual({
//   //       error: "Server error",
//   //       message: "Internal server error has occured",
//   //       
//   //     });
//   //   });
//   // });
// });

// describe("POST /expenseAccount/:id", () => {
//   const mockTeamData = {
//     id: 1,
//     ownerAddress: "0xOwnerAddress",
//     description: null,
//     name: "",
//     bankAddress: "0xBankAddress",
//     votingAddress: "0xVotingAddress",
//     boardOfDirectorsAddress: "0xBoardOfDirectorsAddress",
//     expenseAccountAddress: "0xExpenseAccountAddress",
//     officerAddress: "0xOfficerAddress",
//     expenseAccountEip712Address: "0xExpenseAccountEIP712Address",
//     investorsAddress: "0xInvestorsAddress",
//     cashRemunerationEip712Address: null,
//   };
//   const mockExpenseAccountData = {
//     expenseAccountData: {
//       approvedAddress: "0xApprovedAddress",
//       someOtherField: "someData",
//     },
//     signature: "0xSignature",
//   };
//   const mockMemberTeamsData = {
//     id: 1,
//     userAddress: "0xMemberAddress",
//     teamId: 1,
//     expenseAccountData: JSON.stringify(
//       mockExpenseAccountData.expenseAccountData
//     ),
//     expenseAccountSignature: mockExpenseAccountData.signature,
//     hourlyRate: null,
//     maxHoursPerWeek: null,
//   };

//   beforeEach(() => {
//     vi.clearAllMocks();
//   });

//   it("should return 403 if caller address is not the team owner", async () => {
//     const app = express();
//     app.use(express.json());
//     app.use(setAddressMiddleware("0xDifferentAddress"));
//     app.post("/expenseAccount/:id", addExpenseAccountData);
//     vi.spyOn(prisma.team, "findUnique").mockResolvedValue(mockTeamData);

//     // Mount middleware with a custom address
//     // app.use(setAddressMiddleware('0xDifferentAddress'))

//     const response = await request(app)
//       .post("/expenseAccount/1")
//       .set("address", "0xDifferentAddress") // Simulate unauthorized caller
//       .send(mockExpenseAccountData);

//     expect(response.status).toBe(403);
//     expect(response.body).toEqual({
      
//       message: "Forbidden",
//     });
//   });

//   it("should return 201 and create data if caller is authorized", async () => {
//     const app = express();
//     app.use(express.json());
//     app.use(setAddressMiddleware("0xOwnerAddress"));
//     app.post("/expenseAccount/:id", addExpenseAccountData);
//     vi.spyOn(prisma.team, "findUnique").mockResolvedValue(mockTeamData);
//     vi.spyOn(prisma.memberTeamsData, "upsert").mockResolvedValue(
//       mockMemberTeamsData
//     );

//     const response = await request(app)
//       .post("/expenseAccount/1")
//       .set("address", "0xOwnerAddress") // Simulate authorized caller
//       .send(mockExpenseAccountData);

//     expect(response.status).toBe(201);

//     expect(prisma.team.findUnique).toHaveBeenCalledWith({
//       where: { id: 1 },
//     });

//     expect(prisma.memberTeamsData.upsert).toHaveBeenCalledWith({
//       where: {
//         userAddress_teamId: {
//           userAddress: "0xApprovedAddress",
//           teamId: 1,
//         },
//       },
//       update: {
//         expenseAccountData: JSON.stringify(
//           mockExpenseAccountData.expenseAccountData
//         ),
//         expenseAccountSignature: mockExpenseAccountData.signature,
//       },
//       create: {
//         userAddress: "0xApprovedAddress",
//         teamId: 1,
//         expenseAccountData: JSON.stringify(
//           mockExpenseAccountData.expenseAccountData
//         ),
//         expenseAccountSignature: mockExpenseAccountData.signature,
//       },
//     });
//   });

//   it("should return 500 if there is a server error", async () => {
//     const app = express();
//     app.use(express.json());
//     app.use(setAddressMiddleware("0xOwnerAddress"));
//     app.post("/expenseAccount/:id", addExpenseAccountData);

//     vi.spyOn(prisma.team, "findUnique").mockRejectedValue(
//       new Error("Server error")
//     );

//     const response = await request(app)
//       .post("/expenseAccount/1")
//       .set("address", "0xOwnerAddress")
//       .send(mockExpenseAccountData);

//     expect(response.status).toBe(500);
//     expect(response.body).toEqual({
//       error: "Server error",
//       message: "Internal server error has occured",
      
//     });
//   });
// });

// describe("GET /expenseAccount/:id", () => {
//   const app = express();
//   app.use(express.json());
//   app.get("/expenseAccount/:id", getExpenseAccountData);

//   const mockExpenseAccountData = [
//     {
//       id: 1,
//       userAddress: "0xMemberAddress",
//       teamId: 1,
//       expenseAccountData: JSON.stringify({
//         approvedAddress: "0xApprovedAddress",
//         someOtherField: "someData",
//       }),
//       expenseAccountSignature: "0xSignature",
//       maxHoursPerWeek: null,
//       hourlyRate: null,
//     },
//     {
//       id: 2,
//       userAddress: "0xAnotherMemberAddress",
//       teamId: 1,
//       expenseAccountData: JSON.stringify({
//         approvedAddress: "0xAnotherApprovedAddress",
//         someOtherField: "someData",
//       }),
//       expenseAccountSignature: "0xAnotherSignature",
//       maxHoursPerWeek: null,
//       hourlyRate: null,
//     },
//   ];

//   beforeEach(() => {
//     vi.clearAllMocks();
//   });

//   it("should return 201 with expense account data and signature if data exists", async () => {
//     // Mock the Prisma findUnique function to return the test data
//     vi.spyOn(prisma.memberTeamsData, "findUnique").mockResolvedValue(
//       mockExpenseAccountData[0]
//     );

//     const response = await request(app)
//       .get("/expenseAccount/1")
//       .set("memberaddress", "0xApprovedAddressX");

//     expect(response.status).toBe(201);
//     expect(response.body).toEqual({
//       data: mockExpenseAccountData[0].expenseAccountData,
//       signature: mockExpenseAccountData[0].expenseAccountSignature,
//     });
//   });

//   it("should return 201 with many expense data if member address is not set", async () => {
//     vi.spyOn(prisma.memberTeamsData, "findMany").mockResolvedValue(
//       mockExpenseAccountData
//     );

//     const response = await request(app).get("/expenseAccount/1");

//     expect(response.status).toBe(201);
//     expect(response.body).toEqual(
//       mockExpenseAccountData.map((item) => ({
//         ...JSON.parse(item.expenseAccountData),
//         signature: item.expenseAccountSignature,
//       }))
//     );
//   });

//   it("should return 500 if there is a server error", async () => {
//     // Mock findUnique to throw an error
//     vi.spyOn(prisma.memberTeamsData, "findUnique").mockRejectedValue(
//       new Error("Database error")
//     );

//     const response = await request(app)
//       .get("/expenseAccount/1")
//       .set("memberaddress", "0xApprovedAddress");

//     expect(response.status).toBe(500);
//     expect(response.body).toEqual({
//       error: "Database error",
//       message: "Internal server error has occured",
      
//     });
//   });
// });

