import express from "express";
import {
  getNotification,
  updateNotification,
  createBulkNotifications,
} from "../controllers/notificationController";

import { authorizeUser } from "../middleware/authMiddleware";

const notificationRoute = express.Router();

notificationRoute.get("/", authorizeUser, getNotification);
notificationRoute.put("/:id", authorizeUser, updateNotification);
notificationRoute.post("/bulk", authorizeUser, createBulkNotifications);

export default notificationRoute;
