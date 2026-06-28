import { z } from 'zod'
import type { TermUnit } from './offering'
import { formatAmountWithPrecision } from '@/utils/currencyUtil'

export const offeringBasicsSchema = z.object({
  title: z.string().min(3, 'Title must be at least 3 characters'),
  principal: z
    .number({ error: 'Target amount is required' })
    .positive('Target amount must be greater than 0'),
  rate: z
    .number({ error: 'Interest rate is required' })
    .positive('Rate must be greater than 0')
    .max(100, 'Rate must be 100% or less')
})

interface OfferingTermsSchemaContext {
  today: string
  termUnit: TermUnit
  maxTerm: number
  capOn: boolean
  principal: number
}

export function createOfferingTermsSchema(context: OfferingTermsSchemaContext) {
  return z
    .object({
      startDate: z.string().min(1, 'Start date is required'),
      deadline: z.string().min(1, 'Subscription deadline is required'),
      termValue: z
        .number({ error: 'Term is required' })
        .int('Term must be a whole number')
        .positive('Term must be greater than 0'),
      cap: z.number().optional()
    })
    .refine((data) => data.startDate >= context.today, {
      message: 'Start date cannot be in the past',
      path: ['startDate']
    })
    .refine((data) => data.deadline >= context.today, {
      message: 'Subscription deadline cannot be in the past',
      path: ['deadline']
    })
    .refine((data) => new Date(data.deadline) <= new Date(data.startDate), {
      message: 'Deadline must be on or before the start date',
      path: ['deadline']
    })
    .refine((data) => data.termValue <= context.maxTerm, {
      message: `Term cannot exceed ${context.maxTerm} ${context.termUnit}`,
      path: ['termValue']
    })
    .refine((data) => !context.capOn || (typeof data.cap === 'number' && data.cap > 0), {
      message: 'Enter a maximum amount per lender',
      path: ['cap']
    })
    .refine(
      (data) => !context.capOn || typeof data.cap !== 'number' || data.cap <= context.principal,
      {
        message: 'Cap cannot exceed the principal target',
        path: ['cap']
      }
    )
}

interface OfferingAccessSchemaContext {
  cap: number | null
  principal: number
}

export function createOfferingAccessSchema(context: OfferingAccessSchemaContext) {
  return z
    .object({
      access: z.enum(['general', 'whitelist']),
      whitelist: z.array(
        z.object({
          username: z.string(),
          address: z.string(),
          amount: z.number().nullable()
        })
      )
    })
    .refine(
      (data) => data.access !== 'whitelist' || data.whitelist.every((w) => w.amount != null),
      {
        message: 'Set an amount for every whitelisted lender before publishing',
        path: ['whitelist']
      }
    )
    .refine(
      (data) =>
        context.cap == null ||
        data.whitelist.every((entry) => entry.amount == null || entry.amount <= context.cap!),
      {
        message: 'One or more lenders exceed the per-lender cap',
        path: ['whitelist']
      }
    )
    .refine(
      (data) =>
        data.access !== 'whitelist' ||
        data.whitelist.reduce((sum, entry) => sum + (entry.amount ?? 0), 0) <= context.principal,
      {
        message: 'Whitelisted allocations exceed the principal target',
        path: ['whitelist']
      }
    )
}

export function createApplyOfferingAmountSchema(remaining: number, tokenSymbol = 'Token') {
  return z.object({
    amount: z
      .number()
      .positive('Amount must be greater than 0.')
      .refine((value) => value <= remaining, {
        message: `Maximum loan amount is ${formatAmountWithPrecision(remaining, 0, 4)} ${tokenSymbol}.`
      })
  })
}
