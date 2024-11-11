import request from 'supertest'
import express, { Request, Response, NextFunction } from 'express'
import { addExpenseAccountData, getExpenseAccountData } from '../teamController'
import { prisma } from "../../utils";
import { describe, it, beforeEach, expect, vi } from 'vitest'

vi.mock('../../utils') 

function setAddressMiddleware(address: string) {
  return (req: Request, res: Response, next: NextFunction) => {
    (req as any).address = address
    next()
  }
}

describe('POST /expenseAccount/:id', () => {
  const mockTeamData = { 
    id: 1, 
    ownerAddress: '0xOwnerAddress', 
    description: null, 
    name: '', 
    bankAddress: '0xBankAddress',
    votingAddress: '0xVotingAddress', 
    boardOfDirectorsAddress: '0xBoardOfDirectorsAddress', 
    expenseAccountAddress: '0xExpenseAccountAddress', 
    officerAddress: '0xOfficerAddress',
    expenseAccountEip712Address: '0xExpenseAccountEIP712Address'
  }
  const mockExpenseAccountData = {
    expenseAccountData: {
      approvedAddress: '0xApprovedAddress',
      someOtherField: 'someData'
    },
    signature: '0xSignature'
  }
  const mockMemberTeamsData = { 
    id: 1, 
    userAddress: '0xMemberAddress', 
    teamId: 1, 
    expenseAccountData: JSON.stringify(mockExpenseAccountData.expenseAccountData), 
    expenseAccountSignature: mockExpenseAccountData.signature 
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should return 403 if caller address is not the team owner', async () => {
    const app = express()
    app.use(express.json())
    app.use(setAddressMiddleware('0xDifferentAddress'))
    app.post('/expenseAccount/:id', addExpenseAccountData)
    vi.spyOn(prisma.team, 'findUnique').mockResolvedValue(mockTeamData)

    // Mount middleware with a custom address
    // app.use(setAddressMiddleware('0xDifferentAddress'))

    const response = await request(app)
      .post('/expenseAccount/1')
      .set('address', '0xDifferentAddress') // Simulate unauthorized caller
      .send(mockExpenseAccountData)

    expect(response.status).toBe(403)
    expect(response.body).toEqual({
      success: false,
      message: 'Forbidden'
    })
  })

  it('should return 201 and create data if caller is authorized', async () => {
    const app = express()
    app.use(express.json())
    app.use(setAddressMiddleware('0xOwnerAddress'))
    app.post('/expenseAccount/:id', addExpenseAccountData)
    vi.spyOn(prisma.team, 'findUnique').mockResolvedValue(mockTeamData)
    vi.spyOn(prisma.memberTeamsData, 'upsert').mockResolvedValue(mockMemberTeamsData)

    const response = await request(app)
      .post('/expenseAccount/1')
      .set('address', '0xOwnerAddress') // Simulate authorized caller
      .send(mockExpenseAccountData)

    expect(response.status).toBe(201)
    expect(response.body).toEqual({
      success: true
    })

    expect(prisma.team.findUnique).toHaveBeenCalledWith({
      where: { id: 1 }
    })

    expect(prisma.memberTeamsData.upsert).toHaveBeenCalledWith({
      where: {
        userAddress_teamId: {
          userAddress: '0xApprovedAddress',
          teamId: 1
        }
      },
      update: {
        expenseAccountData: JSON.stringify(mockExpenseAccountData.expenseAccountData),
        expenseAccountSignature: mockExpenseAccountData.signature
      },
      create: {
        userAddress: '0xApprovedAddress',
        teamId: 1,
        expenseAccountData: JSON.stringify(mockExpenseAccountData.expenseAccountData),
        expenseAccountSignature: mockExpenseAccountData.signature
      }
    })
  })

  it('should return 500 if there is a server error', async () => {
    const app = express()
    app.use(express.json())
    app.use(setAddressMiddleware('0xOwnerAddress'))
    app.post('/expenseAccount/:id', addExpenseAccountData)

    vi.spyOn(prisma.team, 'findUnique').mockRejectedValue(new Error('Server error'))

    const response = await request(app)
      .post('/expenseAccount/1')
      .set('address', '0xOwnerAddress')
      .send(mockExpenseAccountData)

    expect(response.status).toBe(500)
    expect(response.body).toEqual({
      error: "Server error",
      message: "Internal server error has occured",
      success: false,
    })
  })
})

describe('GET /expenseAccount/:id', () => {
  const app = express()
  app.use(express.json())
  app.get('/expenseAccount/:id', getExpenseAccountData)

  const mockExpenseAccountData = {
    id: 1,
    userAddress: '0xMemberAddress',
    teamId: 1,
    expenseAccountData: JSON.stringify({ approvedAddress: '0xApprovedAddress', someOtherField: 'someData' }),
    expenseAccountSignature: '0xSignature'
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should return 201 with expense account data and signature if data exists', async () => {
    // Mock the Prisma findUnique function to return the test data
    vi.spyOn(prisma.memberTeamsData, 'findUnique').mockResolvedValue(mockExpenseAccountData)

    const response = await request(app)
      .get('/expenseAccount/1')
      .set('memberaddress', '0xApprovedAddress')

    expect(response.status).toBe(201)
    expect(response.body).toEqual({
      data: mockExpenseAccountData.expenseAccountData,
      signature: mockExpenseAccountData.expenseAccountSignature
    })
  })

  it('should return 500 if there is a server error', async () => {
    // Mock findUnique to throw an error
    vi.spyOn(prisma.memberTeamsData, 'findUnique').mockRejectedValue(new Error('Database error'))

    const response = await request(app)
      .get('/expenseAccount/1')
      .set('memberaddress', '0xApprovedAddress')

    expect(response.status).toBe(500)
    expect(response.body).toEqual({
      error: "Database error",
      message: "Internal server error has occured",
      success: false,
    })
  })
})
