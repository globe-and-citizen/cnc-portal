import { prisma, errorResponse } from "../utils";
import { Request, Response } from "express";
import { isAddress } from "ethers";

const addNotification = async (req: Request, res: Response) => {

  const { userIds, notification } = req.body;

  try {
    let notifications = await Promise.all(userIds.map(async (userId: string) => {
      if (!isAddress(userId)) {
        throw new Error(`Invalid user address: ${userId}`)
      }

      return prisma.notification.create({
        data: {
            message: notification.message,
            userAddress: userId,
            subject: notification.subject? notification.subject: null
        }
      })
    }))

    await prisma.$disconnect()

    res.status(201).json({ success: true, data: notifications });
  } catch (error) {
    await prisma.$disconnect()

    return errorResponse(500, error, res);
  }
};

export {
  addNotification,
};
