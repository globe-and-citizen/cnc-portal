import request from 'supertest'
import express, { Request, Response, NextFunction } from 'express'
import userRoutes from '../../routes/userRoutes'
import { prisma } from '../../utils'
import { describe, it, beforeEach, expect, vi } from 'vitest'
import { User } from '@prisma/client'
import { de, faker } from '@faker-js/faker'

vi.mock('../../utils')
vi.mock('../../utils/viem.config')

// Mock the authorization middleware with proper hoisting
vi.mock('../../middleware/authMiddleware', () => ({
  authorizeUser: vi.fn((req: Request, res: Response, next: NextFunction) => {
    // Default behavior - can be overridden in tests
    ;(req as any).address = '0x1234567890123456789012345678901234567890'
    next()
  })
}))

// Import the mocked function after mocking
import { authorizeUser } from '../../middleware/authMiddleware'
const mockAuthorizeUser = vi.mocked(authorizeUser)

const app = express()
app.use(express.json())
// Use the actual userRoutes from the routes file
app.use('/', userRoutes)

const mockUser: User = {
  id: 1,
  address: '0x1234567890123456789012345678901234567890',
  name: 'MemberName',
  nonce: 'nonce123',
  imageUrl: 'https://example.com/image.jpg',
  createdAt: new Date(),
  updatedAt: new Date()
} as User

const mockUsers = [
  {
    id: 1,
    name: 'Alice',
    address: '0x1111111111111111111111111111111111111111',
    nonce: 'nonce123',
    imageUrl: 'https://example.com/image.jpg',
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    id: 2,
    name: 'Bob',
    address: '0x2222222222222222222222222222222222222222',
    nonce: 'nonce456',
    imageUrl: 'https://example.com/image2.jpg',
    createdAt: new Date(),
    updatedAt: new Date()
  }
]

const mockAddress = faker.finance.ethereumAddress()

describe('User Controller', () => {
  describe('GET: /nonce/:address', () => {
    beforeEach(() => {
      vi.clearAllMocks()
      // Reset to default behavior
      mockAuthorizeUser.mockImplementation((req: Request, res: Response, next: NextFunction) => {
        ;(req as any).address = '0x1234567890123456789012345678901234567890'
        next()
      })
    })

    it('should return 400 if address is invalid', async () => {
      vi.spyOn(prisma.user, 'findUnique').mockResolvedValue(null)

      const response = await request(app).get('/nonce/invalid-address').send({})

      expect(response.status).toBe(400)
      expect(response.body.message).toContain('Invalid path parameters')
      expect(response.body.message).toContain('Invalid Ethereum address format')
    })

    it('should return a nonce if user does not exist', async () => {
      vi.spyOn(prisma.user, 'findUnique').mockResolvedValue(null)

      const response = await request(app).get(`/nonce/${mockAddress}`).send()

      expect(response.status).toBe(200)
      expect(response.body).toEqual({
        success: true,
        nonce: expect.any(String)
      })
    })

    it("should return the user's nonce if user exists", async () => {
      vi.spyOn(prisma.user, 'findUnique').mockResolvedValue(mockUser)

      const response = await request(app).get(`/nonce/${mockAddress}`).send()

      expect(response.status).toBe(200)
      expect(response.body).toEqual({
        success: true,
        nonce: mockUser.nonce
      })
    })

    it('should return 500 if an error occurs', async () => {
      vi.spyOn(prisma.user, 'findUnique').mockRejectedValue(new Error('Error'))

      const response = await request(app).get(`/nonce/${mockAddress}`).send()

      expect(response.status).toBe(500)
      expect(response.body.message).toEqual('Internal server error has occured')
    })
  })

  describe('getUser', () => {
    beforeEach(() => {
      vi.clearAllMocks()
      // Reset to default behavior
      mockAuthorizeUser.mockImplementation((req: Request, res: Response, next: NextFunction) => {
        ;(req as any).address = '0x1234567890123456789012345678901234567890'
        next()
      })
    })

    it('should return 400 if address is invalid', async () => {
      vi.spyOn(prisma.user, 'findUnique').mockResolvedValue(null)

      const response = await request(app).get('/invalid-address').send()

      expect(response.status).toBe(400)
      expect(response.body.message).toContain('Invalid path parameters')
      expect(response.body.message).toContain('Invalid Ethereum address format')
    })

    it('should return 404 if user is not found', async () => {
      vi.spyOn(prisma.user, 'findUnique').mockResolvedValue(null)

      const response = await request(app).get(`/${mockAddress}`).send()

      expect(response.status).toBe(404)
      expect(response.body.message).toEqual('User not found')
    })

    it('should return 200 and the user if found', async () => {
      vi.spyOn(prisma.user, 'findUnique').mockResolvedValue(mockUser)

      const response = await request(app).get(`/${mockUser.address}`).send()

      expect(response.status).toBe(200)
      expect(response.body).toEqual({
        id: mockUser.id,
        address: mockUser.address,
        name: mockUser.name,
        nonce: mockUser.nonce,
        imageUrl: mockUser.imageUrl,
        createdAt: mockUser.createdAt.toISOString(),
        updatedAt: mockUser.updatedAt.toISOString()
      })
    })

    it('should return 500 if an error occurs', async () => {
      vi.spyOn(prisma.user, 'findUnique').mockRejectedValue(new Error('Error'))

      const response = await request(app).get('/0x1234567890123456789012345678901234567890').send({
        address: '0x1111111111111111111111111111111111111111'
      })

      expect(response.status).toBe(500)
      expect(response.body.message).toEqual('Internal server error has occured')
    })
  })

  describe('updateUser', () => {
    beforeEach(() => {
      vi.clearAllMocks()
      // Reset to default behavior
      mockAuthorizeUser.mockImplementation((req: Request, res: Response, next: NextFunction) => {
        ;(req as any).address = '0x1234567890123456789012345678901234567890'
        next()
      })
    })

    it('should return 400 if caller address is missing', async () => {
      // Mock auth middleware to not set address
      mockAuthorizeUser.mockImplementation((req: Request, res: Response, next: NextFunction) => {
        // Don't set address to simulate missing caller address
        next()
      })

      const response = await request(app).put('/0x1234567890123456789012345678901234567890').send({
        name: 'NewName',
        imageUrl: 'https://example.com/newimage.jpg'
      })

      expect(response.status).toBe(401)
      expect(response.body.message).toEqual('Update user error: Missing user address')
    })

    it('should return 403 if caller is not the user', async () => {
      // Mock auth middleware with different caller address
      mockAuthorizeUser.mockImplementation((req: Request, res: Response, next: NextFunction) => {
        ;(req as any).address = '0x9999999999999999999999999999999999999999' // Different caller
        next()
      })

      vi.spyOn(prisma.user, 'findUnique').mockResolvedValue(mockUser)

      const response = await request(app).put(`/${mockUser.address}`).send({
        name: 'NewName',
        imageUrl: 'https://example.com/newimage.jpg'
      })

      expect(response.status).toBe(403)
      expect(response.body.message).toEqual('Unauthorized')
    })

    it('should return 404 if user is not found', async () => {
      vi.spyOn(prisma.user, 'findUnique').mockResolvedValue(null)

      const response = await request(app).put('/0x1234567890123456789012345678901234567890').send({
        name: 'NewName',
        imageUrl: 'https://example.com/newimage.jpg'
      })

      expect(response.status).toBe(404)
      expect(response.body.message).toEqual('User not found')
    })

    it('should return 200 and the user if found', async () => {
      vi.spyOn(prisma.user, 'findUnique').mockResolvedValue(mockUser)

      const updatedUser = {
        ...mockUser,
        name: 'NewName',
        imageUrl: 'https://example.com/newimage.jpg',
        updatedAt: new Date() // simulate update timestamp
      }

      vi.spyOn(prisma.user, 'update').mockResolvedValue(updatedUser)

      const response = await request(app).put('/0x1234567890123456789012345678901234567890').send({
        name: 'NewName',
        imageUrl: 'https://example.com/newimage.jpg'
      })

      expect(response.status).toBe(200)
      expect(response.body).toEqual({
        id: updatedUser.id,
        address: updatedUser.address,
        name: 'NewName',
        nonce: updatedUser.nonce,
        imageUrl: 'https://example.com/newimage.jpg',
        createdAt: updatedUser.createdAt.toISOString(),
        updatedAt: updatedUser.updatedAt.toISOString()
      })
    })

    it('should return 500 if an error occurs', async () => {
      vi.spyOn(prisma.user, 'findUnique').mockRejectedValue(new Error('Error'))

      const response = await request(app).put('/0x1234567890123456789012345678901234567890').send({
        name: 'NewName',
        imageUrl: 'https://example.com/newimage.jpg'
      })

      expect(response.status).toBe(500)
      expect(response.body.message).toEqual('Internal server error has occured')
    })
  })

  describe('getAllUsers', () => {
    beforeEach(() => {
      vi.clearAllMocks()
      // Reset to default behavior
      mockAuthorizeUser.mockImplementation((req: Request, res: Response, next: NextFunction) => {
        ;(req as any).address = '0x1234567890123456789012345678901234567890'
        next()
      })
    })

    it('should return 200 and paginated users data', async () => {
      const totalUsers = 20
      const page = 1
      const limit = 10

      vi.spyOn(prisma.user, 'findMany').mockResolvedValue(mockUsers)
      vi.spyOn(prisma.user, 'count').mockResolvedValue(totalUsers)

      const response = await request(app).get(`/?page=${page}&limit=${limit}`).send()

      expect(response.status).toBe(200)
      expect(response.body).toEqual({
        users: mockUsers.map((user) => ({
          ...user,
          createdAt: user.createdAt.toISOString(),
          updatedAt: user.updatedAt.toISOString()
        })),
        totalUsers,
        currentPage: page,
        totalPages: Math.ceil(totalUsers / limit)
      })
    })

    it('should return 500 if an error occurs', async () => {
      vi.spyOn(prisma.user, 'findMany').mockRejectedValue(new Error('Error'))

      const response = await request(app).get('/').send()

      expect(response.status).toBe(500)
      expect(response.body.message).toEqual('Internal server error has occured')
    })
  })

  describe('searchUser', () => {
    beforeEach(() => {
      vi.clearAllMocks()
      // Reset to default behavior
      mockAuthorizeUser.mockImplementation((req: Request, res: Response, next: NextFunction) => {
        ;(req as any).address = '0x1234567890123456789012345678901234567890'
        next()
      })
    })

    it('should return 400 if neither name nor address is provided', async () => {
      vi.spyOn(prisma.user, 'findUnique').mockResolvedValue(null)

      const response = await request(app).get('/search').send({
        address: ''
      })

      expect(response.status).toBe(400)
      expect(response.body.message).toContain('Invalid query parameters')
      expect(response.body.message).toContain('Either name or address must be provided')
    })

    it('should return 200 and matched users', async () => {
      vi.spyOn(prisma.user, 'findMany').mockResolvedValue(mockUsers)

      const response = await request(app)
        .get('/search')
        .query({ address: '0x1111111111111111111111111111111111111111' })

      const expectedUsers = mockUsers.map((user) => ({
        ...user,
        createdAt: user.createdAt.toISOString(),
        updatedAt: user.updatedAt.toISOString()
      }))

      expect(response.status).toBe(200)
      expect(response.body).toEqual({
        success: true,
        users: expectedUsers
      })
    })

    it('should rerturn 500 if an error occurs', async () => {
      vi.spyOn(prisma.user, 'findMany').mockRejectedValue(new Error('Error'))

      const response = await request(app)
        .get('/search')
        .query({ address: '0x1111111111111111111111111111111111111111' })

      expect(response.status).toBe(500)
      expect(response.body.message).toEqual('Internal server error has occured')
    })
  })
})
