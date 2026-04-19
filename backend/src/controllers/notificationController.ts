import { Request, Response } from 'express';
import { addNotification, errorResponse, prisma } from '../utils';
import {
  createBulkNotificationsBodySchema,
  updateNotificationParamsSchema,
  z,
} from '../validation';

type CreateBulkNotificationsBody = z.infer<typeof createBulkNotificationsBodySchema>;
type UpdateNotificationParams = z.infer<typeof updateNotificationParamsSchema>;

const getNotification = async (req: Request, res: Response) => {
  //check if userAddress property is set
  const callerAddress = req.address;

  try {
    //retrieve notification
    const notifications = await prisma.notification.findMany({
      where: { userAddress: callerAddress },
      orderBy: {
        createdAt: 'desc',
      },
    });

    //check if user is authorized to get notification
    if (notifications.length < 1 || callerAddress === notifications[0].userAddress) {
      //send notification
      res.status(200).json(notifications);
    } else {
      //send error
      return errorResponse(403, 'Unauthorized access', res);
    }
  } catch (error) {
    return errorResponse(500, error, res);
  }
};

const updateNotification = async (req: Request, res: Response) => {
  const { id } = req.params as unknown as UpdateNotificationParams;
  const callerAddress = req.address;

  try {
    const existing = await prisma.notification.findUnique({ where: { id } });
    if (!existing) return errorResponse(404, 'Notification not found', res);
    if (existing.userAddress !== callerAddress)
      return errorResponse(403, 'Unauthorized access', res);

    const notification = await prisma.notification.update({
      where: { id },
      data: { isRead: true },
    });
    res.status(200).json(notification);
  } catch (error) {
    return errorResponse(500, error, res);
  }
};

const createBulkNotifications = async (req: Request, res: Response) => {
  const { userIds, message, subject, resource } = req.body as CreateBulkNotificationsBody;

  try {
    const notifications = await addNotification(userIds, {
      message,
      subject,
      author: req.address,
      resource,
    });
    res.status(201).json(notifications);
  } catch (error) {
    return errorResponse(500, error, res);
  }
};

export { createBulkNotifications, getNotification, updateNotification };
