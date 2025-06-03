import { Request, Response } from "express";
import { prisma } from "../utils";
import { errorResponse } from "../utils/utils";

export const getTeamWeeklyClaims = async (req: Request, res: Response) => {
  const teamId = Number(req.query.teamId);

  if (!teamId || isNaN(teamId)) {
    return errorResponse(400, "Missing or invalid teamId", res);
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
