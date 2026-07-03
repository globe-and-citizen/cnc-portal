import { Request, Response } from 'express';
import { Address } from 'viem';
import { errorResponse, prisma } from '../utils';
import publicClient from '../utils/viem.config';
import ABI from '../artifacts/fixed-return.json';
import {
  addFixedReturnOfferingBodySchema,
  getFixedReturnOfferingsQuerySchema,
  z,
} from '../validation';

type AddFixedReturnOfferingBody = z.infer<typeof addFixedReturnOfferingBodySchema>;
type GetFixedReturnOfferingsQuery = z.infer<typeof getFixedReturnOfferingsQuerySchema>;

export const addFixedReturnOffering = async (req: Request, res: Response) => {
  const callerAddress = req.address;
  const { teamId, offerId, title, purpose } = req.body as AddFixedReturnOfferingBody;

  try {
    const fixedReturnContract = await prisma.teamContract.findFirst({
      where: { teamId, type: 'FixedReturn' },
    });

    if (!fixedReturnContract) {
      return errorResponse(404, 'FixedReturn contract not found for this team', res);
    }

    const owner = (await publicClient.readContract({
      address: fixedReturnContract.address as Address,
      abi: ABI,
      functionName: 'owner',
    })) as unknown as string;

    if (callerAddress?.toLowerCase() !== owner.toLowerCase()) {
      return errorResponse(403, 'Caller is not the owner of the FixedReturn contract', res);
    }

    const offering = await prisma.fixedReturnOffering.create({
      data: { teamId, offerId, title, purpose },
    });
    return res.status(201).json(offering);
  } catch (error) {
    return errorResponse(500, error, res);
  }
};

export const getFixedReturnOfferings = async (req: Request, res: Response) => {
  const { teamId, offerId } = req.query as unknown as GetFixedReturnOfferingsQuery;

  try {
    // authz enforced by requireTeamMember middleware
    const offerings = await prisma.fixedReturnOffering.findMany({
      where: { teamId, ...(offerId !== undefined ? { offerId } : {}) },
      orderBy: { createdAt: 'desc' },
    });
    return res.status(200).json(offerings);
  } catch (error) {
    return errorResponse(500, error, res);
  }
};
