import { z } from 'zod';
import { teamIdSchema, paginationSchema } from './common';

/**
 * Statistics validation schemas for query parameters
 * Used across various statistics endpoints
 */

// Time period validation schema
export const periodSchema = z
  .enum(['7d', '30d', '90d', 'all'], {
    message: "Period must be one of: '7d', '30d', '90d', 'all'",
  })
  .default('30d');

// Stats overview query schema
export const statsOverviewQuerySchema = z.object({
  period: periodSchema.optional(),
});

// Team stats query schema
export const teamStatsQuerySchema = z.object({
  period: periodSchema.optional(),
  ...paginationSchema.shape,
});

// User stats query schema
export const userStatsQuerySchema = z.object({
  period: periodSchema.optional(),
  teamId: teamIdSchema.optional(),
  ...paginationSchema.shape,
});

// Claims stats query schema
export const claimsStatsQuerySchema = z.object({
  period: periodSchema.optional(),
  teamId: teamIdSchema.optional(),
  ...paginationSchema.shape,
});

// Wages stats query schema
export const wagesStatsQuerySchema = z.object({
  period: periodSchema.optional(),
  teamId: teamIdSchema.optional(),
});

// Expenses stats query schema
export const expensesStatsQuerySchema = z.object({
  period: periodSchema.optional(),
  teamId: teamIdSchema.optional(),
  ...paginationSchema.shape,
});

// Contracts stats query schema
export const contractsStatsQuerySchema = z.object({
  period: periodSchema.optional(),
  teamId: teamIdSchema.optional(),
});

// Actions stats query schema
export const actionsStatsQuerySchema = z.object({
  period: periodSchema.optional(),
  teamId: teamIdSchema.optional(),
  ...paginationSchema.shape,
});

// Recent activity query schema
export const recentActivityQuerySchema = z.object({
  limit: z.coerce
    .number({ message: 'Limit must be a number' })
    .int('Limit must be an integer')
    .min(1, 'Limit must be at least 1')
    .max(100, 'Limit cannot exceed 100')
    .default(20),
  teamId: teamIdSchema.optional(),
});
