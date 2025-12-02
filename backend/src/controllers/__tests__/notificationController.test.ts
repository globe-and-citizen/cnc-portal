import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest'
import { prisma } from '../../utils'
import { Response } from 'express'
import { getNotification, updateNotification } from '../notificationController'
import { AuthenticatedRequest } from '../../types'

interface MockResponse extends Partial<Response> {
  status: (code: number) => MockResponse
  json: (data: unknown) => MockResponse
  statusCode?: number
  data?: unknown
}

describe('Get Notification', () => {
  beforeAll(async () => {
    await prisma.$connect()
  })

  afterAll(async () => {
    await prisma.$disconnect()
  })

  it('should return notifications if user is authorized', async () => {
    const req = {
      address: '0x123'
    } as unknown as AuthenticatedRequest

    const res: MockResponse = {
      status: function (code: number) {
        res.statusCode = code
        return res
      },
      json: function (data: unknown) {
        res.data = data
        return res
      },
      data: undefined
    }

    await getNotification(req, res as Response)
  })

  it('should handle errors gracefully', async () => {
    const req = {
      address: 1
    } as unknown as AuthenticatedRequest

    const res: MockResponse = {
      status: function () {
        return res
      },
      json: function (data: unknown) {
        res.data = data
        return res
      },
      data: undefined
    }

    await getNotification(req, res as Response)
  })
})

describe('Update Notification', () => {
  beforeAll(async () => {
    await prisma.$connect()
  })

  afterAll(async () => {
    await prisma.$disconnect()
  })

  it('should update notification if user is authorized', async () => {
    const req = {
      params: {
        id: '1'
      },
      address: '0x123'
    } as unknown as AuthenticatedRequest

    const res: MockResponse = {
      status: function () {
        return res
      },
      json: function (data: unknown) {
        res.data = data
        return res
      },
      data: undefined
    }

    vi.spyOn(prisma.notification, 'findUnique').mockResolvedValue({
      id: 1,
      userAddress: '0x123',
      isRead: false,
      message: 'Test Message',
      subject: 'Test Subject',
      author: '0x345',
      createdAt: new Date(Date.now()),
      resource: null
    })
    vi.spyOn(prisma.notification, 'update').mockResolvedValue({
      id: 1,
      userAddress: '0x123',
      isRead: true,
      message: 'Test Message',
      subject: 'Test Subject',
      author: '0x345',
      createdAt: new Date(Date.now()),
      resource: null
    })

    await updateNotification(req, res as Response)

    // Clean up the mocks
    vi.restoreAllMocks()
  })

  it('should return error if notification ID is invalid', async () => {
    const req = {
      params: {
        id: 'xyz'
      },
      address: '0x123'
    } as unknown as AuthenticatedRequest

    const res: MockResponse = {
      status: function () {
        return res
      },
      json: function (data: unknown) {
        res.data = data
        return res
      },
      data: undefined
    }

    await updateNotification(req, res as Response)

    expect((res.data as { message: string }).message).toBe('Notification ID invalid format')
  })

  it('should return error if user is unauthorized', async () => {
    const req = {
      params: {
        id: '1'
      },
      address: '0x124'
    } as unknown as AuthenticatedRequest

    const res: MockResponse = {
      status: function () {
        return res
      },
      json: function (data: unknown) {
        res.data = data
        return res
      },
      data: undefined
    }

    vi.spyOn(prisma.notification, 'findUnique').mockResolvedValue({
      id: 1,
      userAddress: '0x123',
      isRead: false,
      message: 'Test Message',
      subject: 'Test Subject',
      author: '0x345',
      createdAt: new Date(Date.now()),
      resource: null
    })

    await updateNotification(req, res as Response)

    expect((res.data as { message: string }).message).toBe('Unauthorized access')

    // Clean up the mocks
    vi.restoreAllMocks()
  })

  it('should handle errors gracefully', async () => {
    const req = {
      params: {
        id: '1'
      },
      address: 1
    } as unknown as AuthenticatedRequest

    const res: MockResponse = {
      status: function () {
        return res
      },
      json: function (data: unknown) {
        res.data = data
        return res
      },
      data: undefined
    }

    await updateNotification(req, res as Response)

    // Clean up the mocks
    vi.restoreAllMocks()
  })
})
