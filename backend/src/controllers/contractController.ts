import { Request, Response } from "express";
import { Prisma } from "@prisma/client";
import { Address, getContract, isAddress } from "viem";
import { errorResponse, prisma } from "../utils";
import publicClient from "../utils/viem.config";
import OFFICER_ABI from "../artifacts/officer_abi.json";
const ContractType = {
  Bank: "Bank",
  InvestorsV1: "InvestorsV1",
  Voting: "Voting",
  BoardOfDirectors: "BoardOfDirectors",
  ExpenseAccount: "ExpenseAccount",
  ExpenseAccountEIP712: "ExpenseAccountEIP712",
  CashRemunerationEIP712: "CashRemunerationEIP712",
  Campaign: "Campaign",
  DividendSplitter: "DividendSplitter",
} as const;

type ContractType = keyof typeof ContractType;

interface ContractBodyRequest {
  teamId: number;
  contractAddress: string;
  contractType: string;
}

export const syncContracts = async (req: Request, res: Response) => {
  const callerAddress = (req as any).address as Address;
  const body = req.body as unknown as Pick<ContractBodyRequest, "teamId">;

  const teamId = Number(body.teamId);
  if (isNaN(teamId))
    return errorResponse(400, "Missing or invalid field: teamId", res);

  try {
    const team = await prisma.team.findUnique({
      where: { id: Number(teamId) },
    });
    if (!team) return errorResponse(404, "Team not found", res);
    if (team.ownerAddress !== callerAddress)
      return errorResponse(
        403,
        "Unauthorized: Caller is not the owner of the team",
        res
      );

    const contracts = (await publicClient.readContract({
      address: team.officerAddress as `0x${string}`,
      abi: OFFICER_ABI,
      functionName: "getTeam",
    })) as { contractType: string; contractAddress: string }[];

    // Format the contracts to be created
    const contractsToCreate: Prisma.TeamContractCreateManyInput[] =
      contracts.map((contract) => ({
        teamId: teamId,
        address: contract.contractAddress,
        type: contract.contractType,
        deployer: callerAddress,
      }));
    const createdContract = await prisma.teamContract.createMany({
      data: contractsToCreate,
      skipDuplicates: true,
    });

    if (createdContract.count === 0) {
      return errorResponse(400, "No new contracts Created", res);
    }
    // TODO: manage geting the owner of the contract directly from the contract with other metadata
    return res.status(200).json(createdContract);
  } catch (error) {
    console.log("Error: ", error);
    return errorResponse(500, "Internal server error", res);
  }
};

export const getContracts = async (req: Request, res: Response) => {
  const teamId = Number(req.query.teamId);

  if (isNaN(teamId))
    return errorResponse(400, "Invalid or missing teamId", res);

  try {
    // TODO restrict access to the team members
    const contracts = await prisma.teamContract.findMany({
      where: { teamId: Number(teamId) },
    });
    // If no contracts are found, return a 404 error
    if (contracts.length === 0) {
      return errorResponse(404, "Team or contracts not found", res);
    }
    return res.status(200).json(contracts);
  } catch (error) {
    console.log("Error: ", error);
    return errorResponse(500, "Internal server error", res);
  }
};

export const addContract = async (req: Request, res: Response) => {
  const callerAddress = (req as any).address as Address;
  const body = req.body as unknown as ContractBodyRequest;

  const teamId = Number(body.teamId);
  const contractAddress = body.contractAddress;
  const contractType = body.contractType;

  // validating the contract data
  if (!contractAddress || !contractType) {
    return errorResponse(400, "Contract address and type are required", res);
  }

  if (!isAddress(contractAddress)) {
    return errorResponse(400, "Invalid contract address", res);
  }

  if (!Object.values(ContractType).includes(contractType as ContractType)) {
    return errorResponse(400, "Invalid contract type", res);
  }

  try {
    const team = await prisma.team.findUnique({
      where: { id: Number(teamId) },
    });
    if (!team) return errorResponse(404, "Team not found", res);
    if (team.ownerAddress !== callerAddress)
      return errorResponse(
        403,
        "Unauthorized: Caller is not the owner of the team",
        res
      );

    const contract = await prisma.teamContract.create({
      data: {
        teamId: teamId,
        address: contractAddress,
        deployer: callerAddress,
        type: contractType,
      },
    });
    return res.status(200).json(contract);
  } catch (error) {
    console.log("Error: ", error);
    return errorResponse(500, "Internal server error", res);
  }
};
