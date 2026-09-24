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

    // offerId is 1-indexed on-chain (FixedReturn.sol: `offerId = ++s_totalOfferings;`), so
    // the valid range is 1..totalOfferings inclusive. This blocks a stale or bogus offerId
    // from creating a metadata row that isn't linked to any real on-chain offer.
    const totalOfferings = (await publicClient.readContract({
      address: fixedReturnContract.address as Address,
      abi: ABI,
      functionName: 'getTotalOfferings',
    })) as unknown as bigint;

    if (BigInt(offerId) > totalOfferings) {
      return errorResponse(
        400,
        `offerId ${offerId} does not exist on this FixedReturn contract yet (${totalOfferings.toString()} offering(s) created so far)`,
        res
      );
    }

    // Idempotent by (teamId, offerId): if the frontend never saw the first response and
    // retries, this overwrites with whatever title/purpose the user currently has in the
    // form rather than raising a duplicate-key error. There is no cached "original" payload
    // to diff against, so "save current state" is correct, not a stricter conflict check.
    // `purpose ?? null` on both branches so a retry that cleared the field actually clears
    // it in the DB too — Prisma treats an `undefined` update value as "leave unchanged".
    const offering = await prisma.fixedReturnOffering.upsert({
      where: { teamId_offerId: { teamId, offerId } },
      create: { teamId, offerId, title, purpose: purpose ?? null },
      update: { title, purpose: purpose ?? null },
    });
    return res.status(200).json(offering);
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
