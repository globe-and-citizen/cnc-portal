import { 
  prisma, 
  errorResponse, 
  deleteEntitlements,
  updateEntitlements 
} from "../../utils";
//import { type Entitlement } from "@prisma/client";
import { Request, Response } from "express";

export const deleteRole = async (req: Request, res: Response) => {
  const { id } = req.params

  const _id = parseInt(id)
  if (isNaN(_id)) {
    return errorResponse(404, 'Invalid ID', res)
  }

  try {

    await prisma.role.delete({
      where: {
        id: _id
      }
    })

    res.status(201).json({
      success: true
    })
    
  } catch (error) {
    
  } finally {
    await prisma.$disconnect()
  }

}

export const createRole =  async (req: Request, res: Response) => {
  const { id } = req.params
  const role = req.body

  const _id = parseInt(id)
  if (isNaN(_id)) {
    return errorResponse(404, 'Invalid ID', res)
  }

  try {

    await prisma.role.create({
      data: {
        name: role.name,
        description: role.description ?? null,
        roleCategoryId: _id,
        entitlements: {
          create: role.entitlements
        }
      }
    })

    res.status(201).json({
      success: true
    })

  } catch (error) {
    return errorResponse(500, error, res)
  } finally {
    await prisma.$disconnect()
  }

}

export const updateRole = async (req: Request, res: Response) => {
  const role = req.body
  try {
    const oldEnts = await prisma.entitlement.findMany({
      where: {
        roleId: role.id
      }
    })

    console.log(`role: `, role)

    await deleteEntitlements(oldEnts, role.entitlements)

    await updateEntitlements(role.entitlements, 'roleId', role.id, res)

    await prisma.role.update({
      where: { id: role.id },
      data: {
        name: role.name?? role.name,
        description: role.description?? role.description,
      }
    })

    res.status(201).json({
      success: true
    })

  } catch (error) {
    return errorResponse(500, error, res)
  } finally {
    await prisma.$disconnect()
  }
}