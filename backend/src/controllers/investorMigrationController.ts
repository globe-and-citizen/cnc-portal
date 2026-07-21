import { Request, Response } from 'express';
import { Address } from 'viem';
import { errorResponse, prisma } from '../utils';
import publicClient from '../utils/viem.config';
import {
  createInvestorMigrationBodySchema,
  getInvestorMigrationQuerySchema,
  z,
} from '../validation';

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
    const migration = await prisma.investorMigration.findFirst({
      where: { teamId },
      orderBy: { createdAt: 'desc' },
    });

    if (!migration) {
      return errorResponse(404, 'No migration found for this team', res);
    }

    return res.status(200).json({
      ...migration,
      blockNumber: migration.blockNumber.toString(),
    });
  } catch (error) {
    return errorResponse(500, error, res);
  }
};
