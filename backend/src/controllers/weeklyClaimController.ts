import { Request, Response } from 'express';
import { errorResponse, getMondayStart, prisma } from '../utils';
import { Prisma } from '@prisma/client';
import { Address, Hex, isAddress, isHex, keccak256, recoverTypedDataAddress } from 'viem';
import CASH_REMUNERATION_ABI from '../artifacts/cash_remuneration_eip712_abi.json';
import {
  getCurrentCashRemunerationContract,
  isCashRemunerationOwner,
} from '../utils/cashRemunerationUtil';
import publicClient from '../utils/viem.config';
import { refreshAttachmentUrls } from '../services/attachmentService';

// EIP-712 typed-data envelope for the WageClaim signature, mirroring the
// frontend definition in app/src/components/sections/CashRemunerationView/
// CRSigne.vue. Mirrored (not imported) so a future tweak to the frontend
// types triggers a backend change as well — that's the failure mode we want.
const WAGE_CLAIM_TYPES = {
  Wage: [
    { name: 'hourlyRate', type: 'uint256' },
    { name: 'tokenAddress', type: 'address' },
  ],
  WageClaim: [
    { name: 'employeeAddress', type: 'address' },
    { name: 'minutesWorked', type: 'uint16' },
    { name: 'wages', type: 'Wage[]' },
    { name: 'date', type: 'uint256' },
  ],
} as const;

export type WeeklyClaimAction = 'sign' | 'withdraw' | 'disable' | 'enable';
type statusType = 'pending' | 'signed' | 'withdrawn' | 'disabled';

function isValidWeeklyClaimAction(action: unknown): action is WeeklyClaimAction {
  return ['sign', 'withdraw', 'pending', 'disable', 'enable'].includes(action as string);
}

const deriveWeeklyClaimStatus = (isPaid: boolean, isDisabled: boolean): statusType => {
  if (isPaid) return 'withdrawn';
  if (isDisabled) return 'disabled';
  return 'signed';
};

export const updateWeeklyClaims = async (req: Request, res: Response) => {
  const callerAddress = req.address;
  const id = Number(req.params.id);
  const action = req.query.action as WeeklyClaimAction;
  const { signature, signedAgainstContractAddress, typedDataMessage, chainId } = req.body as {
    signature?: string;
    signedAgainstContractAddress?: string;
    typedDataMessage?: {
      employeeAddress: string;
      minutesWorked: number;
      date: string;
      wages: { hourlyRate: string; tokenAddress: string }[];
    };
    chainId?: number;
  };

  // Validation stricte des actions autorisées
  const errors: string[] = [];
  if (!action || !isValidWeeklyClaimAction(action))
    errors.push('Invalid action. Allowed actions are: sign, withdraw, disable, enable');

  if (action == 'sign') {
    if (!signature || !isHex(signature)) errors.push('Missing or invalid signature');
    // signedAgainstContractAddress + typedDataMessage + chainId are required
    // for sign so the backend can authenticate the EIP-712 signature and
    // tag the row with the verifying contract for stale-detection.
    if (!signedAgainstContractAddress || !isAddress(signedAgainstContractAddress))
      errors.push('Missing or invalid signedAgainstContractAddress');
    if (!typedDataMessage) errors.push('Missing typedDataMessage');
    if (!chainId || !Number.isInteger(chainId) || chainId <= 0)
      errors.push('Missing or invalid chainId');
  }

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
      case 'enable': {
        const enableErrors: string[] = [];

        // Check if the caller is the Cash Remuneration owner
        const isCallerCashRemunOwnerEnable = await isCashRemunerationOwner(
          callerAddress,
          weeklyClaim.wage.team.id
        );

        // If not Cash Remuneration owner, check if they're the team owner
        if (!isCallerCashRemunOwnerEnable && weeklyClaim.wage.team.ownerAddress !== callerAddress)
          enableErrors.push('Caller is not the Cash Remuneration owner or the team owner');

        // check if the weekly claim is already signed or withdrawn
        if (!weeklyClaim.signature)
          enableErrors.push('No claim existing signature: You need to sign claim first');
        if (
          weeklyClaim.status === 'signed' &&
          callerAddress ===
            (typeof weeklyClaim.data === 'object' && weeklyClaim.data !== null
              ? (weeklyClaim.data as Record<string, unknown>)['ownerAddress']
              : undefined)
        ) {
          enableErrors.push('Weekly claim already active');
        } else if (weeklyClaim.status === 'withdrawn') {
          enableErrors.push('Weekly claim already withdrawn');
        }

        if (enableErrors.length > 0) return errorResponse(400, enableErrors.join('; '), res);

        data = { signature, status: 'signed' };
        // singleClaimStatus = "signed";
        break;
      }
      case 'disable': {
        const disableErrors: string[] = [];

        // Check if the caller is the Cash Remuneration owner
        const _isCallerCashRemunOwner = await isCashRemunerationOwner(
          callerAddress,
          weeklyClaim.wage.team.id
        );

        // If not Cash Remuneration owner, check if they're the team owner
        if (!_isCallerCashRemunOwner && weeklyClaim.wage.team.ownerAddress !== callerAddress)
          disableErrors.push('Caller is not the Cash Remuneration owner or the team owner');

        // check if the weekly claim is already signed or withdrawn
        if (
          weeklyClaim.status === 'disabled' &&
          callerAddress ===
            (typeof weeklyClaim.data === 'object' && weeklyClaim.data !== null
              ? (weeklyClaim.data as Record<string, unknown>)['ownerAddress']
              : undefined)
        ) {
          disableErrors.push('Weekly claim already disabled');
        } else if (weeklyClaim.status === 'withdrawn') {
          disableErrors.push('Weekly claim already withdrawn');
        }

        if (disableErrors.length > 0) return errorResponse(400, disableErrors.join('; '), res);

        data = { signature, status: 'disabled' };
        // singleClaimStatus = "signed";
        break;
      }
      case 'sign': {
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
                ? (weeklyClaim.data as Record<string, unknown>)['ownerAddress']
                : undefined)
          ) {
            signErrors.push('Weekly claim already signed');
          } else if (weeklyClaim.status === 'withdrawn') {
            signErrors.push('Weekly claim already withdrawn');
          }
        }

        // The signed-against contract must be the team's current
        // CashRemunerationEIP712 — the one governed by the current Officer
        // (linked-list head). Scoping via the helper rather than an
        // unscoped findFirst is required because after an Officer redeploy
        // the team has multiple TeamContract rows of this type and we
        // would otherwise non-deterministically pick an archived one.
        // `isCashRemunerationOwner` reads from the same helper, so the
        // owner check above and this contract-match check are guaranteed
        // to be looking at the same generation of the contract.
        const currentCashRemunerationContract = await getCurrentCashRemunerationContract(
          weeklyClaim.wage.team.id
        );
        if (
          !currentCashRemunerationContract ||
          currentCashRemunerationContract.address.toLowerCase() !==
            (signedAgainstContractAddress as string).toLowerCase()
        ) {
          signErrors.push(
            'signedAgainstContractAddress does not match the team current CashRemunerationEIP712'
          );
        }

        // Authenticate the EIP-712 signature: rebuild the typed-data envelope
        // from the body and recover the signer. Reject if it isn't the caller.
        // viem's recoverTypedDataAddress handles the EIP-712 hash + ECDSA
        // recovery; the bigint-coerced fields (`date`, `hourlyRate`) come back
        // as strings on the wire.
        let recovered: Address | null = null;
        if (signErrors.length === 0) {
          try {
            recovered = await recoverTypedDataAddress({
              domain: {
                name: 'CashRemuneration',
                version: '1',
                chainId: chainId as number,
                verifyingContract: signedAgainstContractAddress as Address,
              },
              types: WAGE_CLAIM_TYPES,
              primaryType: 'WageClaim',
              message: {
                employeeAddress: typedDataMessage!.employeeAddress as Address,
                minutesWorked: typedDataMessage!.minutesWorked,
                wages: typedDataMessage!.wages.map((w) => ({
                  hourlyRate: BigInt(w.hourlyRate),
                  tokenAddress: w.tokenAddress as Address,
                })),
                date: BigInt(typedDataMessage!.date),
              },
              signature: signature as Hex,
            });
          } catch (err) {
            console.error('Failed to recover signer for weeklyClaim sign:', err);
            signErrors.push('Failed to verify signature');
          }
        }

        if (
          signErrors.length === 0 &&
          (!recovered || recovered.toLowerCase() !== callerAddress.toLowerCase())
        ) {
          signErrors.push('Recovered signer does not match the caller');
        }

        if (signErrors.length > 0) return errorResponse(400, signErrors.join('; '), res);

        data = {
          signature,
          status: 'signed',
          data: { ownerAddress: callerAddress },
          signedAgainstContractAddress,
        };
        // singleClaimStatus = "signed";
        break;
      }
      case 'withdraw': {
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

  const rawFilterAddress = (req.query.userAddress ??
    req.query.memberAddress ??
    req.query.address) as string | undefined;
  const filterAddress = rawFilterAddress?.trim();
  let memberAddressFilter: Prisma.WeeklyClaimWhereInput = {};
  if (filterAddress) {
    if (!isAddress(filterAddress)) {
      return errorResponse(400, 'Invalid member address', res);
    }

    memberAddressFilter = {
      memberAddress: {
        equals: filterAddress,
        mode: 'insensitive',
      },
    };
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
    // authz enforced by requireTeamMember middleware
    console.log({ teamId, ...memberAddressFilter, ...statusFilter });

    // Filter directly on WeeklyClaim team/member to avoid leaking other members' records.
    const weeklyClaims = await prisma.weeklyClaim.findMany({
      where: {
        teamId,
        ...memberAddressFilter,
        ...statusFilter,
      },
      include: {
        wage: true,
        claims: {
          where: {
            wage: {
              teamId,
              ...(filterAddress
                ? {
                    userAddress: {
                      equals: filterAddress,
                      mode: 'insensitive',
                    },
                  }
                : {}),
            },
          },
        },
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

    const weeklyClaimsWithFreshAttachmentUrls = await Promise.all(
      weeklyClaims.map(async (wc) => ({
        ...wc,
        claims: await Promise.all(
          wc.claims.map(async (claim) => ({
            ...claim,
            fileAttachments: await refreshAttachmentUrls(claim.fileAttachments),
          }))
        ),
      }))
    );

    const weeklyClaimsWithMinutes = weeklyClaimsWithFreshAttachmentUrls.map((wc) => {
      const minutesWorked = wc.claims.reduce((sum, claim) => {
        const h = claim.minutesWorked ?? 0;
        return sum + h;
      }, 0);

      return {
        ...wc,
        minutesWorked,
      };
    });

    return res.status(200).json(weeklyClaimsWithMinutes);
  } catch (error) {
    console.error(error);
    return errorResponse(500, 'Internal Server Error', res);
  }
};

export const syncWeeklyClaims = async (req: Request, res: Response) => {
  const teamId = Number(req.query.teamId);

  try {
    // authz enforced by requireTeamMember middleware. Scope to the current
    // Officer so a redeployed team syncs against its live contract, not an
    // archived one (multiple rows of the same type exist post-redeploy).
    const teamContract = await getCurrentCashRemunerationContract(teamId);

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
