import express from 'express';
import { authorizeUser } from '../middleware/authMiddleware';
import { addAction, executeAction, getActions } from '../controllers/actionController';

const actionRoute = express.Router();

actionRoute.get('/', authorizeUser, getActions);
actionRoute.post('/', authorizeUser, addAction);
actionRoute.patch('/:id', authorizeUser, executeAction);

export default actionRoute;
