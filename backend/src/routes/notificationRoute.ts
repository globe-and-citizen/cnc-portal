import express from "express";
import {
  getNotification,
  updateNotification,
  addNotifications,
} from "../controllers/notificationController";

import { authorizeUser } from "../middleware/authMiddleware";

const notificationRoute = express.Router();

notificationRoute.get("/", authorizeUser, getNotification);
notificationRoute.put("/:id", authorizeUser, updateNotification);
notificationRoute.post("/", authorizeUser, addNotifications);

export default notificationRoute;
