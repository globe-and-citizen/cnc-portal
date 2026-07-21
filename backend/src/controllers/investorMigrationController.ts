import { Request, Response } from 'express';
import { Address } from 'viem';
import { errorResponse, prisma } from '../utils';
import publicClient from '../utils/viem.config';
import {
  createInvestorMigrationBodySchema,
  getInvestorMigrationQuerySchema,
  z,
} from '../validation';
import { generateMerkleSnapshot } from '../services/merkleSnapshotService';

type CreateInvestorMigrationBody = z.infer<typeof createInvestorMigrationBodySchema>;
type GetInvestorMigrationQuery = z.infer<typeof getInvestorMigrationQuerySchema>;

// Investor/InvestorV1 both expose a standard OZ `owner()` getter — a minimal
// fragment avoids depending on the full ABI just for this one read.
const OWNABLE_OWNER_ABI = [
  {
    type: 'function',
    name: 'owner',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ type: 'address' }],
  },
] as const;

export const createInvestorMigration = async (req: Request, res: Response) => {
  const callerAddress = req.address;
  const {
    teamId,
    previousInvestorAddress,
    newInvestorAddress,
    merkleRoot,
    blockNumber,
    shareholders,
  } = req.body as CreateInvestorMigrationBody;

  try {
    // Team membership enforced by requireTeamMember middleware; ownership of
    // this specific contract is checked on-chain below (mirrors
    // fixedReturnOfferingController's pattern) rather than trusted from the
    // request body, since this list becomes the source of truth for claims.
    const owner = (await publicClient.readContract({
      address: newInvestorAddress as Address,
      abi: OWNABLE_OWNER_ABI,
      functionName: 'owner',
    })) as string;

    if (callerAddress?.toLowerCase() !== owner.toLowerCase()) {
      return errorResponse(403, 'Caller is not the owner of the new Investor contract', res);
    }

    const migration = await prisma.investorMigration.create({
      data: {
        teamId,
        previousInvestorAddress,
        newInvestorAddress,
        merkleRoot,
        blockNumber,
        shareholders,
      },
    });

    return res.status(201).json({
      ...migration,
      blockNumber: migration.blockNumber.toString(),
    });
  } catch (error) {
    return errorResponse(500, error, res);
  }
};

export const getInvestorMigration = async (req: Request, res: Response) => {
  const { teamId } = req.query as unknown as GetInvestorMigrationQuery;

  try {
    // authz enforced by requireTeamMember middleware
    const migrations = await prisma.investorMigration.findMany({
      where: { teamId },
      orderBy: { createdAt: 'desc' },
    });

    return res.status(200).json(
      migrations.map((m) => ({
        ...m,
        blockNumber: m.blockNumber.toString(),
      }))
    );
  } catch (error) {
    return errorResponse(500, error, res);
  }
};

export const generateInvestorMerkleSnapshot = async (req: Request, res: Response) => {
  const { investorV1Address } = req.body;

  try {
    if (!investorV1Address) {
      return errorResponse(400, 'investorV1Address is required', res);
    }

    const snapshot = await generateMerkleSnapshot(investorV1Address as Address);

    return res.status(200).json(snapshot);
  } catch (error) {
    return errorResponse(500, error, res);
  }
};
