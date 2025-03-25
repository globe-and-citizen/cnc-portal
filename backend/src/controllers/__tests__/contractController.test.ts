import { beforeEach } from "node:test";
import { describe, it, vi } from "vitest";
import publicClient from "../../utils/viem.config";
import OFFICER_ABI from "../../artifacts/officer_abi.json";

describe.skip("addContracts", () => {
  const mockTeam = {
    id: 1,
    ownerAddress: "0xOwnerAddress",
    officerAddress: "0xOfficerAddress",
    name: "Test Team",
    description: "Test Description",
    bankAddress: null,
    votingAddress: null,
    boardOfDirectorsAddress: null,
    expenseAccountAddress: null,
    expenseAccountEip712Address: null,
    cashRemunerationEip712Address: null,
    investorsAddress: null,
  };

  const mockContracts = [
    { contractType: "Bank", contractAddress: "0xBankAddress" },
    { contractType: "InvestorsV1", contractAddress: "0xInvestorsAddress" },
    { contractType: "Voting", contractAddress: "0xVotingAddress" },
    {
      contractType: "BoardOfDirectors",
      contractAddress: "0xBoardOfDirectorsAddress",
    },
    {
      contractType: "ExpenseAccount",
      contractAddress: "0xExpenseAccountAddress",
    },
    {
      contractType: "ExpenseAccountEIP712",
      contractAddress: "0xExpenseAccountEIP712Address",
    },
    {
      contractType: "CashRemunerationEIP712",
      contractAddress: "0xCashRemunerationEIP712Address",
    },
  ];

  const mockUpdatedTeam = {
    ...mockTeam,
    bankAddress: "0xBankAddress",
    investorsAddress: "0xInvestorsAddress",
    votingAddress: "0xVotingAddress",
    boardOfDirectorsAddress: "0xBoardOfDirectorsAddress",
    expenseAccountAddress: "0xExpenseAccountAddress",
    expenseAccountEip712Address: "0xExpenseAccountEIP712Address",
    cashRemunerationEip712Address: "0xCashRemunerationEIP712Address",
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  // it("should return 404 if team not found", async () => {
  //   const app = express();
  //   app.use(express.json());
  //   app.use(setAddressMiddleware("0xOwnerAddress"));
  //   app.post("/teams/:id/contracts", addContracts);

  //   vi.spyOn(prisma.team, "findUnique").mockResolvedValue(null);

  //   const response = await request(app)
  //     .post("/teams/1/contracts")
  //     .set("address", "0xOwnerAddress");

  //   expect(response.status).toBe(404);
  //   expect(response.body).toEqual({
      
  //     message: "Team not found",
  //   });
  // });

  // it("should return 403 if caller is not team owner", async () => {
  //   const app = express();
  //   app.use(express.json());
  //   app.use(setAddressMiddleware("0xNotOwnerAddress"));
  //   app.post("/teams/:id/contracts", addContracts);

  //   vi.spyOn(prisma.team, "findUnique").mockResolvedValue(mockTeam);

  //   const response = await request(app)
  //     .post("/teams/1/contracts")
  //     .set("address", "0xNotOwnerAddress");

  //   expect(response.status).toBe(403);
  //   expect(response.body).toEqual({
      
  //     message: "Unauthorized",
  //   });
  // });

  // it("should successfully update team with contract addresses", async () => {
  //   const app = express();
  //   app.use(express.json());
  //   app.use(setAddressMiddleware("0xOwnerAddress"));
  //   app.post("/teams/:id/contracts", addContracts);

  //   vi.spyOn(prisma.team, "findUnique").mockResolvedValue(mockTeam);
  //   vi.spyOn(publicClient, "readContract").mockResolvedValue(mockContracts);
  //   vi.spyOn(prisma.team, "update").mockResolvedValue(mockUpdatedTeam);

  //   const response = await request(app)
  //     .post("/teams/1/contracts")
  //     .set("address", "0xOwnerAddress");

  //   expect(response.status).toBe(200);
  //   expect(response.body).toEqual(mockUpdatedTeam);

  //   expect(publicClient.readContract).toHaveBeenCalledWith({
  //     address: mockTeam.officerAddress as `0x${string}`,
  //     abi: OFFICER_ABI,
  //     functionName: "getTeam",
  //   });

  //   expect(prisma.team.update).toHaveBeenCalledWith({
  //     where: { id: 1 },
  //     data: {
  //       bankAddress: "0xBankAddress",
  //       investorsAddress: "0xInvestorsAddress",
  //       votingAddress: "0xVotingAddress",
  //       boardOfDirectorsAddress: "0xBoardOfDirectorsAddress",
  //       expenseAccountAddress: "0xExpenseAccountAddress",
  //       expenseAccountEip712Address: "0xExpenseAccountEIP712Address",
  //       cashRemunerationEip712Address: "0xCashRemunerationEIP712Address",
  //     },
  //   });
  // });

  // it("should return 500 if there is a server error", async () => {
  //   const app = express();
  //   app.use(express.json());
  //   app.use(setAddressMiddleware("0xOwnerAddress"));
  //   app.post("/teams/:id/contracts", addContracts);

  //   vi.spyOn(prisma.team, "findUnique").mockRejectedValue(
  //     new Error("Server error")
  //   );

  //   const response = await request(app)
  //     .post("/teams/1/contracts")
  //     .set("address", "0xOwnerAddress");

  //   expect(response.status).toBe(500);
  //   expect(response.body).toEqual({
      
  //     message: "Internal server error has occured",
  //     error: "Server error",
  //   });
  // });
});
