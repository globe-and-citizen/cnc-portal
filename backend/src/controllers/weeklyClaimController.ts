import { Request, Response } from "express";
import { prisma, errorResponse, getMondayStart } from "../utils";
// import { errorResponse } from "../utils/utils";
import { Prisma } from "@prisma/client";
import { isHex } from "viem";

export const updateWeeklyClaims = async (req: Request, res: Response) => {
  const callerAddress = (req as any).address;
  const claimId = Number(req.params.claimId);
  const { action } = req.query
  const { signature } = req.body

  console.log('callerAddress: ', callerAddress)
  console.log('claimId: ', claimId)
  console.log('action: ', action)
  console.log('signature: ', req.body.signature)

  const data: Prisma.WeeklyClaimUpdateInput = {}
  const mondayStart = getMondayStart(new Date())

  if (!claimId || isNaN(claimId))
    return errorResponse(400, "Missing or invalid claimId", res)

  try {
    const weeklyClaim = await prisma.weeklyClaim.findFirst({ 
      where: { id: claimId },
      include: {
        wage: {
          include: { team: true }
        }
      }
    })

    switch(action) {
      case 'sign':
        // Validate signature
        if (!signature || !isHex(signature))
          return errorResponse(400, "Missing or invalid signature", res)
        // Validate signer
        if(weeklyClaim?.wage.team.ownerAddress !== callerAddress) 
          return errorResponse(403, "Caller is not owner of the team", res)
        // Validate week is completed
        if(!weeklyClaim?.weekStart)
          return errorResponse(400, 'Missing week start', res)
        const weeklyClaimMondayStart = getMondayStart(weeklyClaim?.weekStart)
        if(weeklyClaimMondayStart.getTime() === mondayStart.getTime())
          return errorResponse(400, "Week not yet completed", res)
        // Update signature and status
        data.signature = signature
        data.status = "signed"
        break;
      case 'withdraw':
        data.status = "withdrawn"
        console.log(`execute withdraw action...`)
    }

    const updatedWeeklyClaim = await prisma.weeklyClaim.update({
      where: { id: claimId },
      data
    })

    res.status(200).json(updatedWeeklyClaim)
  } catch(error) {
    console.error(error);
    return errorResponse(500, error, res)
  } finally {
    await prisma.$disconnect()
  }
}

export const getTeamWeeklyClaims = async (req: Request, res: Response) => {
  const teamId = Number(req.query.teamId);

  if (!teamId || isNaN(teamId)) {
    return errorResponse(400, "Missing or invalid teamId", res);
  }

  let memberAddressFilter: Prisma.WeeklyClaimWhereInput = {};
  if (req.query.memberAddress) {
    memberAddressFilter = { memberAddress: req.query.memberAddress as string };
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
      orderBy: { createdAt: "desc" },
    });

    return res.status(200).json(weeklyClaims);
  } catch (error) {
    console.error(error);
    return errorResponse(500, "Internal Server Error", res);
  } finally {
    await prisma.$disconnect();
  }
};
