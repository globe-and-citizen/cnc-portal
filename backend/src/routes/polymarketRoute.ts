import express from 'express';
import { signBuilderMessage } from '../controllers/polymarketController';

const polymarketRoutes = express.Router();

polymarketRoutes.post('/sign', signBuilderMessage);

export default polymarketRoutes;