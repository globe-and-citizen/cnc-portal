import express from "express";
import { getNotification } from '../controllers/notificationController';
import { authorizeUser } from "../middleware/authMiddleware";

const notificationRoute = express.Router()

notificationRoute.get('/', authorizeUser, getNotification)

export default notificationRoute