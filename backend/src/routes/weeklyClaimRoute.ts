import express from 'express';
import {
  getTeamWeeklyClaims,
  syncWeeklyClaims,
  updateWeeklyClaims,
} from '../controllers/weeklyClaimController';

const weeklyClaimRoutes = express.Router();

weeklyClaimRoutes.get('/', getTeamWeeklyClaims);
weeklyClaimRoutes.post('/sync', syncWeeklyClaims);
weeklyClaimRoutes.put('/:id', updateWeeklyClaims);

export default weeklyClaimRoutes;
