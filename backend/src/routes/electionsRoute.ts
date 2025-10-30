import express from 'express';
import { addElectionNotifications } from '../controllers/electionsController';

// import { authorizeUser } from "../middleware/authMiddleware";

const electionRoute = express.Router();

electionRoute.post('/:teamId', addElectionNotifications);

export default electionRoute;
