import { Request, Response } from "express";
import { prisma, errorResponse } from "../utils";
import dayjs from "dayjs";
import { Claim, ClaimStatus, Prisma } from "@prisma/client";

export const addEmployeeWage = async (req: Request, res: Response) => {
  const { id } = req.params;
  const callerAddress = (req as any).address;
  const { userAddress } = req.body;
  const wageData = req.body;

  try {
    const team = await prisma.team.findUnique({
      where: { id: Number(id) },
    });
    const ownerAddress = team?.ownerAddress;
    if (callerAddress !== ownerAddress) {
      return errorResponse(403, `Forbidden`, res);
    }
    if (typeof userAddress !== "string") {
      return errorResponse(400, "Bad Request", res);
    }
    //create or update wage data
    await prisma.memberTeamsData.upsert({
      where: {
        userAddress_teamId: {
          userAddress,
          teamId: Number(id),
        },
      },
      update: {
        hourlyRate: wageData.hourlyRate,
        maxHoursPerWeek: wageData.maxHoursPerWeek,
      },
      create: {
        userAddress,
        teamId: Number(id),
        hourlyRate: wageData.hourlyRate,
        maxHoursPerWeek: wageData.maxHoursPerWeek,
      },
    });

    res.status(201).json({
      success: true,
    });
  } catch (error) {
    return errorResponse(500, error, res);
  } finally {
    await prisma.$disconnect();
  }
};

export const getMonthlyClaims = async (req: Request, res: Response) => {
  const address = (req as any).address;
  const teamId = req.params.id;

  var firstDayInMonth = dayjs().startOf("month").toDate();
  var lastDayInMonth = dayjs().endOf("month").toDate();

  try {
    const { withdrawedAmount } = await prisma.$queryRaw<{
      withdrawedAmount: number;
    }>(
      Prisma.sql`
      SELECT
        SUM("c"."hoursWorked") * "mtd"."hourlyRate"::decimal as withdrawedAmount
      FROM "Claim" c
      JOIN "MemberTeamsData" mtd ON "c"."memberTeamsDataId" = "mtd"."id"
      WHERE "mtd"."userAddress" = ${address}::text
      AND "mtd"."teamId" = ${teamId}::int
      AND "c"."status" = ${ClaimStatus.WITHDRAWED}::"ClaimStatus"
      AND "c"."withdrawedAt" >= ${firstDayInMonth}::timestamp
      AND "c"."withdrawedAt" <= ${lastDayInMonth}::timestamp
      GROUP BY "mtd"."id"`
    );

    const { approvedAmount } = await prisma.$queryRaw<{
      approvedAmount: number;
    }>(
      Prisma.sql`
      SELECT
        SUM("c"."hoursWorked") * "mtd"."hourlyRate"::decimal as approvedAmount
      FROM "Claim" c
      JOIN "MemberTeamsData" mtd ON "c"."memberTeamsDataId" = "mtd"."id"
      WHERE "mtd"."userAddress" = ${address}::text
      AND "mtd"."teamId" = ${teamId}::int
      AND "c"."status" = ${ClaimStatus.APPROVED}::"ClaimStatus"
      AND "c"."approvedAt" >= ${firstDayInMonth}::timestamp
      AND "c"."approvedAt" <= ${lastDayInMonth}::timestamp
      GROUP BY "mtd"."id"`
    );

    res.status(200).json({
      success: true,
      data: {
        withdrawedAmount: withdrawedAmount || 0,
        approvedAmount: approvedAmount || 0,
      },
    });
  } catch (error) {
    return errorResponse(500, error, res);
  } finally {
    await prisma.$disconnect();
  }
};

export const createClaim = async (req: Request, res: Response) => {
  const userAddress = (req as any).address;
  const teamId = req.params.id;
  const { hoursWorked } = req.body;

  try {
    const memberTeamsData = await prisma.memberTeamsData.findUnique({
      where: {
        userAddress_teamId: {
          teamId: parseInt(teamId),
          userAddress,
        },
      },
    });
    if (!memberTeamsData) {
      return errorResponse(404, "Member not found", res);
    }

    const claim = await prisma.claim.create({
      data: {
        memberTeamsDataId: memberTeamsData.id,
        hoursWorked,
        status: ClaimStatus.PENDING,
      },
    });

    res.status(201).json({
      success: true,
      data: claim,
    });
  } catch (error) {
    return errorResponse(500, error, res);
  } finally {
    await prisma.$disconnect();
  }
};

export const updateClaim = async (req: Request, res: Response) => {
  const { id } = req.params;
  const teamId = req.params.id;
  const address = (req as any).address;
  const claim = await prisma.claim.findUnique({
    where: { id: parseInt(id) },
  });

  if (!claim) {
    return errorResponse(404, "Claim not found", res);
  }

  const team = await prisma.team.findUnique({
    where: { id: parseInt(teamId) },
  });
  if (!team) {
    return errorResponse(404, "Team not found", res);
  }

  if (team.ownerAddress == address) {
    return updateClaimAsEmployer(req, res);
  } else {
    return updateClaimAsEmployee(req, res, claim);
  }
};

export const getClaims = async (req: Request, res: Response) => {
  const address = (req as any).address;
  const teamId = req.params.id;
  const { status } = req.query;

  if (!teamId && !status) {
    return errorResponse(400, "Team ID or status is required", res);
  }
  const team = await prisma.team.findUnique({
    where: { id: parseInt(teamId as string) },
  });
  if (!team) {
    return errorResponse(404, "Team not found", res);
  }

  const addressQuery =
    team.ownerAddress == address ? {} : { userAddress: address };
  try {
    const claims = await prisma.claim.findMany({
      where: {
        status: status as ClaimStatus,
        memberTeamsData: {
          ...addressQuery,
          teamId: parseInt(teamId as string),
        },
      },
      select: {
        id: true,
        status: true,
        hoursWorked: true,
        approvedAt: true,
        withdrawedAt: true,
        memberTeamsData: {
          select: {
            userAddress: true,
            teamId: true,
            hourlyRate: true,
          },
        },
      },
    });
    const result = claims.map((claim) => {
      return {
        id: claim.id,
        status: claim.status,
        hoursWorked: claim.hoursWorked,
        approvedAt: claim.approvedAt,
        withdrawedAt: claim.withdrawedAt,
        hourlyRate: claim.memberTeamsData.hourlyRate,
      };
    });

    res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error) {
    return errorResponse(500, error, res);
  } finally {
    await prisma.$disconnect();
  }
};

const updateClaimAsEmployer = async (req: Request, res: Response) => {
  const { id } = req.params;
  const { status, signature } = req.body;
  const allowedStatuses = [ClaimStatus.APPROVED]; // add as needed
  if (!allowedStatuses.includes(status)) {
    return errorResponse(400, "Invalid status", res);
  }
  if (!signature && status == ClaimStatus.APPROVED) {
    return errorResponse(400, "Signature is required", res);
  }
  const signatureUpdate =
    status == ClaimStatus.APPROVED
      ? { cashRemunerationSignature: signature }
      : {};

  try {
    const claim = await prisma.claim.update({
      where: { id: parseInt(id) },
      data: {
        status,
        ...getClaimTimeUpdateParams(status),
        ...signatureUpdate,
      },
    });
    res.status(200).json({
      success: true,
      data: claim,
    });
  } catch (error) {
    return errorResponse(500, error, res);
  } finally {
    await prisma.$disconnect();
  }
};

const updateClaimAsEmployee = async (
  req: Request,
  res: Response,
  claim: Claim
) => {
  const { id } = req.params;
  const { status, hoursWorked } = req.body;
  const allowedStatuses = [ClaimStatus.WITHDRAWED]; // add as needed
  if (!allowedStatuses.includes(status)) {
    return errorResponse(400, "Invalid status", res);
  }
  if (claim.status == ClaimStatus.WITHDRAWED) {
    return errorResponse(
      403,
      "Cannot update claim that already withdrawed",
      res
    );
  }

  try {
    res.status(200).json({
      success: true,
      data: await prisma.claim.update({
        where: { id: parseInt(id) },
        data: {
          status,
          hoursWorked,
          ...getClaimTimeUpdateParams(status),
        },
      }),
    });
  } catch (error) {
    return errorResponse(500, error, res);
  } finally {
    await prisma.$disconnect();
  }
};

const getClaimTimeUpdateParams = (status: ClaimStatus) => {
  return status == ClaimStatus.APPROVED
    ? { approvedAt: status }
    : status == ClaimStatus.WITHDRAWED
    ? { withdrawedAt: status }
    : {};
};
