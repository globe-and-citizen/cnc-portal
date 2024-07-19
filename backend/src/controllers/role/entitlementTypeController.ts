import { prisma, errorResponse } from "../../utils";
import { Request, Response } from "express";

const initEntTypes = [
  { "id": 1, "name": "salary" },
  { "id": 2, "name": "dividend" },
  { "id": 3, "name": "wage" },
  { "id": 4, "name": "tokens" },
  { "id": 5, "name": "access" },
  { "id": 6, "name": "vote" }
]

export const getEntitlementTypes = async (req: Request, res: Response) => {
  try {
    //Initialize database with default or create new types if not present
    //TODO: needs to be secured
    for (const entType of initEntTypes) {
      const existingEntType = await prisma.entitlementType.findUnique({
        where: { name: entType.name }
      });

      if (!existingEntType) {
        await prisma.entitlementType.create({
          data: {
            name: entType.name
          }
        });
      }
    }

    const entTypes = await prisma.entitlementType.findMany();

    res.json({
      success: true,
      entTypes: entTypes
    });
  } catch (error) {
    return errorResponse(500, error, res)
  } finally {
    await prisma.$disconnect()
  }
}