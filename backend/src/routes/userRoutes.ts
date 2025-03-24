import express from "express";
import {
  getNonce,
  getUser,
  updateUser,
  searchUser,
  getAllUsers,
} from "../controllers/userController";
import { authorizeUser } from "../middleware/authMiddleware";
const userRoutes = express.Router();
/**
 * @openapi
 * /nonce/{address}:
 *   get:
 *     summary: Get nonce for a user
 *     parameters:
 *       - in: path
 *         name: address
 *         required: true
 *         schema:
 *           type: string
 *         description: The user's address
 *     responses:
 *       200:
 *         description: A nonce for the user
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 nonce:
 *                   type: string
 *                   description: The nonce for the user
 *       400:
 *         description: Bad request
 *       404:
 *         description: User not found
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 nonce:
 *                   type: string
 *                   description: The nonce for the user
 */
userRoutes.get("/nonce/:address", getNonce);
userRoutes.get("/search", authorizeUser, searchUser);
userRoutes.get("/", authorizeUser, getAllUsers);
userRoutes.get("/:address", authorizeUser, getUser);
userRoutes.put("/:address", authorizeUser, updateUser);
export default userRoutes;
