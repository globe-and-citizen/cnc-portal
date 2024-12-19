import request from 'supertest'
import express, { Request, Response, NextFunction, response } from 'express'
import rateLimit from 'express-rate-limit'
import { 
  authenticateSiwe,
  authenticateToken
} from '../authController'
import { authorizeUser } from '../../middleware/authMiddleware'
import { prisma } from "../../utils";
import { errorResponse, extractAddressAndNonce } from "../../utils/utils";
import jwt from "jsonwebtoken";
import { describe, it, beforeEach, expect, vi } from 'vitest'

function setAuthorizationMiddleware(token: string) {
  return (req: Request, res: Response, next: NextFunction) => {
    req.headers.authorization = `Bearer ${token}`
    next()
  }
}

describe('authController', () => {
  describe('POST: /siwe', () => {
    const mockUser = {
      name: `Mock User`,
      address: `0x123`,
      nonce: null
    }
    beforeEach(() => {
      vi.clearAllMocks()
    })
    it('should return 401 if message not set', async () => {
      const app = express()
      app.use(express.json())
      const limiter = rateLimit({
        windowMs: 15 * 60 * 1000, // 15 minutes
        max: 100, // limit each IP to 100 requests per windowMs
      })
      app.use(limiter)
      app.post('/siwe', authenticateSiwe)
      vi.spyOn(prisma.user, 'findUnique').mockResolvedValue(null)

      const response = await request(app)
        .post('/siwe')

      expect(response.status).toBe(401)
      expect(response.body).toEqual({
        message: 'Auth error: Missing message',
        success: false
      })
    })
    it('should return 401 if signature not set', async () => {
      const app = express()
      app.use(express.json())
      const limiter = rateLimit({
        windowMs: 15 * 60 * 1000, // 15 minutes
        max: 100, // limit each IP to 100 requests per windowMs
      })
      app.use(limiter)
      app.post('/siwe', authenticateSiwe)
      vi.spyOn(prisma.user, 'findUnique').mockResolvedValue(null)

      const response = await request(app)
        .post('/siwe')
        .send({
          message: `A message`
        })

      expect(response.status).toBe(401)
      expect(response.body).toEqual({
        message: 'Auth error: Missing signature',
        success: false
      })
    })
    it('should return 401 if SIWE verification fails', async () => {
      const app = express()
      app.use(express.json())
      const limiter = rateLimit({
        windowMs: 15 * 60 * 1000, // 15 minutes
        max: 100, // limit each IP to 100 requests per windowMs
      })
      app.use(limiter)
      app.post('/siwe', authenticateSiwe)
      vi.spyOn(prisma.user, 'findUnique').mockResolvedValue(null)
      vi.spyOn(prisma.user, 'update').mockResolvedValue({...mockUser, nonce: '123abc'})
      vi.spyOn(prisma.user, 'create')
      vi.spyOn(jwt, 'sign').mockImplementation(() => 'jsonWebToken')

      const response = await request(app)
        .post('/siwe')
        .send({
          "message": `localhost:5173 wants you to sign in with your Ethereum account:\n0x70997970C51812dc3A010C7d01b50e0d17dc79C8\n\nSign in with Ethereum to the app.\n\nURI: http://localhost:5173\nVersion: 1\nChain ID: 1\nNonce: BuEqovAcm4cRvRHlx\nIssued At: 2024-12-18T11:57:47.715Z`,
          "signature": "0x162ef821f3a9fbd0d38fcad0d6f19014d031767944fe8d686166f08ce4328eda3eace9c0d57fbb0fcdb276005a3429ed54e75f67f1b0049f55ba71b646775f9f1b"
        })

      expect(response.status).toBe(401)
      expect(response.body).toEqual({
        message: 'Signature does not match address of the message.',
        success: false
      })      
      vi.restoreAllMocks()
    })
    it('should return 200 if authentication successful', async () => {
      const app = express()
      app.use(express.json())
      const limiter = rateLimit({
        windowMs: 15 * 60 * 1000, // 15 minutes
        max: 100, // limit each IP to 100 requests per windowMs
      })
      app.use(limiter)
      app.post('/siwe', authenticateSiwe)
      vi.spyOn(prisma.user, 'findUnique').mockResolvedValue(null)
      vi.spyOn(prisma.user, 'update').mockResolvedValue({...mockUser, nonce: '123abc'})
      vi.spyOn(prisma.user, 'create')
      vi.spyOn(jwt, 'sign').mockImplementation(() => 'jsonWebToken')

      const response = await request(app)
        .post('/siwe')
        .send({
          "message": `localhost:5173 wants you to sign in with your Ethereum account:\n0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266\n\nSign in with Ethereum to the app.\n\nURI: http://localhost:5173\nVersion: 1\nChain ID: 1\nNonce: BuEqovAcm4cRvRHlx\nIssued At: 2024-12-18T11:57:47.715Z`,
          "signature": "0x162ef821f3a9fbd0d38fcad0d6f19014d031767944fe8d686166f08ce4328eda3eace9c0d57fbb0fcdb276005a3429ed54e75f67f1b0049f55ba71b646775f9f1b"
        })

      expect(response.status).toBe(200)
      expect(response.body).toEqual({
        accessToken: 'jsonWebToken',
        success: true
      })
      vi.restoreAllMocks()
    })
    it('It should return 500 if internal server error occurs', async () => {
      const app = express()
      app.use(express.json())
      const limiter = rateLimit({
        windowMs: 15 * 60 * 1000, // 15 minutes
        max: 100, // limit each IP to 100 requests per windowMs
      })
      app.use(limiter)
      app.post('/siwe', authenticateSiwe)

      const response = await request(app)
        .post('/siwe')
        .send({
          "message": `Test message`,
          "signature": `0xSignature`
        })

      expect(response.status).toBe(500)
      expect(response.body).toEqual({
        error: "Extract address error: Eth address missing ",
        message: "Internal server error has occured",
        success: false
      })
    })
  })
  describe('GET: /token', () => {
    beforeEach(() => { vi.clearAllMocks() })
    it('should return 401 if user not authorised', async () => {
      const app = express()
      app.use(express.json())
      const limiter = rateLimit({
        windowMs: 15 * 60 * 1000, // 15 minutes
        max: 100, // limit each IP to 100 requests per windowMs
      })
      app.use(limiter)
      app.get('/token', authenticateToken)

      const response = await request(app)
        .get('/token')

      expect(response.status).toBe(401)
      expect(response.body).toEqual({
        message: "Unauthorized: Missing jwt payload",
        success: false
      })
    })
    it('should return 200 if authorization successful', async () => {
      // Use fake timers
      vi.useFakeTimers();

      // Set the system clock to a fixed date/time
      const fixedDate = new Date('2024-12-18T16:00:00Z');
      vi.setSystemTime(fixedDate);
      const app = express()
      app.use(express.json())
      const limiter = rateLimit({
        windowMs: 15 * 60 * 1000, // 15 minutes
        max: 100, // limit each IP to 100 requests per windowMs
      })
      app.use(limiter)
      const token = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJhZGRyZXNzIjoiMHhmMzlGZDZlNTFhYWQ4OEY2RjRjZTZhQjg4MjcyNzljZmZGYjkyMjY2IiwiaWF0IjoxNzM0NjE5NDEwLCJleHAiOjE3MzQ2MTk0MTF9.vyJb18bkxyMYw1E_ebQO5c5yPgFyUazgs4U_-guCX1U'
      app.use(setAuthorizationMiddleware(token))
      app.get('/token', authorizeUser, authenticateToken)

      const response = await request(app)
        .get('/token')
        .set('Authorization', `Bearer ${token}`)

      expect(response.status).toBe(200)
      expect(response.body).toEqual({
        success: true
      })

      // Restore the real timers
      vi.useRealTimers();
    })
  })
})