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

const getNotification = async (req: Request, res: Response) => {
  //check if userAddress property is set
  const { userAddress } = req.query
  
  if (!userAddress) return errorResponse(401, 'ID empty or not set', res)

  try {
    //retrieve notification
    let notification = await prisma.notification.findMany({
      where: {
        userAddress: userAddress as string
      }
    })

    //clean up
    await prisma.$disconnect()

    //check if user is authorized to get notification
    if (
      notification.length < 1 || 
      req.address === notification[0].userAddress
    ) {

      //send notification
      res.status(201).json({
        success: true,
        data: notification
      })
    } else {

      //send error
      return errorResponse(403, "Unauthorized access", res)
    }
  } catch (error) {
    return errorResponse(500, error, res);
  }
}

export {
  addNotification,
  getNotification
};
