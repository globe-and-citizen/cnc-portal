import { z } from 'zod'

/**
 * Zod v4 Best Practices Utilities
 * This file contains advanced validation patterns and utilities for better type safety and performance
 */

/**
 * Advanced validation schemas using Zod v4 features
 */

// Enhanced enum schema with fallback and better error handling
export const createEnumWithFallback = <T extends readonly [string, ...string[]]>(
  values: T,
  fallback: T[number],
  customMessage?: string
) => {
  return z.string().transform((val) => {
    if (values.includes(val as T[number])) {
      return val as T[number]
    }
    return fallback
  })
}

// Performance-optimized schema for large objects
export const createOptimizedObjectSchema = <T extends z.ZodRawShape>(
  shape: T,
  options?: {
    strict?: boolean
    passthrough?: boolean
    strip?: boolean
  }
) => {
  let schema = z.object(shape)

  if (options?.strict) {
    schema = schema.strict()
  } else if (options?.passthrough) {
    schema = schema.passthrough()
  } else if (options?.strip) {
    schema = schema.strip()
  }

  return schema
}

// Async validation schema
export const createAsyncValidationSchema = <T extends z.ZodTypeAny>(
  schema: T,
  asyncValidator: (data: z.infer<T>) => Promise<boolean>,
  errorMessage: string = 'Async validation failed'
) => {
  return schema.refine(async (data) => await asyncValidator(data), {
    message: errorMessage
  })
}

// Transform schema for data preprocessing
export const createTransformSchema = <TInput, TOutput>(
  inputSchema: z.ZodType<TInput>,
  transformer: (data: TInput) => TOutput | Promise<TOutput>
) => {
  return inputSchema.transform(transformer)
}

// Refined schema with multiple validation rules
export const createMultiRefinedSchema = <T extends z.ZodTypeAny>(
  baseSchema: T,
  refinements: Array<{
    predicate: (data: z.infer<T>) => boolean | Promise<boolean>
    message: string
    path?: (string | number)[]
  }>
) => {
  return refinements.reduce(
    (schema, refinement) =>
      schema.refine(refinement.predicate, {
        message: refinement.message,
        path: refinement.path
      }),
    baseSchema
  )
}

/**
 * Type inference utilities for better TypeScript integration
 */

// Infer input and output types
export type InferInput<T extends z.ZodTypeAny> = z.input<T>
export type InferOutput<T extends z.ZodTypeAny> = z.output<T>

// Create type-safe API handler types
export type ApiHandler<
  TBody extends z.ZodTypeAny = z.ZodVoid,
  TQuery extends z.ZodTypeAny = z.ZodVoid,
  TParams extends z.ZodTypeAny = z.ZodVoid,
  TResponse = unknown
> = {
  body?: TBody
  query?: TQuery
  params?: TParams
  handler: (data: {
    body: z.infer<TBody>
    query: z.infer<TQuery>
    params: z.infer<TParams>
  }) => Promise<TResponse> | TResponse
}

/**
 * Performance monitoring utilities
 */

// Schema validation performance tracker
export const createPerformanceTrackedSchema = <T extends z.ZodTypeAny>(schema: T, name: string) => {
  return schema.transform((data) => {
    const start = performance.now()
    const result = data
    const end = performance.now()
    console.debug(`Schema ${name} validation took ${end - start}ms`)
    return result
  })
}

/**
 * Caching utilities for expensive validations
 */

// Simple LRU cache for schema validation results
class ValidationCache<T> {
  private cache = new Map<string, { data: T; timestamp: number }>()
  private maxSize: number
  private ttl: number

  constructor(maxSize = 100, ttl = 5 * 60 * 1000) {
    // 5 minutes default TTL
    this.maxSize = maxSize
    this.ttl = ttl
  }

  get(key: string): T | undefined {
    const item = this.cache.get(key)
    if (!item) return undefined

    if (Date.now() - item.timestamp > this.ttl) {
      this.cache.delete(key)
      return undefined
    }

    return item.data
  }

  set(key: string, data: T): void {
    if (this.cache.size >= this.maxSize) {
      const firstKey = this.cache.keys().next().value
      if (firstKey !== undefined) {
        this.cache.delete(firstKey)
      }
    }

    this.cache.set(key, { data, timestamp: Date.now() })
  }
}

// Create cached validation schema
export const createCachedValidationSchema = <T extends z.ZodTypeAny>(
  schema: T,
  cacheOptions?: { maxSize?: number; ttl?: number }
) => {
  const cache = new ValidationCache<z.infer<T>>(cacheOptions?.maxSize, cacheOptions?.ttl)

  return schema.transform((data) => {
    const key = JSON.stringify(data)
    const cached = cache.get(key)

    if (cached) {
      return cached
    }

    cache.set(key, data)
    return data
  })
}

/**
 * Common validation patterns
 */

// Email validation with custom error message
export const emailSchema = z
  .string({ message: 'Email is required' })
  .email('Please enter a valid email address')
  .toLowerCase()
  .trim()

// Password validation with strength requirements
export const passwordSchema = z
  .string({ message: 'Password is required' })
  .min(8, 'Password must be at least 8 characters')
  .regex(
    /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/,
    'Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character'
  )

// Phone number validation (international format)
export const phoneSchema = z
  .string({ message: 'Phone number is required' })
  .regex(/^\+?[1-9]\d{1,14}$/, 'Please enter a valid international phone number')

// Slug validation for URL-friendly strings
export const slugSchema = z
  .string({ message: 'Slug is required' })
  .min(1, 'Slug cannot be empty')
  .max(100, 'Slug cannot exceed 100 characters')
  .regex(
    /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
    'Slug must contain only lowercase letters, numbers, and hyphens'
  )

// Date range validation
export const dateRangeSchema = z
  .object({
    startDate: z.date({ message: 'Start date is required' }),
    endDate: z.date({ message: 'End date is required' })
  })
  .refine((data) => data.endDate > data.startDate, {
    message: 'End date must be after start date',
    path: ['endDate']
  })

export default {
  createEnumWithFallback,
  createOptimizedObjectSchema,
  createAsyncValidationSchema,
  createTransformSchema,
  createMultiRefinedSchema,
  createPerformanceTrackedSchema,
  createCachedValidationSchema,
  emailSchema,
  passwordSchema,
  phoneSchema,
  slugSchema,
  dateRangeSchema
}
