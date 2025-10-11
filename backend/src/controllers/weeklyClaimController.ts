import { Request, Response } from 'express';
import { prisma, errorResponse, getMondayStart } from '../utils';
// import { errorResponse } from "../utils/utils";
import { Prisma } from '@prisma/client';
import { isHex } from 'viem';
import { isCashRemunerationOwner } from '../utils/cashRemunerationUtil';

export type WeeklyClaimAction = 'sign' | 'withdraw';
type statusType = 'pending' | 'signed' | 'withdrawn';

function isValidWeeklyClaimAction(action: any): action is WeeklyClaimAction {
  return ['sign', 'withdraw', 'pending'].includes(action);
}

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
    if ((['pending', 'signed', 'withdrawn'] as statusType[]).includes(status as statusType)) {
      statusFilter = { status };
    } else {
      return errorResponse(400, 'Invalid status. Allowed status are: sign, withdraw, pending', res);
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

    return res.status(200).json(weeklyClaims);
  } catch (error) {
    console.error(error);
    return errorResponse(500, 'Internal Server Error', res);
  }
};
