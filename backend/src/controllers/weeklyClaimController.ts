import { Request, Response } from 'express';
import { prisma, errorResponse, getMondayStart } from '../utils';
// import { errorResponse } from "../utils/utils";
import { Prisma } from '@prisma/client';
import { Hex, isAddress, isHex, keccak256 } from 'viem';
import { isCashRemunerationOwner } from '../utils/cashRemunerationUtil';
import publicClient from '../utils/viem.config';
import CASH_REMUNERATION_ABI from '../artifacts/cash_remuneration_eip712_abi.json';

export type WeeklyClaimAction = 'sign' | 'withdraw';
type statusType = 'pending' | 'signed' | 'withdrawn' | 'disabled';

function isValidWeeklyClaimAction(action: any): action is WeeklyClaimAction {
  return ['sign', 'withdraw', 'pending', 'disabled'].includes(action);
}

const deriveWeeklyClaimStatus = (isPaid: boolean, isDisabled: boolean): statusType => {
  if (isPaid) return 'withdrawn';
  if (isDisabled) return 'disabled';
  return 'signed';
};

export const updateWeeklyClaims = async (req: Request, res: Response) => {
  const callerAddress = (req as any).address;
  const id = Number(req.params.id);
  const action = req.query.action as WeeklyClaimAction;
  const { signature, data: message } = req.body;

  // Validation stricte des actions autorisées
  const errors: string[] = [];
  if (!action || !isValidWeeklyClaimAction(action))
    errors.push('Invalid action. Allowed actions are: sign, withdraw');

  if (action == 'sign' && (!signature || !isHex(signature)))
    errors.push('Missing or invalid signature');

  if (!id || isNaN(id)) errors.push('Missing or invalid id');

  if (errors.length > 0) {
    return errorResponse(400, errors.join('; '), res);
  }

  let data: Prisma.WeeklyClaimUpdateInput = {};
  // let singleClaimStatus: statusType = "pending";

  try {
    // Utilisation de findUnique car id est unique
    const weeklyClaim = await prisma.weeklyClaim.findUnique({
      where: { id },
      include: {
        wage: {
          include: { team: true },
        },
      },
    });

    if (!weeklyClaim) {
      return errorResponse(404, 'WeeklyClaim not found', res);
    }

    switch (action) {
      case 'sign':
        const signErrors: string[] = [];

        // Check if the caller is the Cash Remuneration owner
        const isCallerCashRemunOwner = await isCashRemunerationOwner(
          callerAddress,
          weeklyClaim.wage.team.id
        );

        // If not Cash Remuneration owner, check if they're the team owner
        if (!isCallerCashRemunOwner && weeklyClaim.wage.team.ownerAddress !== callerAddress)
          signErrors.push('Caller is not the Cash Remuneration owner or the team owner');

        // Check if the week is completed
        if (weeklyClaim.weekStart.getTime() >= getMondayStart(new Date()).getTime()) {
          signErrors.push('Week not yet completed');
        }
        // check if the weekly claim is already signed or withdrawn
        if (weeklyClaim.status !== 'pending') {
          if (
            weeklyClaim.status === 'signed' &&
            callerAddress ===
              (typeof weeklyClaim.data === 'object' && weeklyClaim.data !== null
                ? (weeklyClaim.data as { [key: string]: any })['ownerAddress']
                : undefined)
          ) {
            signErrors.push('Weekly claim already signed');
          } else if (weeklyClaim.status === 'withdrawn') {
            signErrors.push('Weekly claim already withdrawn');
          }
        }

        if (signErrors.length > 0) return errorResponse(400, signErrors.join('; '), res);

        data = { signature, status: 'signed', data: message };
        // singleClaimStatus = "signed";
        break;
      case 'withdraw':
        // Check if the weekly claim is already signed
        if (weeklyClaim.status !== 'signed') {
          let withdrawErrorMsg = 'Weekly claim must be signed before it can be withdrawn';
          if (weeklyClaim.status === 'withdrawn') {
            withdrawErrorMsg = 'Weekly claim already withdrawn';
          }
          return errorResponse(400, withdrawErrorMsg, res);
        }
        data = { status: 'withdrawn' };
        // singleClaimStatus = "withdrawn";
        break;
    }

    // Transaction pour mettre à jour le weeklyClaim et les claims associés
    const [updatedWeeklyClaim] = await prisma.$transaction([
      prisma.weeklyClaim.update({
        where: { id },
        data,
      }),
      // prisma.claim.updateMany({
      //   where: { weeklyClaimId: id },
      //   data: { status: singleClaimStatus },
      // }),
    ]);

    res.status(200).json(updatedWeeklyClaim);
  } catch (error) {
    console.error(error);
    return errorResponse(500, error, res);
  }
};

export const getTeamWeeklyClaims = async (req: Request, res: Response) => {
  const teamId = Number(req.query.teamId);
  const status = req.query.status as string;

  if (!teamId || isNaN(teamId)) {
    return errorResponse(400, 'Missing or invalid teamId', res);
  }

  let memberAddressFilter: Prisma.WeeklyClaimWhereInput = {};
  if (req.query.memberAddress) {
    memberAddressFilter = { memberAddress: req.query.memberAddress as string };
  }

  //create filter for the statut pending, signed or withdrawn

  let statusFilter: Prisma.WeeklyClaimWhereInput = {};
  if (status) {
    if (
      (['pending', 'signed', 'withdrawn', 'disabled'] as statusType[]).includes(
        status as statusType
      )
    ) {
      statusFilter = { status };
    } else {
      return errorResponse(
        400,
        'Invalid status. Allowed statuses are: pending, signed, withdrawn, disabled',
        res
      );
    }
  }

  try {
    // Get all WeeklyClaims that have at least one claim for this team
    const weeklyClaims = await prisma.weeklyClaim.findMany({
      where: {
        claims: {
          some: {
            wage: {
              teamId: teamId,
            },
          },
        },
        ...memberAddressFilter,
        ...statusFilter,
      },
      include: {
        wage: true,
        claims: true,
        member: {
          select: {
            address: true,
            name: true,
            imageUrl: true,
          },
        },
      },
      orderBy: { weekStart: 'asc' },
    });

    const weeklyClaimsWithHours = weeklyClaims.map((wc) => {
      const hoursWorked = wc.claims.reduce((sum, claim) => {
        const h = claim.hoursWorked ?? 0;
        return sum + h;
      }, 0);

      return {
        ...wc,
        hoursWorked,
      };
    });

    return res.status(200).json(weeklyClaimsWithHours);
  } catch (error) {
    console.error(error);
    return errorResponse(500, 'Internal Server Error', res);
  }
};

export const syncWeeklyClaims = async (req: Request, res: Response) => {
  const teamId = Number(req.query.teamId);

  if (!teamId || Number.isNaN(teamId)) {
    return errorResponse(400, 'Missing or invalid teamId', res);
  }

  try {
    const teamContract = await prisma.teamContract.findFirst({
      where: {
        teamId,
        type: 'CashRemunerationEIP712',
      },
    });

    if (!teamContract || !teamContract.address || !isAddress(teamContract.address)) {
      return errorResponse(404, 'Cash Remuneration contract not found for the team', res);
    }

    const weeklyClaims = await prisma.weeklyClaim.findMany({
      where: {
        teamId,
        status: {
          in: ['signed', 'disabled'],
        },
      },
      select: {
        id: true,
        status: true,
        signature: true,
      },
    });

    if (weeklyClaims.length === 0) {
      return res.status(200).json({
        teamId,
        totalProcessed: 0,
        updated: [],
        skipped: [],
      });
    }

    const updatedClaims: Array<{ id: number; previousStatus: string; newStatus: string }> = [];
    const skippedClaims: Array<{ id: number; reason: string }> = [];

    for (const claim of weeklyClaims) {
      if (!claim.signature || !isHex(claim.signature)) {
        skippedClaims.push({ id: claim.id, reason: 'Missing or invalid signature' });
        continue;
      }

      const signatureHash = keccak256(claim.signature as Hex);

      try {
        const [isPaid, isDisabled] = await Promise.all([
          publicClient.readContract({
            address: teamContract.address as `0x${string}`,
            abi: CASH_REMUNERATION_ABI,
            functionName: 'paidWageClaims',
            args: [signatureHash],
          }),
          publicClient.readContract({
            address: teamContract.address as `0x${string}`,
            abi: CASH_REMUNERATION_ABI,
            functionName: 'disabledWageClaims',
            args: [signatureHash],
          }),
        ]);

        const expectedStatus = deriveWeeklyClaimStatus(Boolean(isPaid), Boolean(isDisabled));

        if (expectedStatus !== claim.status) {
          await prisma.weeklyClaim.update({
            where: { id: claim.id },
            data: { status: expectedStatus },
          });

          updatedClaims.push({
            id: claim.id,
            previousStatus: claim.status ?? 'unknown',
            newStatus: expectedStatus,
          });
        }
      } catch (readError) {
        console.error(`Failed to sync weekly claim ${claim.id}:`, readError);
        skippedClaims.push({ id: claim.id, reason: 'Failed to read contract state' });
      }
    }

    return res.status(200).json({
      teamId,
      totalProcessed: weeklyClaims.length,
      updated: updatedClaims,
      skipped: skippedClaims,
    });
  } catch (error) {
    console.error('Error syncing weekly claims:', error);
    return errorResponse(500, error, res);
  }
};
