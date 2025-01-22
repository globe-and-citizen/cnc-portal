import { prisma, errorResponse } from "../utils";
import { Request, Response } from "express";

const getNotification = async (req: Request, res: Response) => {
  //check if userAddress property is set
  const callerAddress = (req as any).address;

  try {
    //retrieve notification
    let notifications = await prisma.notification.findMany({
      where: {
        userAddress: callerAddress as string,
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    //clean up
    await prisma.$disconnect();

    //check if user is authorized to get notification
    if (
      notifications.length < 1 ||
      callerAddress === notifications[0].userAddress
    ) {
      //send notification
      res.status(201).json({
        success: true,
        data: notifications,
      });
    } else {
      //send error
      return errorResponse(403, "Unauthorized access", res);
    }
  } catch (error) {
    return errorResponse(500, error, res);
  }
};

const updateNotification = async (req: Request, res: Response) => {
  let { id } = req.params;

  const _id = parseInt(id as string)

  if (isNaN(_id)) {
    return errorResponse(400, "Notification ID invalid format", res)
  }

  const callerAddress = (req as any).address

  try {
    let notification = await prisma.notification.findUnique({
      where: {
        id: _id
      }
    })

    if (
      callerAddress === notification?.userAddress
    ) {
      notification = await prisma.notification.update({
        where: {id: _id},
        data: { isRead: true }
      })

      res.status(201).json({
        success: true
      })
    } else {
      return errorResponse(403, "Unauthorized access", res);
    }
  } catch(error) {
    return errorResponse(500, error, res)
  }
}
export { 
  getNotification,
  updateNotification 
};
