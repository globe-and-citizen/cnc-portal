import { Prisma } from '@prisma/client';
import { Request, Response } from 'express';
import { Address } from 'viem';
import OFFICER_ABI from '../artifacts/officer_abi.json';
import { errorResponse, prisma } from '../utils';
import publicClient from '../utils/viem.config';
const ContractType = {
  Bank: 'Bank',
  InvestorV1: 'InvestorV1',
  Voting: 'Voting',
  BoardOfDirectors: 'BoardOfDirectors',
  ExpenseAccount: 'ExpenseAccount',
  ExpenseAccountEIP712: 'ExpenseAccountEIP712',
  CashRemunerationEIP712: 'CashRemunerationEIP712',
  Campaign: 'Campaign',
} as const;

type ContractType = keyof typeof ContractType;

interface ContractBodyRequest {
  teamId: number;
  contractAddress: string;
  contractType: ContractType;
}

interface SyncContractsBody {
  teamId: number;
  deployBlockNumber?: number;
  deployedAt?: Date;
}

interface CreateOfficerBody {
  teamId: number;
  address: string;
  deployBlockNumber?: number;
  deployedAt?: Date;
}

// Shared logic: upsert the TeamOfficer for the given address, read the
// contracts it governs from-chain, and persist them linked to that officer.
// Deploy metadata on an existing TeamOfficer row is immutable (the first
// caller wins) so later syncs can't overwrite the real deploy block/date.
const upsertOfficerAndSyncContracts = async (
  teamId: number,
  officerAddress: Address,
  callerAddress: Address,
  deployBlockNumber: number | undefined,
  deployedAt: Date | undefined
) => {
  const contracts = (await publicClient.readContract({
    address: officerAddress,
    abi: OFFICER_ABI,
    functionName: 'getTeam',
  })) as { contractType: string; contractAddress: string }[];

  const officer = await prisma.teamOfficer.upsert({
    where: { address: officerAddress },
    create: {
      address: officerAddress,
      teamId,
      deployer: callerAddress,
      deployBlockNumber: deployBlockNumber ?? null,
      deployedAt: deployedAt ?? null,
    },
    update: {},
  });

  const contractsToCreate: Prisma.TeamContractCreateManyInput[] = contracts.map((contract) => ({
    teamId,
    address: contract.contractAddress,
    type: contract.contractType,
    deployer: callerAddress,
    officerId: officer.id,
  }));
  const created = await prisma.teamContract.createMany({
    data: contractsToCreate,
    skipDuplicates: true,
  });

  return { officer, created };
};

export const syncContracts = async (req: Request, res: Response) => {
  const callerAddress = req.address as Address;
  const body = req.body as unknown as SyncContractsBody;

  const teamId = Number(body.teamId);
  const { deployBlockNumber, deployedAt } = body;

  try {
    const team = await prisma.team.findUnique({
      where: { id: Number(teamId) },
    });
    if (!team) return errorResponse(404, 'Team not found', res);
    if (team.ownerAddress !== callerAddress)
      return errorResponse(403, 'Unauthorized: Caller is not the owner of the team', res);
    if (!team.officerAddress)
      return errorResponse(400, 'Team has no officer address set', res);

    console.log(
      'Syncing contracts for team:',
      teamId,
      'with officer address:',
      team.officerAddress
    );
    console.log('Chain ID: ', await publicClient.getChainId());

    const { created } = await upsertOfficerAndSyncContracts(
      teamId,
      team.officerAddress as Address,
      callerAddress,
      deployBlockNumber,
      deployedAt
    );

    if (created.count === 0) {
      return errorResponse(400, 'No new contracts Created', res);
    }
    // TODO: manage geting the owner of the contract directly from the contract with other metadata
    return res.status(200).json(created);
  } catch (error) {
    console.log('Error: ', error);
    return errorResponse(500, 'Internal server error', res);
  }
};

// POST /contract/officer — registers a freshly deployed Officer contract on a
// team. Updates team.officerAddress, records the new TeamOfficer with deploy
// metadata, and syncs the contracts it governs in one call.
export const createOfficer = async (req: Request, res: Response) => {
  const callerAddress = req.address as Address;
  const body = req.body as unknown as CreateOfficerBody;

  const teamId = Number(body.teamId);
  const officerAddress = body.address as Address;
  const { deployBlockNumber, deployedAt } = body;

  try {
    const team = await prisma.team.findUnique({ where: { id: teamId } });
    if (!team) return errorResponse(404, 'Team not found', res);
    if (team.ownerAddress !== callerAddress)
      return errorResponse(403, 'Unauthorized: Caller is not the owner of the team', res);

    await prisma.team.update({
      where: { id: teamId },
      data: { officerAddress },
    });

    const { officer, created } = await upsertOfficerAndSyncContracts(
      teamId,
      officerAddress,
      callerAddress,
      deployBlockNumber,
      deployedAt
    );

    return res.status(200).json({
      officer: {
        ...officer,
        deployBlockNumber: officer.deployBlockNumber?.toString() ?? null,
      },
      contractsCreated: created.count,
    });
  } catch (error) {
    console.log('Error: ', error);
    return errorResponse(500, 'Internal server error', res);
  }
};

export const getContracts = async (req: Request, res: Response) => {
  const teamId = Number(req.query.teamId);

  try {
    // TODO restrict access to the team members
    const contracts = await prisma.teamContract.findMany({
      where: { teamId: Number(teamId) },
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
  const callerAddress = req.address as Address;
  const body = req.body as unknown as ContractBodyRequest;

  const teamId = Number(body.teamId);
  const contractAddress = body.contractAddress;
  const contractType = body.contractType;

  try {
    const team = await prisma.team.findUnique({
      where: { id: Number(teamId) },
    });
    if (!team) return errorResponse(404, 'Team not found', res);
    if (team.ownerAddress !== callerAddress)
      return errorResponse(403, 'Unauthorized: Caller is not the owner of the team', res);

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
    console.log('Error: ', error);
    return errorResponse(500, 'Internal server error', res);
  }
};

export const getTeamOfficers = async (req: Request, res: Response) => {
  const teamId = Number(req.query.teamId);

  try {
    const team = await prisma.team.findUnique({ where: { id: teamId } });
    if (!team) return errorResponse(404, 'Team not found', res);

    const officers = await prisma.teamOfficer.findMany({
      where: { teamId },
      include: { contracts: true },
      orderBy: [{ deployBlockNumber: { sort: 'desc', nulls: 'last' } }, { createdAt: 'desc' }],
    });

    return res.status(200).json(
      officers.map((o) => ({
        ...o,
        deployBlockNumber: o.deployBlockNumber?.toString() ?? null,
        isCurrent: o.address === team.officerAddress,
      }))
    );
  } catch (error) {
    console.log('Error: ', error);
    return errorResponse(500, 'Internal server error', res);
  }
};

export const resetTeamContracts = async (req: Request, res: Response) => {
  const teamId = Number(req.body.teamId);

  try {
    const team = await prisma.team.findUnique({
      where: { id: Number(teamId) },
    });
    if (!team) return errorResponse(404, 'Team not found', res);

    // Only the team owner can reset contracts
    const callerAddress = req.address as Address;
    if (team.ownerAddress !== callerAddress)
      return errorResponse(403, 'Unauthorized: Caller is not the owner of the team', res);

    await prisma.teamContract.deleteMany({
      where: { teamId: Number(teamId) },
    });
    // Set team officerAddress to null
    await prisma.team.update({
      where: { id: Number(teamId) },
      data: { officerAddress: null },
    });
    return res.status(200).json({ message: 'Team contracts reset successfully' });
  } catch (error) {
    console.log('Error: ', error);
    return errorResponse(500, 'Internal server error', res);
  }
};
