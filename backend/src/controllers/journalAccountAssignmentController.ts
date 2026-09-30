import { Request, Response } from 'express';
import { errorResponse, prisma } from '../utils';
import {
  deleteJournalAccountAssignmentQuerySchema,
  getJournalAccountAssignmentsQuerySchema,
  upsertJournalAccountAssignmentBodySchema,
  z,
} from '../validation';

type UpsertAssignmentBody = z.infer<typeof upsertJournalAccountAssignmentBodySchema>;
type GetAssignmentsQuery = z.infer<typeof getJournalAccountAssignmentsQuerySchema>;
type DeleteAssignmentQuery = z.infer<typeof deleteJournalAccountAssignmentQuerySchema>;

const ASSIGNER_SELECT = {
  assignedBy: { select: { name: true, address: true, imageUrl: true } },
} as const;

const isRecordNotFound = (error: unknown): boolean =>
  typeof error === 'object' && error !== null && 'code' in error && error.code === 'P2025';

/** List the account assignments visible to any member of one team. */
export const getJournalAccountAssignments = async (req: Request, res: Response) => {
  const { teamId } = req.query as unknown as GetAssignmentsQuery;

  try {
    const assignments = await prisma.journalAccountAssignment.findMany({
      where: { teamId },
      orderBy: { updatedAt: 'desc' },
      include: ASSIGNER_SELECT,
    });
    return res.status(200).json(assignments);
  } catch (error) {
    return errorResponse(500, error, res);
  }
};

/** Create or replace one transaction-backed JournalEntry counter-account assignment. */
export const upsertJournalAccountAssignment = async (req: Request, res: Response) => {
  const callerAddress = req.address;
  const { teamId, journalEntryId, accountId, memo } = req.body as UpsertAssignmentBody;

  try {
    const assignment = await prisma.journalAccountAssignment.upsert({
      where: { teamId_journalEntryId: { teamId, journalEntryId } },
      create: {
        teamId,
        journalEntryId,
        accountId,
        memo: memo ?? null,
        assignedByAddress: callerAddress,
      },
      update: { accountId, memo: memo ?? null, assignedByAddress: callerAddress },
      include: ASSIGNER_SELECT,
    });
    return res.status(200).json(assignment);
  } catch (error) {
    return errorResponse(500, error, res);
  }
};

/** Remove an assignment so journal assembly restores its evidence-derived account. */
export const deleteJournalAccountAssignment = async (req: Request, res: Response) => {
  const { teamId, journalEntryId } = req.query as unknown as DeleteAssignmentQuery;

  try {
    await prisma.journalAccountAssignment.delete({
      where: { teamId_journalEntryId: { teamId, journalEntryId } },
    });
    return res.status(200).json({ success: true });
  } catch (error) {
    if (isRecordNotFound(error)) {
      return errorResponse(404, 'Journal account assignment not found', res);
    }
    return errorResponse(500, error, res);
  }
};
