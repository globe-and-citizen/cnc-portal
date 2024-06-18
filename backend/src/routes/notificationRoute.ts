import express from "express";
import { getNotification, updateNotification } from '../controllers/notificationController';
import { authorizeUser } from "../middleware/authMiddleware";

const notificationRoute = express.Router()

notificationRoute.get('/', authorizeUser, getNotification)
notificationRoute.put('/', authorizeUser, updateNotification)

export default notificationRoute