import { prisma, errorResponse } from "../utils";
//import { Role } from "@prisma/client";
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
    //TODO: this needs to be secured
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

export const addRoleCategory = async (req: Request, res: Response) => {
  const callerAddress = (req as any).address

  const roleCatgory = req.body

  try {
    if (!roleCatgory) {
      return errorResponse(404, 'Role category empty or not set', res)
    }

    const _roleCategory = await prisma.roleCategory.create({
      data: {
        name: roleCatgory.name,
        description: roleCatgory.description ?? null
      }
    })

    /*const roles = roleCatgory.roles.map(async (role: Role) => {
      //role.roleCategoryId = _roleCategory.id
      const _role = await prisma.role.create({
        data: {
          name: role.name,
          description: role.description ?? null,
          roleCategoryId: _roleCategory.id
        }, 
        include: {
          entitlements: true
        }
      })

      const entitlements = role.
      return role
    })*/

    console.log('roleCategory: ', roleCatgory)

    res.status(201).json({
      success: true
    })
  } catch(error) {
    return errorResponse(500, error, res)
  }
}