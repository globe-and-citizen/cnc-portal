import { Request, Response } from 'express';
import { errorResponse, prisma } from '../utils';
import {
  deleteClassificationQuerySchema,
  getClassificationsQuerySchema,
  upsertClassificationBodySchema,
  z,
} from '../validation';

type UpsertClassificationBody = z.infer<typeof upsertClassificationBodySchema>;
type GetClassificationsQuery = z.infer<typeof getClassificationsQuerySchema>;
type DeleteClassificationQuery = z.infer<typeof deleteClassificationQuerySchema>;

/** Who set a classification, joined for the "classified by" attribution in the UI. */
const CLASSIFIER_SELECT = {
  classifiedBy: { select: { name: true, address: true, imageUrl: true } },
} as const;

/** Prisma raises P2025 ("record to delete does not exist") — the unknown-tx case. */
const isRecordNotFound = (error: unknown): boolean =>
  typeof error === 'object' && error !== null && 'code' in error && error.code === 'P2025';

/**
 * GET /accounting/classification?teamId=
 * List every manual classification for a team. Read access is any team member;
 * enforced by the requireTeamMember guard on the route.
 */
export const getClassifications = async (req: Request, res: Response) => {
  const { teamId } = req.query as unknown as GetClassificationsQuery;

  try {
    const classifications = await prisma.transactionClassification.findMany({
      where: { teamId },
      orderBy: { updatedAt: 'desc' },
      include: CLASSIFIER_SELECT,
    });
    return res.status(200).json(classifications);
  } catch (error) {
    return errorResponse(500, error, res);
  }
};

/**
 * PUT /accounting/classification
 * Create or update the classification for one transaction. The upsert keys on the
 * (teamId, txId) unique, so a repeat call for the same transaction updates in place
 * — no duplicate rows — and concurrent edits resolve last-write-wins. Write access
 * is the team owner only; enforced by the requireTeamOwner guard on the route.
 */
export const upsertClassification = async (req: Request, res: Response) => {
  const callerAddress = req.address;
  const { teamId, txId, category, memo } = req.body as UpsertClassificationBody;

  try {
    const classification = await prisma.transactionClassification.upsert({
      where: { teamId_txId: { teamId, txId } },
      create: { teamId, txId, category, memo: memo ?? null, classifiedByAddress: callerAddress },
      update: { category, memo: memo ?? null, classifiedByAddress: callerAddress },
      include: CLASSIFIER_SELECT,
    });
    return res.status(200).json(classification);
  } catch (error) {
    return errorResponse(500, error, res);
  }
};

/**
 * DELETE /accounting/classification?teamId=&txId=
 * Remove a classification so the transaction falls back to address inference.
 * A missing (teamId, txId) is a 404. Write access is the team owner only.
 */
export const deleteClassification = async (req: Request, res: Response) => {
  const { teamId, txId } = req.query as unknown as DeleteClassificationQuery;

  try {
    await prisma.transactionClassification.delete({
      where: { teamId_txId: { teamId, txId } },
    });
    return res.status(200).json({ success: true });
  } catch (error) {
    if (isRecordNotFound(error)) {
      return errorResponse(404, 'Classification not found', res);
    }
    return errorResponse(500, error, res);
  }
};
