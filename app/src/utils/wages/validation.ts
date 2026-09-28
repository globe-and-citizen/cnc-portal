import { z } from 'zod'

const hourlyRateSchema = z.object({
  type: z.enum(['native', 'usdc', 'sher', 'usdc.e']),
  amount: z.coerce.number(),
  enabled: z.boolean()
})

const requirePositiveEnabledRate = (label: string) =>
  z.array(hourlyRateSchema).superRefine((rates, ctx) => {
    if (rates.some((rate) => rate.enabled && rate.amount > 0)) return

    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: [],
      message: `Enable at least one ${label} rate with a positive amount`
    })
  })

export const standardWageFormSchema = z.object({
  maximumHoursPerWeek: z.coerce
    .number()
    .int('Must be a whole number')
    .positive('Max weekly hours must be greater than 0')
    .max(40, 'Maximum regular hours per week cannot exceed 40 hours'),
  maximumHoursPerDay: z.coerce
    .number()
    .int('Must be a whole number')
    .positive('Max daily hours must be greater than 0')
    .max(24, 'Maximum hours per day cannot exceed 24 hours'),
  ratePerHour: requirePositiveEnabledRate('standard')
})

export const overtimeWageFormSchema = z.object({
  maximumOvertimeHoursPerWeek: z.coerce
    .number()
    .int('Must be a whole number')
    .positive('Overtime hours must be greater than 0')
    .max(20, 'Maximum overtime hours per week cannot exceed 20 hours'),
  overtimeRatePerHour: requirePositiveEnabledRate('overtime')
})
