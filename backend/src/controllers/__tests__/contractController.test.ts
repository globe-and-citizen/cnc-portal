import request from 'supertest'
import express, { Request, Response, NextFunction } from 'express'
import { describe, vi, beforeEach, it, expect } from 'vitest'
import { prisma } from '../../utils'
import { addContract, getContracts, syncContracts } from '../contractController'
import { Team } from '@prisma/client'
import { faker } from '@faker-js/faker'
import publicClient from '../../utils/viem.config'
import { AuthenticatedRequest } from '../../types'

function setAddressMiddleware(address: string) {
  return (req: Request, res: Response, next: NextFunction) => {
    ;(req as AuthenticatedRequest).address = address
    next()
  }
}
const app = express()
app.use(express.json())
app.put('/team/contract/sync', setAddressMiddleware('0xOwnerAddress'), syncContracts)
app.post('/team/contract', setAddressMiddleware('0xOwnerAddress'), addContract)
app.get('/team/contract', getContracts)

const mockTeam = {
  id: 1,
  name: 'TeamName',
  ownerAddress: '0xOwnerAddress',
  description: null,
  createdAt: new Date(),
  updatedAt: new Date()
} as Team

describe('contractController', () => {
  describe('PUT: /team/contract/sync', () => {
    beforeEach(() => {
      vi.clearAllMocks()
    })

    it('should return 400 if required field are  or invalid', async () => {
      const response = await request(app).put('/team/contract/sync')
      expect(response.status).toBe(400)
      expect(response.body.message).toContain('Missing or invalid field: teamId')

      const responseV2 = await request(app).put('/team/contract/sync').send({ teamId: 'invalid' })

      expect(responseV2.status).toBe(400)
      expect(responseV2.body.message).toContain('Missing or invalid field: teamId')
    })

    it('should return 404 if team not found', async () => {
      vi.spyOn(prisma.team, 'findUnique').mockResolvedValue(null)
      const response = await request(app).put('/team/contract/sync').send({ teamId: 1 })
      expect(response.status).toBe(404)
      expect(response.body.message).toContain('Team not found')
    })

    it('should return 403 if caller is not the owner of the team', async () => {
      vi.spyOn(prisma.team, 'findUnique').mockResolvedValue({
        ...mockTeam,
        ownerAddress: '0x456'
      })
      const response = await request(app).put('/team/contract/sync').send({ teamId: 1 })
      expect(response.status).toBe(403)
      expect(response.body.message).toContain('Unauthorized: Caller is not the owner of the team')
    })

    it('should return 400 if no contracts are created', async () => {
      vi.spyOn(prisma.team, 'findUnique').mockResolvedValue(mockTeam)
      // mock readContract
      vi.spyOn(publicClient, 'readContract').mockResolvedValue([
        { contractType: 'Voting', contractAddress: '0x123' }
      ])
      // mock createMany
      vi.spyOn(prisma.teamContract, 'createMany').mockResolvedValue({
        count: 0
      })

      const response = await request(app).put('/team/contract/sync').send({ teamId: 1 })
      expect(response.status).toBe(400)
      expect(response.body.message).toContain('No new contracts Created')
    })

    it('should return 200 if contracts are found', async () => {
      vi.spyOn(prisma.team, 'findUnique').mockResolvedValue(mockTeam)
      // mock readContract
      vi.spyOn(publicClient, 'readContract').mockResolvedValue([
        { contractType: 'Voting', contractAddress: '0x123' }
      ])
      // mock createMany
      vi.spyOn(prisma.teamContract, 'createMany').mockResolvedValue({
        count: 1
      })

      const response = await request(app).put('/team/contract/sync').send({ teamId: 1 })
      expect(response.status).toBe(200)
      expect(response.body).toEqual({ count: 1 })
    })

    it('should return 500 if internal server error', async () => {
      vi.spyOn(prisma.team, 'findUnique').mockRejectedValue('Server error')
      const response = await request(app).put('/team/contract/sync').send({ teamId: 1 })
      expect(response.status).toBe(500)
      expect(response.body.message).toContain('Internal server error')
    })
  })

  describe('GET: /team/contract', () => {
    it('should return 400 if teamId is invalid', async () => {
      const response = await request(app).get('/team/contract').query({ teamId: 'abc' })
      expect(response.status).toBe(400)
      expect(response.body.message).toBe('Invalid or missing teamId')
    })

    it('should return 404 if no contracts are found', async () => {
      vi.spyOn(prisma.teamContract, 'findMany').mockResolvedValue([])
      const response = await request(app).get('/team/contract').query({ teamId: 1 })
      expect(response.status).toBe(404)
      expect(response.body.message).toBe('Team or contracts not found')
    })

    it('should return 200 and list contracts for a team', async () => {
      vi.spyOn(prisma.teamContract, 'findMany').mockResolvedValue([
        {
          id: 1,
          teamId: 1,
          address: '0x123',
          type: 'Voting',
          deployer: '0xOwnerAddress',
          createdAt: new Date(),
          updatedAt: new Date(),
          admins: []
        }
      ])
      const response = await request(app).get('/team/contract').query({ teamId: 1 })
      expect(response.status).toBe(200)
      expect(response.body).toBeInstanceOf(Array)
      expect(response.body[0]).toHaveProperty('id')
    })

    it('should return 500 if an error occurs', async () => {
      vi.spyOn(prisma.teamContract, 'findMany').mockRejectedValue('Error')
      const response = await request(app).get('/team/contract').query({ teamId: 1 })
      expect(response.status).toBe(500)
      expect(response.body.message).toBe('Internal server error has occured')
    })
  })

  describe('POST: /team/contract', () => {
    it('should return 400 if required fields are missing', async () => {
      const response = await request(app).post('/team/contract').send({})
      expect(response.status).toBe(400)
      expect(response.body.message).toContain('Contract address and type are required')
    })

    it('should return 400 if contract address is invalid', async () => {
      const response = await request(app).post('/team/contract').send({
        teamId: 1,
        contractAddress: 'invalid',
        contractType: 'Voting'
      })
      expect(response.status).toBe(400)
      expect(response.body.message).toContain('Invalid contract address')
    })

    it('should return 400 if contract type is invalid', async () => {
      // mock isAddress
      // vi.spyOn()
      const response = await request(app).post('/team/contract').send({
        teamId: 1,
        contractAddress: faker.finance.ethereumAddress(),
        contractType: 'InvalidType'
      })
      expect(response.status).toBe(400)
      expect(response.body.message).toContain('Invalid contract type')
    })

    it('should return 404 if team is not found', async () => {
      vi.spyOn(prisma.team, 'findUnique').mockResolvedValue(null)
      const response = await request(app).post('/team/contract').send({
        teamId: 1,
        contractAddress: faker.finance.ethereumAddress(),
        contractType: 'Voting'
      })
      expect(response.status).toBe(404)
      expect(response.body.message).toContain('Team not found')
    })

    it('should return 403 if caller is not the owner of the team', async () => {
      vi.spyOn(prisma.team, 'findUnique').mockResolvedValue({
        ...mockTeam,
        ownerAddress: '0x456'
      })
      const response = await request(app).post('/team/contract').send({
        teamId: 1,
        contractAddress: faker.finance.ethereumAddress(),
        contractType: 'Voting'
      })
      expect(response.status).toBe(403)
      expect(response.body.message).toContain('Unauthorized: Caller is not the owner of the team')
    })

    it('should return 200 and create a contract successfully', async () => {
      vi.spyOn(prisma.team, 'findUnique').mockResolvedValue(mockTeam)
      vi.spyOn(prisma.teamContract, 'create').mockResolvedValue({
        id: 1,
        teamId: 1,
        address: '0x123',
        type: 'Voting',
        deployer: '0xOwnerAddress',
        createdAt: new Date(),
        updatedAt: new Date(),
        admins: []
      })
      const response = await request(app).post('/team/contract').send({
        teamId: 1,
        contractAddress: faker.finance.ethereumAddress(),
        contractType: 'Voting'
      })
      expect(response.status).toBe(200)
      expect(response.body).toHaveProperty('id')
    })

    it('should return 500 if an error occurs', async () => {
      vi.spyOn(prisma.team, 'findUnique').mockRejectedValue('Test')
      const response = await request(app).post('/team/contract').send({
        teamId: 1,
        contractAddress: faker.finance.ethereumAddress(),
        contractType: 'Voting'
      })
      expect(response.status).toBe(500)
      expect(response.body.message).toBe('Internal server error has occured')
    })
  })
})
