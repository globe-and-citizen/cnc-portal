import { 
  prisma, 
  errorResponse, 
  deleteEntitlements,
  updateEntitlements,
  replaceEmpty
} from "../../utils";
import { type Entitlement } from "@prisma/client";
import { Request, Response } from "express";

interface Role {
  id?: number;
  name: string;
  description?: string;
  entitlements?: Entitlement[]
}

export const updateRoleCategory = async (req: Request, res: Response) => {
  const roleCategory = req.body

  try {
    const oldEnts = await prisma.entitlement.findMany({
      where: { roleCategoryId: roleCategory.id}
    })

    await deleteEntitlements(oldEnts, roleCategory.entitlements)

    await updateEntitlements(roleCategory.entitlements, 'roleCategoryId', roleCategory.id, res)

    await prisma.roleCategory.update({
      where: { id: roleCategory.id},
      data: {
        name: roleCategory.name?? roleCategory.name,
        description: roleCategory.description?? roleCategory.description
      }
    })

    res.status(201).json({
      success: true
    })
  } catch (error) {
    return errorResponse(500, error, res)
  } finally{
    await prisma.$disconnect()
  }
}

export const deleteRoleCategory = async (req: Request, res: Response) => {
  const { id } = req.params

  const _id = parseInt(id)
  if (isNaN(_id)) {
    return errorResponse(404, 'Invalid ID', res)
  }

  try {
    // Delete related Role records first
    await prisma.role.deleteMany({
      where: {
        roleCategoryId: _id,
      },
    });

    await prisma.roleCategory.delete({
      where: { id: _id }
    })    
  } catch (error) {
    return errorResponse(500, error, res)
  } finally {
    await prisma.$disconnect()
  }
}

export const addRoleCategory = async (req: Request, res: Response) => {
  const callerAddress = (req as any).address

  let roleCategory = req.body

  try {
    if (!roleCategory) {
      return errorResponse(404, 'Role category empty or not set', res)
    }

    roleCategory = replaceEmpty(roleCategory)
    console.log(`Role category: `, roleCategory)

    const _roleCategory = await prisma.roleCategory.create({
      data: {
        name: roleCategory.name,
        description: roleCategory.description,
        entitlements: {
          create: roleCategory.entitlements
        }
      },
      include: {
        entitlements: true
      }
    });

    const roles = await Promise.all(roleCategory.roles.map(async (role: Role) => {
      return await prisma.role.create({
        data: {
          name: role.name,
          description: role.description ?? null,
          roleCategoryId: _roleCategory.id,
          entitlements: {
            create: role.entitlements
          }
        }, 
        include: {
          entitlements: true
        }
      })
    }))

    const __roleCategory = await prisma.roleCategory.findUnique({
      where: {
        id: _roleCategory.id
      },
      include: {
        roles: {
          include: {
            entitlements: true
          }
        },
        entitlements: true
      }
    })

    res.status(201).json({
      success: true,
      roleCategory: __roleCategory
    })
  } catch(error) {
    return errorResponse(500, error, res)
  }
}

export const getRoleCategories = async (req: Request, res: Response) => {
  try {
    const roleCategories = await prisma.roleCategory.findMany({
      include: {
        entitlements: true,
        roles: {
          include: {
            entitlements: true
          }
        }
      }
    })

    res.status(201).json({
      success: true,
      roleCategories
    })
  } catch (error) {
    return errorResponse(500, error, res)
  } finally {
    await prisma.$disconnect()
  }
}

export const getRoleCategory = async (req: Request, res: Response) => {
  const { id } = req.params

  const _id = parseInt(id)
  if (isNaN(_id)) {
    return errorResponse(404, 'Invalid ID', res)
  }
  try {
    const roleCategory = await prisma.roleCategory.findUnique({
      where: { id: _id},
      include: {
        entitlements: true,
        roles: {
          include: {
            entitlements: true
          }
        }
      }
    })

    res.status(201).json({
      success: true,
      roleCategory
    })
  } catch (error) {
    return errorResponse(500, error, res)
  } finally {
    await prisma.$disconnect()
  }
}