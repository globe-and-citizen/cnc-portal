import express from 'express'
import {
  addTeam,
  updateTeam,
  deleteTeam,
  getTeam,
  getAllTeams
} from '../controllers/teamController'

import { deleteMember, addMembers } from '../controllers/memberController'
const teamRoutes = express.Router()

// Team CRUD routes
teamRoutes.post('/', addTeam)
teamRoutes.get('/', getAllTeams)
teamRoutes.get('/:id', getTeam)
teamRoutes.put('/:id', updateTeam)
teamRoutes.delete('/:id', deleteTeam)

// Team Members CRUD routes
teamRoutes.post('/:id/member', addMembers)
teamRoutes.delete('/:id/member/:memberAddress', deleteMember)

export default teamRoutes
