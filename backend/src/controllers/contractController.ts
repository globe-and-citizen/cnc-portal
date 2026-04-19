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

// Look up the head of a team's Officer linked list — the row with no
// successor pointing back to it. Returns null if the team has never had an
// Officer deployed.
const findCurrentOfficer = (teamId: number) =>
  prisma.teamOfficer.findFirst({
    where: { teamId, nextOfficer: { is: null } },
    orderBy: [{ deployBlockNumber: { sort: 'desc', nulls: 'last' } }, { createdAt: 'desc' }],
  });

// Shared logic: upsert the TeamOfficer for the given address, read the
// contracts it governs from-chain, and persist them linked to that officer.
// Deploy metadata on an existing TeamOfficer row is immutable (the first
// caller wins) so later syncs can't overwrite the real deploy block/date.
const upsertOfficerAndSyncContracts = async (
  teamId: number,
  officerAddress: Address,
  callerAddress: Address,
  deployBlockNumber: number | undefined,
  deployedAt: Date | undefined,
  previousOfficerId: number | null
) => {
  const contracts = (await publicClient.readContract({
    address: officerAddress,
    abi: OFFICER_ABI,
    functionName: 'getTeam',
  })) as { contractType: string; contractAddress: string }[];

  // Caller is responsible for ensuring the officerAddress is not already
  // registered to a different team (createOfficer performs that guard and
  // returns 409 explicitly; syncContracts passes the team's own current Officer
  // address, so a mismatch is impossible there).
  const officer = await prisma.teamOfficer.upsert({
    where: { address: officerAddress },
    create: {
      address: officerAddress,
      teamId,
      deployer: callerAddress,
      deployBlockNumber: deployBlockNumber ?? null,
      deployedAt: deployedAt ?? null,
      previousOfficerId,
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

  // Backfill officerId on pre-existing TeamContract rows (same team + address)
  // so rows created before officerId was tracked become visible via
  // TeamOfficer.contracts. createMany({ skipDuplicates }) alone would leave
  // them with officerId = NULL.
  const updatedCounts = await Promise.all(
    contractsToCreate.map((contract) =>
      prisma.teamContract.updateMany({
        where: {
          teamId: contract.teamId,
          address: contract.address,
          officerId: null,
        },
        data: { officerId: officer.id },
      })
    )
  );

  const createdResult = await prisma.teamContract.createMany({
    data: contractsToCreate,
    skipDuplicates: true,
  });

  const updatedCount = updatedCounts.reduce((total, r) => total + r.count, 0);

  return { officer, created: { count: createdResult.count + updatedCount } };
};

export const syncContracts = async (req: Request, res: Response) => {
  const callerAddress = req.address;
  const { teamId, deployBlockNumber, deployedAt } = req.body as SyncContractsBody;

  try {
    // authz + existence enforced by requireTeamOwner middleware
    const team = await prisma.team.findUnique({ where: { id: teamId } });
    if (!team) return errorResponse(404, 'Team not found', res);

    const currentOfficer = await findCurrentOfficer(teamId);
    if (!currentOfficer) return errorResponse(400, 'Team has no Officer deployed', res);

    console.log(
      'Syncing contracts for team:',
      teamId,
      'with officer address:',
      currentOfficer.address
    );
    console.log('Chain ID: ', await publicClient.getChainId());

    const { created } = await upsertOfficerAndSyncContracts(
      teamId,
      currentOfficer.address as Address,
      callerAddress,
      deployBlockNumber,
      deployedAt,
      currentOfficer.previousOfficerId
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
// team. Inserts a new TeamOfficer row, linking it to the previous head of the
// chain (so the linked list represents the deployment history), and syncs the
// contracts it governs in one call.
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

    // TeamOfficer.address is globally unique. If the address is already
    // registered to a different team, the upsert below would silently return
    // the other team's row (update: {}), leaking its metadata and allowing
    // address squatting. Reject explicitly.
    const existingByAddress = await prisma.teamOfficer.findUnique({
      where: { address: officerAddress },
    });
    if (existingByAddress && existingByAddress.teamId !== teamId) {
      return errorResponse(409, 'Officer address already registered to another team', res);
    }

    const previousHead = await findCurrentOfficer(teamId);

    let officer;
    let created;
    try {
      ({ officer, created } = await upsertOfficerAndSyncContracts(
        teamId,
        officerAddress,
        callerAddress,
        deployBlockNumber,
        deployedAt,
        previousHead?.id ?? null
      ));
    } catch (err) {
      // Concurrent createOfficer calls race on findCurrentOfficer + insert.
      // The partial unique index TeamOfficer_one_head_per_team (first Officer
      // case) and previousOfficerId unique (Nth Officer case) turn the race
      // into a P2002 unique-constraint violation. Surface it as 409 Conflict
      // so the client can retry cleanly rather than burning more gas on an
      // opaque 500.
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
        return errorResponse(
          409,
          'Officer registration conflict: another deploy for this team completed first. Refresh and retry.',
          res
        );
      }
      throw err;
    }

    // Expose previousOfficer so the frontend can drive a shareholder migration
    // (or any other copy-forward logic) without a second round-trip.
    return res.status(200).json({
      officer: {
        ...officer,
        deployBlockNumber: officer.deployBlockNumber?.toString() ?? null,
      },
      previousOfficer: previousHead
        ? {
            ...previousHead,
            deployBlockNumber: previousHead.deployBlockNumber?.toString() ?? null,
          }
        : null,
      contractsCreated: created.count,
    });
  } catch (error) {
    console.log('Error: ', error);
    return errorResponse(500, 'Internal server error', res);
  }
};

export const getContracts = async (req: Request, res: Response) => {
  const { teamId } = req.query as unknown as GetContractsQuery;

  try {
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

export const getTeamOfficers = async (req: Request, res: Response) => {
  const teamId = Number(req.query.teamId);

  try {
    const team = await prisma.team.findUnique({ where: { id: teamId } });
    if (!team) return errorResponse(404, 'Team not found', res);

    // Include `nextOfficer` so we can flag the head of the chain (the row
    // with no successor) without an extra round-trip.
    const officers = await prisma.teamOfficer.findMany({
      where: { teamId },
      include: { contracts: true, nextOfficer: { select: { id: true } } },
      orderBy: [{ deployBlockNumber: { sort: 'desc', nulls: 'last' } }, { createdAt: 'desc' }],
    });

    return res.status(200).json(
      officers.map(({ nextOfficer, ...o }) => ({
        ...o,
        deployBlockNumber: o.deployBlockNumber?.toString() ?? null,
        isCurrent: nextOfficer === null,
      }))
    );
  } catch (error) {
    console.log('Error: ', error);
    return errorResponse(500, 'Internal server error', res);
  }
};
