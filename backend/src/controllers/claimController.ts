import dayjs from 'dayjs';
import isoWeek from 'dayjs/plugin/isoWeek';
import utc from 'dayjs/plugin/utc';
import { Request, Response } from 'express';
import { prisma } from '../utils';
import { errorResponse } from '../utils/utils';

import { Prisma } from '@prisma/client';
import {
  refreshAttachmentUrls,
  deleteAttachments,
  type FileAttachmentData,
} from '../services/attachmentService';
import {
  addClaimBodySchema,
  claimIdParamsSchema,
  getClaimsQuerySchema,
  updateClaimBodySchema,
  z,
} from '../validation';

dayjs.extend(utc);
dayjs.extend(isoWeek);

type AddClaimBody = z.infer<typeof addClaimBodySchema>;
type UpdateClaimBody = z.infer<typeof updateClaimBodySchema>;
type GetClaimsQuery = z.infer<typeof getClaimsQuerySchema>;
type ClaimIdParams = z.infer<typeof claimIdParamsSchema>;

const buildWeeklyHoursExceededMessage = ({
  action,
  regularHours,
  overtimeHours,
  submittedHours,
}: {
  action: 'submit' | 'update';
  regularHours: number;
  overtimeHours: number;
  submittedHours: number;
}) => {
  const totalAllowedHours = regularHours + overtimeHours;
  const remainingHours = Math.max(0, totalAllowedHours - submittedHours);

  return {
    message:
      `Unable to ${action} this claim: your weekly hours limit would be exceeded. ` +
      `Weekly allowance: ${regularHours}h regular + ${overtimeHours}h overtime = ${totalAllowedHours}h. ` +
      `Already submitted: ${submittedHours}h. Remaining to submit: ${remainingHours}h.`,
  };
};

// TODO limit weeday only for the current week. Betwen Monday and the current day
export const addClaim = async (req: Request, res: Response) => {
  const callerAddress = req.address;

  const {
    teamId,
    hoursWorked,
    memo,
    dayWorked: dayWorkedInput,
    attachments: rawAttachments,
  } = req.body as AddClaimBody;
  const dayWorked = dayWorkedInput
    ? dayjs.utc(dayWorkedInput).startOf('day').toDate()
    : dayjs.utc().startOf('day').toDate();
  const attachments: FileAttachmentData[] = rawAttachments ?? [];

  const weekStart = dayjs.utc(dayWorked).startOf('isoWeek').toDate(); // Monday 00:00 UTC

  try {
    // Get user current
    const wage = await prisma.wage.findFirst({
      where: { userAddress: callerAddress, nextWageId: null, teamId: teamId },
    });

    if (!wage) {
      return errorResponse(400, 'No wage found for the user', res);
    }

    if (wage.disabled) {
      return errorResponse(400, 'Cannot add claim: the wage is disabled', res);
    }

    // get the member current wage

    let weeklyClaim = await prisma.weeklyClaim.findFirst({
      where: {
        wage: {
          teamId: teamId,
          nextWageId: null,
        },
        weekStart: weekStart,
        memberAddress: callerAddress,
        teamId: teamId,
      },
      include: { claims: true },
    });

    if (weeklyClaim) {
      if (weeklyClaim.status === 'disabled') {
        return errorResponse(409, 'Week is disabled. Submission not allowed.', res);
      }
      if (weeklyClaim.status === 'withdrawn') {
        return errorResponse(409, 'Week already withdrawn. Submission not allowed.', res);
      }
      // If status is signed or a signature exists, treat it as signed
      if (weeklyClaim.status === 'signed' || !!weeklyClaim.signature) {
        return errorResponse(409, 'Week already signed. Submission not allowed.', res);
      }
    }

    // Check total max hours (regular + overtime).

    const totalHours = weeklyClaim?.claims.reduce((sum, claim) => sum + claim.hoursWorked, 0) ?? 0;
    const regularHours = wage.maximumHoursPerWeek;
    const overtimeHours = wage.maximumOvertimeHoursPerWeek ?? 0;
    const totalMaxHours = regularHours + overtimeHours;

    if (totalHours + hoursWorked > totalMaxHours) {
      const { message } = buildWeeklyHoursExceededMessage({
        action: 'submit',
        regularHours,
        overtimeHours,
        submittedHours: totalHours,
      });
      return errorResponse(409, message, res);
    }

    if (!weeklyClaim) {
      weeklyClaim = await prisma.weeklyClaim.create({
        data: {
          wageId: wage.id,
          weekStart: weekStart,
          memberAddress: callerAddress,
          teamId: teamId,
          data: {},
          status: 'pending',
        },
        include: {
          claims: true,
        },
      });
    }

    if (
      (weeklyClaim?.claims
        .filter((claim) => claim.dayWorked && claim.dayWorked.getTime() === dayWorked.getTime())
        .reduce((sum, claim) => sum + Number(claim.hoursWorked), 0) ?? 0) +
        Number(hoursWorked) >
      24
    ) {
      return errorResponse(
        400,
        'Submission failed: the total number of hours for this day would exceed 24 hours.',
        res
      );
    }

    // Validate pre-uploaded attachments count
    if (attachments.length > 10) {
      return errorResponse(
        400,
        `Maximum 10 files allowed. You have ${attachments.length} files.`,
        res
      );
    }

    // Use pre-uploaded attachments from body
    const fileAttachmentsData = attachments.length > 0 ? attachments : undefined;

    // Create the claim with file attachments
    const claim = await prisma.claim.create({
      data: {
        hoursWorked,
        memo,
        wageId: wage.id,
        weeklyClaimId: weeklyClaim.id,
        dayWorked: dayWorked,
        fileAttachments: fileAttachmentsData,
      },
    });

    return res.status(201).json(claim);
  } catch (error) {
    return errorResponse(500, error, res);
  }
};

export const getClaims = async (req: Request, res: Response) => {
  const { teamId, memberAddress } = req.query as unknown as GetClaimsQuery;

  try {
    // authz enforced by requireTeamMember middleware

    // add filter for memberAddress if provided
    let memberFilter: Prisma.ClaimWhereInput = {};
    if (memberAddress) {
      memberFilter = {
        wage: {
          userAddress: memberAddress,
        },
      };
    }

    // Request all claims based on status, that have a wage where the teamId is the provided teamId
    const claims = await prisma.claim.findMany({
      where: {
        wage: {
          teamId: teamId,
        },
        ...memberFilter,
      },
      include: {
        wage: {
          include: {
            user: {
              select: {
                address: true,
                name: true,
                imageUrl: true,
              },
            },
          },
        },
      },
    });

    const claimsWithFreshAttachmentUrls = await Promise.all(
      claims.map(async (claim) => ({
        ...claim,
        fileAttachments: await refreshAttachmentUrls(
          claim.fileAttachments as FileAttachmentData[] | null | undefined
        ),
      }))
    );

    return res.status(200).json(claimsWithFreshAttachmentUrls);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Internal Server Error';
    return errorResponse(500, message, res);
  }
};

export const updateClaim = async (req: Request, res: Response) => {
  const callerAddress = req.address;
  const { claimId } = req.params as unknown as ClaimIdParams;
  const { hoursWorked, memo, deletedFileIndexes, attachments } = req.body as UpdateClaimBody;

  try {
    // Fetch the claim including the required data (include weeklyClaim.claims)
    const claim = await prisma.claim.findFirst({
      where: { id: claimId },
      include: {
        wage: true,
        weeklyClaim: {
          include: {
            claims: true,
          },
        },
      },
    });

    if (!claim) {
      return errorResponse(404, 'Claim not found', res);
    }

    const { weeklyClaim, wage } = claim;

    // Only claim owner can edit
    if (wage.userAddress !== callerAddress) {
      return errorResponse(403, 'Caller is not the owner of the claim', res);
    }

    if (wage.disabled) {
      return errorResponse(403, 'Cannot update claim: the wage is disabled', res);
    }

    // Can only edit pending claims
    if (claim.weeklyClaim?.status !== 'pending' && claim.weeklyClaim?.status !== 'disabled') {
      return errorResponse(403, "Can't edit: Claim is not pending", res);
    }

    if (hoursWorked !== undefined) {
      // Sum other claims in the same weeklyClaim excluding the current claim
      const otherClaimsTotal =
        (weeklyClaim?.claims ?? [])
          .filter((c) => c.id !== claim.id)
          .reduce((sum, c) => sum + Number(c.hoursWorked), 0) ?? 0;

      const newHours = Number(hoursWorked);

      const regularHours = wage.maximumHoursPerWeek;
      const overtimeHours = wage.maximumOvertimeHoursPerWeek ?? 0;
      const totalMaxHours = regularHours + overtimeHours;

      if (otherClaimsTotal + newHours > totalMaxHours) {
        const { message } = buildWeeklyHoursExceededMessage({
          action: 'update',
          regularHours,
          overtimeHours,
          submittedHours: otherClaimsTotal,
        });
        return errorResponse(409, message, res);
      }
    }

    // Build file attachments from uploaded files and merge with existing ones
    const existingAttachments = (claim.fileAttachments as FileAttachmentData[]) || [];
    let fileAttachmentsData: FileAttachmentData[] | undefined = existingAttachments;

    // Handle deleted file indexes first
    if (deletedFileIndexes && Array.isArray(deletedFileIndexes) && deletedFileIndexes.length > 0) {
      // Sort in descending order to avoid index shifting issues
      const sortedIndexes = [...deletedFileIndexes].sort((a, b) => b - a);
      fileAttachmentsData = [...existingAttachments];
      for (const idx of sortedIndexes) {
        if (idx >= 0 && idx < fileAttachmentsData.length) {
          fileAttachmentsData.splice(idx, 1);
        }
      }
    }

    // Add new pre-uploaded attachments from body
    if (attachments && attachments.length > 0) {
      // Validate total file count does not exceed 10
      if (fileAttachmentsData.length + attachments.length > 10) {
        return errorResponse(
          400,
          `Maximum 10 files allowed. You currently have ${fileAttachmentsData.length} files and are trying to add ${attachments.length}. Please remove ${fileAttachmentsData.length + attachments.length - 10} file(s).`,
          res
        );
      }

      fileAttachmentsData = [...fileAttachmentsData, ...attachments];
    }

    const updatedClaim = await prisma.claim.update({
      where: { id: claimId },
      data: {
        ...(memo !== undefined && { memo }),
        ...(hoursWorked !== undefined && { hoursWorked: Number(hoursWorked) }),
        ...(fileAttachmentsData !== undefined && { fileAttachments: fileAttachmentsData }),
      },
    });

    return res.status(200).json(updatedClaim);
  } catch (error) {
    console.log('Error: ', error);
    return errorResponse(500, 'Internal server error', res);
  }
};

export const deleteClaim = async (req: Request, res: Response) => {
  const callerAddress = req.address;
  const { claimId } = req.params as unknown as ClaimIdParams;

  try {
    const claim = await prisma.claim.findFirst({
      where: { id: claimId },
      include: {
        wage: true,
        weeklyClaim: {
          include: {
            claims: true,
          },
        },
      },
    });

    if (!claim) {
      return errorResponse(404, 'Claim not found', res);
    }

    if (claim.wage.userAddress !== callerAddress) {
      return errorResponse(403, 'Caller is not the owner of the claim', res);
    }

    if (claim.wage.disabled) {
      return errorResponse(403, 'Cannot delete claim: the wage is disabled', res);
    }

    const weeklyClaim = claim.weeklyClaim;

    if (
      weeklyClaim?.status &&
      weeklyClaim.status !== 'pending' &&
      weeklyClaim.status !== 'disabled'
    ) {
      return errorResponse(403, "Can't delete: Claim is not pending or disabled", res);
    }

    // Delete attached files from S3 if any exist
    await deleteAttachments(claim.fileAttachments as FileAttachmentData[] | null | undefined);

    await prisma.claim.delete({
      where: { id: claimId },
    });

    if (weeklyClaim) {
      const remainingClaims = (weeklyClaim.claims ?? []).filter((c) => c.id !== claimId);
      if (remainingClaims.length === 0) {
        await prisma.weeklyClaim.delete({
          where: { id: weeklyClaim.id },
        });
      }
    }

    return res.status(200).json({ message: 'Claim deleted successfully' });
  } catch (error) {
    console.log('Error: ', error);
    return errorResponse(500, 'Internal server error', res);
  }
};
