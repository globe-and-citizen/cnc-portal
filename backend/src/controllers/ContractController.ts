import { Request, Response } from "express";
import { Prisma } from "@prisma/client";
import { Address } from "viem";
import { isOwnerOfTeam } from "./wageController";
import { errorResponse, prisma } from "../utils";
import publicClient from "../utils/viem.config";
import OFFICER_ABI from "../artifacts/officer_abi.json";
interface ContractBodyRequest {
  teamId: number;
  contractAddress: string;
}

export const syncContracts = async (req: Request, res: Response) => {
  const callerAddress = (req as any).address as Address;
  const body = req.body as unknown as ContractBodyRequest;

  const teamId = Number(body.teamId);
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

    prisma.teamContract.createMany({
      data: contracts.map((contract) => ({
        teamId: teamId,
        address: contract.contractAddress,
        type: contract.contractType,
        deployer: callerAddress,
      })),
      skipDuplicates: true,
    });

    // TODO: manage geting the owner of the contract directly from the contract with other metadata
    return res.status(200).json(contracts);
  } catch (error) {
    console.log("Error: ", error);
    return errorResponse(500, "Internal server error", res);
  }
};
