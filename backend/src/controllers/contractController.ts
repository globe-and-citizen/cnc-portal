import { Prisma } from '@prisma/client';
import { Request, Response } from 'express';
import OFFICER_ABI from '../artifacts/officer_abi.json';
import { errorResponse, prisma } from '../utils';
import publicClient from '../utils/viem.config';
import {
  addContractBodySchema,
  getContractsQuerySchema,
  syncContractsBodySchema,
  z,
} from '../validation';

type AddContractBody = z.infer<typeof addContractBodySchema>;
type SyncContractsBody = z.infer<typeof syncContractsBodySchema>;
type GetContractsQuery = z.infer<typeof getContractsQuerySchema>;

export const syncContracts = async (req: Request, res: Response) => {
  const callerAddress = req.address;
  const { teamId } = req.body as SyncContractsBody;

  try {
    // authz + existence enforced by requireTeamOwner middleware
    const team = await prisma.team.findUnique({ where: { id: teamId } });
    if (!team) return errorResponse(404, 'Team not found', res);

    console.log(
      'Syncing contracts for team:',
      teamId,
      'with officer address:',
      team.officerAddress
    );
    console.log('Chain ID: ', await publicClient.getChainId());
    const contracts = (await publicClient.readContract({
      address: team.officerAddress as `0x${string}`,
      abi: OFFICER_ABI,
      functionName: 'getTeam',
    })) as { contractType: string; contractAddress: string }[];

    // Format the contracts to be created
    const contractsToCreate: Prisma.TeamContractCreateManyInput[] = contracts.map((contract) => ({
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
      return errorResponse(400, 'No new contracts Created', res);
    }
    // TODO: manage geting the owner of the contract directly from the contract with other metadata
    return res.status(200).json(createdContract);
  } catch (error) {
    console.log('Error: ', error);
    return errorResponse(500, 'Internal server error', res);
  }
};

export const getContracts = async (req: Request, res: Response) => {
  const { teamId } = req.query as unknown as GetContractsQuery;

  try {
    // TODO restrict access to the team members
    const contracts = await prisma.teamContract.findMany({
      where: { teamId },
    });
    // If no contracts are found, return a 404 error
    if (contracts.length === 0) {
      return errorResponse(404, 'Team or contracts not found', res);
    }
    return res.status(200).json(contracts);
  } catch (error) {
    console.log('Error: ', error);
    return errorResponse(500, 'Internal server error', res);
  }
};

export const addContract = async (req: Request, res: Response) => {
  const callerAddress = req.address;
  const { teamId, contractAddress, contractType } = req.body as AddContractBody;

  try {
    // authz + existence enforced by requireTeamOwner middleware
    const contract = await prisma.teamContract.create({
      data: {
        teamId,
        address: contractAddress,
        deployer: callerAddress,
        type: contractType,
      },
    });
    return res.status(200).json(contract);
  } catch (error) {
    console.log('Error: ', error);
    return errorResponse(500, 'Internal server error', res);
  }
};

export const resetTeamContracts = async (req: Request, res: Response) => {
  const { teamId } = req.body as SyncContractsBody;

  try {
    // authz + existence enforced by requireTeamOwner middleware
    await prisma.teamContract.deleteMany({ where: { teamId } });
    await prisma.team.update({
      where: { id: teamId },
      data: { officerAddress: null },
    });
    return res.status(200).json({ message: 'Team contracts reset successfully' });
  } catch (error) {
    console.log('Error: ', error);
    return errorResponse(500, 'Internal server error', res);
  }
};
