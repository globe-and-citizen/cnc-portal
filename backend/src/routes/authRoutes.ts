import express from 'express';
import { authenticateSiwe, authenticateToken } from '../controllers/authController';
import { authorizeUser } from '../middleware/authMiddleware';
const authRoutes = express.Router();

authRoutes.post('/siwe', authenticateSiwe);
authRoutes.get('/token', authorizeUser, authenticateToken);

export default authRoutes;
