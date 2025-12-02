import { Request } from 'express'

export interface AuthenticatedRequest extends Request {
  address?: string
}

export * from './expense-account'
