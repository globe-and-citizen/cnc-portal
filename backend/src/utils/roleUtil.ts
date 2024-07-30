import { prisma, errorResponse } from "./";
import { Response } from "express";
import { Entitlement } from "@prisma/client";

interface ReqEntitlement {
  id?: number;
  entitlementTypeId: number;
  value?: string | null;
  description?: string | null;
  roleCategoryId?: number | null;
  roleId?: number | null;
}

export const deleteEntitlements = async (
  oldEnts: Entitlement[], 
  newEnts: ReqEntitlement[] | undefined
) => {
  for (const oldEnt of oldEnts) {
    if (newEnts) {
      let isDelete = true;

      newEnts
        .forEach(newEnt => {
          if (newEnt.id === oldEnt.id)
            isDelete = false
        })

      if (isDelete) {
        prisma.entitlement.delete({
          where: { id: oldEnt.id }
        })
          .catch(error => {
            throw error
          })
          .finally(async () => await prisma.$disconnect())
      }
    }
  } 
}

export const updateEntitlements  = async (
  ents: ReqEntitlement[],
  field: 'roleCategoryId' | 'roleId', 
  id: number,
  res: Response
) => {
  for (const entitlement of ents) {
    if (entitlement.id) {
      const entId = parseInt(`${entitlement.id}`)
      if (isNaN(entId)) {
        return errorResponse(404, 'Invalid Entitlement ID', res)
        //throw new Error('Invalid Entitlement ID')
      }

      await prisma.entitlement.update({
        where: {
          id: entId
        }, 
        data: {
          description: entitlement.description? entitlement.description : null,
          value: entitlement.value? entitlement.value: '',
          entitlementTypeId: entitlement.entitlementTypeId
        }
      })
    } else {
      await prisma.entitlement.create({
        data: {
          [field]: id,
          value: entitlement.value? entitlement.value: '',
          entitlementTypeId: entitlement.entitlementTypeId
        }
      })
    }
  }
}