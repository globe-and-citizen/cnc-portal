import { describe, it, expect, beforeEach, vi } from 'vitest'
import { Request, Response } from 'express'
import * as featureController from '../featureController'
import * as featureUtils from '../../utils/featureUtils'
import { errorResponse } from '../../utils/utils'

// Mock dependencies
vi.mock('../../utils/featureUtils')
vi.mock('../../utils/utils')

// Mock response object
const createMockResponse = (): Partial<Response> => ({
  status: vi.fn().mockReturnThis(),
  json: vi.fn().mockReturnThis(),
})

// Mock request object
const createMockRequest = (overrides = {}): Partial<Request> => ({
  params: {},
  body: {},
  ...overrides,
})

describe('Feature Controller', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

 
})
