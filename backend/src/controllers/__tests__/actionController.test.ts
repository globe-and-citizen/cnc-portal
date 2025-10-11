import request from 'supertest'
import express, { Request, Response, NextFunction } from 'express'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { prisma } from '../../utils'
import actionRoute from '../../routes/actionsRoute'

// Hoisted mock variables
const { mockAuthorizeUser } = vi.hoisted(() => ({
  mockAuthorizeUser: vi.fn((req: Request, res: Response, next: NextFunction) => {
    ;(req as any).address = '0x1234567890123456789012345678901234567890'
    next()
  })
}))

// Mock the authorizeUser middleware
vi.mock('../../middleware/authMiddleware', () => ({
  authorizeUser: mockAuthorizeUser
}))

// Mock prisma
vi.mock('../../utils', async () => {
  const actual = await vi.importActual('../../utils')
  return {
    ...actual,
    prisma: {
      boardOfDirectorActions: {
        findMany: vi.fn(),
        count: vi.fn(),
        create: vi.fn(),
        findUnique: vi.fn(),
        update: vi.fn()
      }
    }
  }
})

// Create test app with middleware
const createTestApp = () => {
  const app = express()
  app.use(express.json())
  app.use(mockAuthorizeUser)
  app.use('/actions', actionRoute)
  return app
}

// Test data
const mockUserAddress = '0x1234567890123456789012345678901234567890'

const mockAction = {
  id: 1,
  teamId: 1,
  actionId: 100,
  description: 'Test action description',
  targetAddress: '0xabcdefabcdefabcdefabcdefabcdefabcdefabcdef',
  userAddress: mockUserAddress,
  data: '0x123456789abcdef',
  isExecuted: false,
  createdAt: new Date('2023-01-01T00:00:00.000Z'),
  updatedAt: new Date('2023-01-01T00:00:00.000Z')
}

const mockActions = [
  mockAction,
  {
    ...mockAction,
    id: 2,
    actionId: 101,
    description: 'Second test action',
    isExecuted: true
  }
]

describe('Action Controller', () => {
  let app: express.Application

  beforeEach(() => {
    vi.clearAllMocks()
    app = createTestApp()
    mockAuthorizeUser.mockImplementation((req: Request, res: Response, next: NextFunction) => {
      ;(req as any).address = mockUserAddress
      next()
    })
  })

  describe('GET /actions', () => {
    it('should return actions for a valid team', async () => {
      vi.mocked(prisma.boardOfDirectorActions.findMany).mockResolvedValueOnce(mockActions)
      vi.mocked(prisma.boardOfDirectorActions.count).mockResolvedValueOnce(2)

      const response = await request(app).get('/actions').query({ teamId: '1' })

      expect(response.status).toBe(200)
      expect(response.body).toMatchObject({
        data: expect.arrayContaining([
          expect.objectContaining({
            id: 1,
            teamId: 1,
            actionId: 100,
            description: 'Test action description',
            isExecuted: false
          }),
          expect.objectContaining({
            id: 2,
            actionId: 101,
            description: 'Second test action',
            isExecuted: true
          })
        ]),
        total: 2
      })

      expect(prisma.boardOfDirectorActions.findMany).toHaveBeenCalledWith({
        where: { teamId: 1 },
        skip: 0,
        take: 10,
        orderBy: { createdAt: 'desc' }
      })
      expect(prisma.boardOfDirectorActions.count).toHaveBeenCalledWith({
        where: { teamId: 1 }
      })
    })

    it('should filter by isExecuted when provided', async () => {
      const executedActions = [mockActions[1]]
      vi.mocked(prisma.boardOfDirectorActions.findMany).mockResolvedValueOnce(executedActions)
      vi.mocked(prisma.boardOfDirectorActions.count).mockResolvedValueOnce(1)

      const response = await request(app).get('/actions').query({ teamId: '1', isExecuted: 'true' })

      expect(response.status).toBe(200)
      expect(response.body).toMatchObject({
        data: expect.arrayContaining([
          expect.objectContaining({
            id: 2,
            actionId: 101,
            description: 'Second test action',
            isExecuted: true
          })
        ]),
        total: 1
      })

      expect(prisma.boardOfDirectorActions.findMany).toHaveBeenCalledWith({
        where: { teamId: 1, isExecuted: true },
        skip: 0,
        take: 10,
        orderBy: { createdAt: 'desc' }
      })
    })

    it('should handle pagination correctly', async () => {
      vi.mocked(prisma.boardOfDirectorActions.findMany).mockResolvedValueOnce([mockAction])
      vi.mocked(prisma.boardOfDirectorActions.count).mockResolvedValueOnce(15)

      const response = await request(app)
        .get('/actions')
        .query({ teamId: '1', page: '2', take: '5' })

      expect(response.status).toBe(200)
      expect(prisma.boardOfDirectorActions.findMany).toHaveBeenCalledWith({
        where: { teamId: 1 },
        skip: 5, // (page - 1) * take = (2 - 1) * 5 = 5
        take: 5,
        orderBy: { createdAt: 'desc' }
      })
    })

    it('should return 400 when teamId is missing', async () => {
      const response = await request(app).get('/actions')

      expect(response.status).toBe(400)
      expect(response.body).toEqual({
        message: 'Team ID empty or not set'
      })
    })

    it('should return 500 on database error', async () => {
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
      vi.mocked(prisma.boardOfDirectorActions.findMany).mockRejectedValue('Database error')

      const response = await request(app).get('/actions').query({ teamId: '1' })

      expect(response.status).toBe(500)
      expect(response.body).toEqual({
        message: 'Internal server error has occured',
        error: ''
      })

      consoleErrorSpy.mockRestore()
    })
  })

  describe('POST /actions', () => {
    const validActionData = {
      teamId: '1',
      actionId: '100',
      description: 'Test action description',
      targetAddress: '0xabcdefabcdefabcdefabcdefabcdefabcdefabcdef',
      data: '0x123456789abcdef'
    }

    it('should create a new action successfully', async () => {
      vi.mocked(prisma.boardOfDirectorActions.create).mockResolvedValueOnce(mockAction)

      const response = await request(app).post('/actions').send(validActionData)

      expect(response.status).toBe(201)
      expect(response.body).toMatchObject({
        data: expect.objectContaining({
          id: 1,
          teamId: 1,
          actionId: 100,
          description: 'Test action description',
          targetAddress: '0xabcdefabcdefabcdefabcdefabcdefabcdefabcdef',
          userAddress: mockUserAddress,
          data: '0x123456789abcdef',
          isExecuted: false
        })
      })

      expect(prisma.boardOfDirectorActions.create).toHaveBeenCalledWith({
        data: {
          teamId: 1,
          actionId: 100,
          description: 'Test action description',
          targetAddress: '0xabcdefabcdefabcdefabcdefabcdefabcdefabcdef',
          userAddress: mockUserAddress,
          data: '0x123456789abcdef'
        }
      })
    })

    it('should return 400 when teamId is missing', async () => {
      const { teamId, ...incompleteData } = validActionData

      const response = await request(app).post('/actions').send(incompleteData)

      expect(response.status).toBe(400)
      expect(response.body).toEqual({
        message: 'Missing required fields'
      })
    })

    it('should return 400 when description is missing', async () => {
      const { description, ...incompleteData } = validActionData

      const response = await request(app).post('/actions').send(incompleteData)

      expect(response.status).toBe(400)
      expect(response.body).toEqual({
        message: 'Missing required fields'
      })
    })

    it('should return 400 when targetAddress is missing', async () => {
      const { targetAddress, ...incompleteData } = validActionData

      const response = await request(app).post('/actions').send(incompleteData)

      expect(response.status).toBe(400)
      expect(response.body).toEqual({
        message: 'Missing required fields'
      })
    })

    it('should return 400 when data is missing', async () => {
      const { data, ...incompleteData } = validActionData

      const response = await request(app).post('/actions').send(incompleteData)

      expect(response.status).toBe(400)
      expect(response.body).toEqual({
        message: 'Missing required fields'
      })
    })

    it('should return 500 on database error', async () => {
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
      vi.mocked(prisma.boardOfDirectorActions.create).mockRejectedValue('Database error')

      const response = await request(app).post('/actions').send(validActionData)

      expect(response.status).toBe(500)
      expect(response.body).toEqual({
        message: 'Internal server error has occured',
        error: ''
      })

      consoleErrorSpy.mockRestore()
    })
  })

  describe('PATCH /actions/:id', () => {
    it('should execute action successfully', async () => {
      vi.mocked(prisma.boardOfDirectorActions.findUnique).mockResolvedValueOnce(mockAction)
      vi.mocked(prisma.boardOfDirectorActions.update).mockResolvedValueOnce({
        ...mockAction,
        isExecuted: true
      })

      const response = await request(app).patch('/actions/1')

      expect(response.status).toBe(200)
      expect(response.body).toEqual({})

      expect(prisma.boardOfDirectorActions.findUnique).toHaveBeenCalledWith({
        where: { id: 1 }
      })
      expect(prisma.boardOfDirectorActions.update).toHaveBeenCalledWith({
        where: { id: 1 },
        data: { isExecuted: true }
      })
    })

    it('should return 400 when action ID is missing', async () => {
      const response = await request(app).patch('/actions/')

      expect(response.status).toBe(404) // Express returns 404 for missing route params
    })

    it('should return 404 when action is not found', async () => {
      vi.mocked(prisma.boardOfDirectorActions.findUnique).mockResolvedValueOnce(null)

      const response = await request(app).patch('/actions/999')

      expect(response.status).toBe(404)
      expect(response.body).toEqual({
        message: 'Action not found'
      })

      expect(prisma.boardOfDirectorActions.findUnique).toHaveBeenCalledWith({
        where: { id: 999 }
      })
      expect(prisma.boardOfDirectorActions.update).not.toHaveBeenCalled()
    })

    it('should return 500 on database error during findUnique', async () => {
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
      vi.mocked(prisma.boardOfDirectorActions.findUnique).mockRejectedValue('Database error')

      const response = await request(app).patch('/actions/1')

      expect(response.status).toBe(500)
      expect(response.body).toEqual({
        message: 'Internal server error has occured',
        error: ''
      })

      consoleErrorSpy.mockRestore()
    })

    it('should return 500 on database error during update', async () => {
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
      vi.mocked(prisma.boardOfDirectorActions.findUnique).mockResolvedValueOnce(mockAction)
      vi.mocked(prisma.boardOfDirectorActions.update).mockRejectedValue('Database error')

      const response = await request(app).patch('/actions/1')

      expect(response.status).toBe(500)
      expect(response.body).toEqual({
        message: 'Internal server error has occured',
        error: ''
      })

      consoleErrorSpy.mockRestore()
    })
  })

  describe('Authorization', () => {
    it('should include user address from middleware in created actions', async () => {
      const customUserAddress = '0x9999999999999999999999999999999999999999'

      mockAuthorizeUser.mockImplementation((req: Request, res: Response, next: NextFunction) => {
        ;(req as any).address = customUserAddress
        next()
      })

      vi.mocked(prisma.boardOfDirectorActions.create).mockResolvedValueOnce({
        ...mockAction,
        userAddress: customUserAddress
      })

      const validActionData = {
        teamId: '1',
        actionId: '100',
        description: 'Test action description',
        targetAddress: '0xabcdefabcdefabcdefabcdefabcdefabcdefabcdef',
        data: '0x123456789abcdef'
      }

      const response = await request(app).post('/actions').send(validActionData)

      expect(response.status).toBe(201)
      expect(prisma.boardOfDirectorActions.create).toHaveBeenCalledWith({
        data: {
          teamId: 1,
          actionId: 100,
          description: 'Test action description',
          targetAddress: '0xabcdefabcdefabcdefabcdefabcdefabcdefabcdef',
          userAddress: customUserAddress,
          data: '0x123456789abcdef'
        }
      })
    })
  })

  describe('Edge Cases', () => {
    it('should handle string numbers correctly in pagination', async () => {
      vi.mocked(prisma.boardOfDirectorActions.findMany).mockResolvedValueOnce([mockAction])
      vi.mocked(prisma.boardOfDirectorActions.count).mockResolvedValueOnce(1)

      const response = await request(app)
        .get('/actions')
        .query({ teamId: '1', page: '1', take: '20' })

      expect(response.status).toBe(200)
      expect(prisma.boardOfDirectorActions.findMany).toHaveBeenCalledWith({
        where: { teamId: 1 },
        skip: 0,
        take: 20,
        orderBy: { createdAt: 'desc' }
      })
    })

    it('should handle isExecuted false filter', async () => {
      const unexecutedActions = [mockActions[0]]
      vi.mocked(prisma.boardOfDirectorActions.findMany).mockResolvedValueOnce(unexecutedActions)
      vi.mocked(prisma.boardOfDirectorActions.count).mockResolvedValueOnce(1)

      const response = await request(app)
        .get('/actions')
        .query({ teamId: '1', isExecuted: 'false' })

      expect(response.status).toBe(200)
      expect(prisma.boardOfDirectorActions.findMany).toHaveBeenCalledWith({
        where: { teamId: 1, isExecuted: false },
        skip: 0,
        take: 10,
        orderBy: { createdAt: 'desc' }
      })
    })

    it('should default to page 1 and take 10 when pagination params are missing', async () => {
      vi.mocked(prisma.boardOfDirectorActions.findMany).mockResolvedValueOnce([mockAction])
      vi.mocked(prisma.boardOfDirectorActions.count).mockResolvedValueOnce(1)

      const response = await request(app).get('/actions').query({ teamId: '1' })

      expect(response.status).toBe(200)
      expect(prisma.boardOfDirectorActions.findMany).toHaveBeenCalledWith({
        where: { teamId: 1 },
        skip: 0,
        take: 10,
        orderBy: { createdAt: 'desc' }
      })
    })
  })
})
