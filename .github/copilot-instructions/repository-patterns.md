# Repository Patterns

## Overview

This document outlines common patterns and best practices used throughout the CNC Portal codebase. Following these patterns ensures consistency and maintainability.

## Project Structure

### Directory Organization

```
cnc-portal/
├── app/                      # Vue.js frontend
│   ├── src/
│   │   ├── components/       # Reusable Vue components
│   │   │   ├── common/       # Generic UI components
│   │   │   ├── layout/       # Layout components
│   │   │   └── __tests__/    # Component tests
│   │   ├── composables/      # Composition API composables
│   │   ├── stores/           # Pinia state management
│   │   ├── views/            # Page components (routes)
│   │   ├── queries/          # API query definitions
│   │   ├── utils/            # Utility functions
│   │   ├── types/            # TypeScript type definitions
│   │   ├── constant/         # Constants and enums
│   │   └── assets/           # Static assets
├── backend/                  # Express.js API
│   ├── src/
│   │   ├── controllers/      # Request handlers
│   │   ├── services/         # Business logic
│   │   ├── models/           # Data models
│   │   ├── middleware/       # Express middleware
│   │   ├── utils/            # Utility functions
│   │   └── types/            # TypeScript types
│   └── prisma/               # Database schema and migrations
├── contract/                 # Hardhat smart contracts
│   ├── contracts/            # Solidity contracts
│   ├── test/                 # Contract tests
│   └── scripts/              # Deployment scripts
└── docs/                     # Documentation
```

## Composable Patterns

### Composable Structure

```typescript
// ✅ Good: Standard composable pattern
import { ref, computed } from 'vue'

export interface UseUserOptions {
  fetchOnMount?: boolean
  pollInterval?: number
}

export interface UseUserReturn {
  user: Ref<User | null>
  loading: Ref<boolean>
  error: Ref<Error | null>
  fetchUser: (id: string) => Promise<void>
  updateUser: (updates: Partial<User>) => Promise<void>
  refresh: () => Promise<void>
}

export function useUser(options: UseUserOptions = {}): UseUserReturn {
  const { fetchOnMount = false, pollInterval } = options
  
  // State
  const user = ref<User | null>(null)
  const loading = ref(false)
  const error = ref<Error | null>(null)
  
  // Computed
  const isLoaded = computed(() => user.value !== null)
  
  // Methods
  const fetchUser = async (id: string): Promise<void> => {
    loading.value = true
    error.value = null
    try {
      const response = await api.get(`/users/${id}`)
      user.value = response.data
    } catch (err) {
      error.value = err as Error
      throw err
    } finally {
      loading.value = false
    }
  }
  
  const updateUser = async (updates: Partial<User>): Promise<void> => {
    if (!user.value) throw new Error('No user loaded')
    
    try {
      const response = await api.patch(`/users/${user.value.id}`, updates)
      user.value = response.data
    } catch (err) {
      error.value = err as Error
      throw err
    }
  }
  
  const refresh = async (): Promise<void> => {
    if (user.value) {
      await fetchUser(user.value.id)
    }
  }
  
  // Lifecycle
  if (fetchOnMount) {
    onMounted(() => {
      // Auto-fetch logic
    })
  }
  
  if (pollInterval) {
    let interval: NodeJS.Timeout
    
    onMounted(() => {
      interval = setInterval(refresh, pollInterval)
    })
    
    onUnmounted(() => {
      clearInterval(interval)
    })
  }
  
  return {
    user,
    loading,
    error,
    fetchUser,
    updateUser,
    refresh
  }
}
```

### Shared Composables

```typescript
// composables/useAsync.ts
// ✅ Good: Generic async operation composable
export function useAsync<T>(
  asyncFn: () => Promise<T>,
  immediate: boolean = false
) {
  const data = ref<T | null>(null)
  const loading = ref(false)
  const error = ref<Error | null>(null)
  
  const execute = async (): Promise<T | null> => {
    loading.value = true
    error.value = null
    
    try {
      const result = await asyncFn()
      data.value = result
      return result
    } catch (err) {
      error.value = err as Error
      return null
    } finally {
      loading.value = false
    }
  }
  
  if (immediate) {
    execute()
  }
  
  return {
    data,
    loading,
    error,
    execute
  }
}

// Usage
const { data, loading, error, execute } = useAsync(
  () => fetchUsers(),
  true // Execute immediately
)
```

## API Integration Patterns

### Query Definitions

```typescript
// queries/user.queries.ts
// ✅ Good: Centralized API query definitions
import { useQuery, useMutation, useQueryClient } from '@tanstack/vue-query'
import type { User, CreateUserDto, UpdateUserDto } from '@/types'

export const userKeys = {
  all: ['users'] as const,
  lists: () => [...userKeys.all, 'list'] as const,
  list: (filters: string) => [...userKeys.lists(), { filters }] as const,
  details: () => [...userKeys.all, 'detail'] as const,
  detail: (id: string) => [...userKeys.details(), id] as const,
}

export function useUsers(filters?: string) {
  return useQuery({
    queryKey: userKeys.list(filters || ''),
    queryFn: () => api.get<User[]>('/users', { params: { filters } })
  })
}

export function useUser(userId: Ref<string>) {
  return useQuery({
    queryKey: computed(() => userKeys.detail(userId.value)),
    queryFn: () => api.get<User>(`/users/${userId.value}`),
    enabled: computed(() => !!userId.value)
  })
}

export function useCreateUser() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: (data: CreateUserDto) => api.post<User>('/users', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: userKeys.lists() })
    }
  })
}

export function useUpdateUser() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateUserDto }) =>
      api.patch<User>(`/users/${id}`, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: userKeys.detail(variables.id) })
      queryClient.invalidateQueries({ queryKey: userKeys.lists() })
    }
  })
}
```

### API Service Layer

```typescript
// services/api.service.ts
// ✅ Good: Typed API service
import axios, { type AxiosInstance } from 'axios'

class ApiService {
  private client: AxiosInstance
  
  constructor() {
    this.client = axios.create({
      baseURL: import.meta.env.VITE_APP_BACKEND_URL,
      timeout: 10000
    })
    
    this.setupInterceptors()
  }
  
  private setupInterceptors() {
    // Request interceptor
    this.client.interceptors.request.use((config) => {
      const token = localStorage.getItem('auth_token')
      if (token) {
        config.headers.Authorization = `Bearer ${token}`
      }
      return config
    })
    
    // Response interceptor
    this.client.interceptors.response.use(
      (response) => response.data,
      (error) => {
        // Handle errors globally
        return Promise.reject(error)
      }
    )
  }
  
  async get<T>(url: string, config?: any): Promise<T> {
    return this.client.get<T>(url, config)
  }
  
  async post<T>(url: string, data?: any, config?: any): Promise<T> {
    return this.client.post<T>(url, data, config)
  }
  
  async patch<T>(url: string, data?: any, config?: any): Promise<T> {
    return this.client.patch<T>(url, data, config)
  }
  
  async delete<T>(url: string, config?: any): Promise<T> {
    return this.client.delete<T>(url, config)
  }
}

export const api = new ApiService()
```

## Component Patterns

### Smart vs Presentational Components

```typescript
// ✅ Good: Smart component (UserList.vue)
// Handles data fetching and business logic
<template>
  <UserListView
    :users="users"
    :loading="loading"
    :error="error"
    @select="handleSelect"
    @refresh="refetch"
  />
</template>

<script setup lang="ts">
import { useUsers } from '@/queries/user.queries'
import UserListView from './UserListView.vue'

const { data: users, isLoading: loading, error, refetch } = useUsers()

const handleSelect = (userId: string) => {
  router.push(`/users/${userId}`)
}
</script>

// ✅ Good: Presentational component (UserListView.vue)
// Only handles display and emits events
<template>
  <div>
    <div v-if="loading">Loading...</div>
    <div v-else-if="error">Error: {{ error.message }}</div>
    <ul v-else>
      <li
        v-for="user in users"
        :key="user.id"
        @click="emit('select', user.id)"
      >
        {{ user.name }}
      </li>
    </ul>
    <button @click="emit('refresh')">Refresh</button>
  </div>
</template>

<script setup lang="ts">
import type { User } from '@/types'

interface Props {
  users?: User[]
  loading: boolean
  error: Error | null
}

const props = defineProps<Props>()

const emit = defineEmits<{
  select: [userId: string]
  refresh: []
}>()
</script>
```

### Compound Components

```typescript
// ✅ Good: Compound component pattern
// Card.vue
<template>
  <div class="card">
    <slot />
  </div>
</template>

// CardHeader.vue
<template>
  <div class="card-header">
    <slot />
  </div>
</template>

// CardBody.vue
<template>
  <div class="card-body">
    <slot />
  </div>
</template>

// CardFooter.vue
<template>
  <div class="card-footer">
    <slot />
  </div>
</template>

// Usage
<Card>
  <CardHeader>
    <h2>Title</h2>
  </CardHeader>
  <CardBody>
    <p>Content</p>
  </CardBody>
  <CardFooter>
    <button>Action</button>
  </CardFooter>
</Card>
```

## Backend Patterns

### Controller Pattern

```typescript
// ✅ Good: Thin controllers, delegate to services
import { Request, Response, NextFunction } from 'express'
import { userService } from '../services/user.service'
import { CreateUserDto, UpdateUserDto } from '../types'

export class UserController {
  async getUsers(req: Request, res: Response, next: NextFunction) {
    try {
      const users = await userService.getAllUsers(req.query)
      res.json(users)
    } catch (error) {
      next(error)
    }
  }
  
  async getUser(req: Request, res: Response, next: NextFunction) {
    try {
      const user = await userService.getUserById(req.params.id)
      res.json(user)
    } catch (error) {
      next(error)
    }
  }
  
  async createUser(req: Request, res: Response, next: NextFunction) {
    try {
      const dto: CreateUserDto = req.body
      const user = await userService.createUser(dto)
      res.status(201).json(user)
    } catch (error) {
      next(error)
    }
  }
  
  async updateUser(req: Request, res: Response, next: NextFunction) {
    try {
      const dto: UpdateUserDto = req.body
      const user = await userService.updateUser(req.params.id, dto)
      res.json(user)
    } catch (error) {
      next(error)
    }
  }
  
  async deleteUser(req: Request, res: Response, next: NextFunction) {
    try {
      await userService.deleteUser(req.params.id)
      res.status(204).send()
    } catch (error) {
      next(error)
    }
  }
}

export const userController = new UserController()
```

### Service Pattern

```typescript
// ✅ Good: Business logic in services
import { prisma } from '../db'
import { NotFoundError, ValidationError } from '../errors'
import type { CreateUserDto, UpdateUserDto, User } from '../types'

export class UserService {
  async getAllUsers(query: any): Promise<User[]> {
    const { limit = 50, offset = 0, search } = query
    
    return prisma.user.findMany({
      take: parseInt(limit),
      skip: parseInt(offset),
      where: search ? {
        OR: [
          { name: { contains: search, mode: 'insensitive' } },
          { email: { contains: search, mode: 'insensitive' } }
        ]
      } : undefined,
      orderBy: { createdAt: 'desc' }
    })
  }
  
  async getUserById(id: string): Promise<User> {
    const user = await prisma.user.findUnique({
      where: { id }
    })
    
    if (!user) {
      throw new NotFoundError('User not found')
    }
    
    return user
  }
  
  async createUser(dto: CreateUserDto): Promise<User> {
    // Validate
    const existing = await prisma.user.findUnique({
      where: { email: dto.email }
    })
    
    if (existing) {
      throw new ValidationError('Email already in use')
    }
    
    // Create
    return prisma.user.create({
      data: dto
    })
  }
  
  async updateUser(id: string, dto: UpdateUserDto): Promise<User> {
    // Verify exists
    await this.getUserById(id)
    
    // Update
    return prisma.user.update({
      where: { id },
      data: dto
    })
  }
  
  async deleteUser(id: string): Promise<void> {
    await this.getUserById(id)
    
    await prisma.user.delete({
      where: { id }
    })
  }
}

export const userService = new UserService()
```

### Repository Pattern (Optional)

```typescript
// ✅ Good: Repository for data access abstraction
export class UserRepository {
  async findAll(options?: FindOptions): Promise<User[]> {
    return prisma.user.findMany(options)
  }
  
  async findById(id: string): Promise<User | null> {
    return prisma.user.findUnique({ where: { id } })
  }
  
  async findByEmail(email: string): Promise<User | null> {
    return prisma.user.findUnique({ where: { email } })
  }
  
  async create(data: CreateUserData): Promise<User> {
    return prisma.user.create({ data })
  }
  
  async update(id: string, data: UpdateUserData): Promise<User> {
    return prisma.user.update({ where: { id }, data })
  }
  
  async delete(id: string): Promise<void> {
    await prisma.user.delete({ where: { id } })
  }
}

export const userRepository = new UserRepository()
```

## Type Definitions

### Shared Types

```typescript
// types/index.ts
// ✅ Good: Centralized type definitions

// Domain types
export interface User {
  id: string
  email: string
  name: string
  role: UserRole
  createdAt: Date
  updatedAt: Date
}

export type UserRole = 'admin' | 'user' | 'guest'

// DTO types
export interface CreateUserDto {
  email: string
  password: string
  name: string
}

export interface UpdateUserDto {
  email?: string
  name?: string
}

// API Response types
export interface ApiResponse<T> {
  data: T
  message?: string
}

export interface PaginatedResponse<T> {
  data: T[]
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
  }
}

// Query types
export interface QueryOptions {
  page?: number
  limit?: number
  sort?: string
  order?: 'asc' | 'desc'
}
```

## Constants Organization

```typescript
// constant/index.ts
// ✅ Good: Centralized constants

// API endpoints
export const API_ENDPOINTS = {
  USERS: '/users',
  AUTH: '/auth',
  TEAMS: '/teams'
} as const

// Routes
export const ROUTES = {
  HOME: '/',
  LOGIN: '/login',
  DASHBOARD: '/dashboard',
  PROFILE: '/profile'
} as const

// Token information
export const SUPPORTED_TOKENS = [
  {
    id: 'eth',
    name: 'Ethereum',
    symbol: 'ETH',
    decimals: 18,
    coingeckoId: 'ethereum'
  },
  {
    id: 'usdc',
    name: 'USD Coin',
    symbol: 'USDC',
    decimals: 6,
    coingeckoId: 'usd-coin'
  }
] as const

export type TokenId = typeof SUPPORTED_TOKENS[number]['id']

// Validation rules
export const VALIDATION = {
  PASSWORD_MIN_LENGTH: 8,
  PASSWORD_MAX_LENGTH: 100,
  USERNAME_MIN_LENGTH: 3,
  USERNAME_MAX_LENGTH: 50
} as const

// Time constants
export const TIME = {
  SECOND: 1000,
  MINUTE: 60 * 1000,
  HOUR: 60 * 60 * 1000,
  DAY: 24 * 60 * 60 * 1000
} as const
```

## Utility Functions

```typescript
// utils/format.ts
// ✅ Good: Reusable utility functions

export function formatAddress(address: string): string {
  if (!address || address.length < 10) return address
  return `${address.slice(0, 6)}...${address.slice(-4)}`
}

export function formatNumber(
  value: number,
  decimals: number = 2
): string {
  return new Intl.NumberFormat('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals
  }).format(value)
}

export function formatCurrency(
  value: number,
  currency: string = 'USD'
): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency
  }).format(value)
}

export function formatDate(
  date: Date | string,
  format: 'short' | 'long' = 'short'
): string {
  const d = typeof date === 'string' ? new Date(date) : date
  
  if (format === 'short') {
    return d.toLocaleDateString()
  }
  
  return d.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  })
}
```

## Testing Patterns

### Test Organization

```typescript
// ✅ Good: Organized test structure
describe('UserService', () => {
  describe('getUserById', () => {
    it('should return user when found', async () => {
      // Arrange
      const mockUser = { id: '1', name: 'Test' }
      vi.spyOn(prisma.user, 'findUnique').mockResolvedValue(mockUser)
      
      // Act
      const result = await userService.getUserById('1')
      
      // Assert
      expect(result).toEqual(mockUser)
    })
    
    it('should throw NotFoundError when user not found', async () => {
      vi.spyOn(prisma.user, 'findUnique').mockResolvedValue(null)
      
      await expect(userService.getUserById('1')).rejects.toThrow(NotFoundError)
    })
  })
})
```

## Documentation

### Code Comments

```typescript
// ✅ Good: JSDoc for public APIs
/**
 * Fetches user data from the API
 * @param userId - The unique identifier of the user
 * @returns Promise resolving to User object
 * @throws {NotFoundError} When user doesn't exist
 * @throws {ApiError} When API request fails
 * @example
 * ```typescript
 * const user = await fetchUser('123')
 * console.log(user.name)
 * ```
 */
export async function fetchUser(userId: string): Promise<User> {
  // Implementation
}
```

## Common Anti-Patterns to Avoid

```typescript
// ❌ Bad: God objects
class EverythingService {
  // 1000+ lines of unrelated functionality
}

// ✅ Good: Single responsibility
class UserService { /* user logic */ }
class AuthService { /* auth logic */ }

// ❌ Bad: Tight coupling
class UserController {
  private db = new Database() // Direct dependency
}

// ✅ Good: Dependency injection
class UserController {
  constructor(private db: Database) {}
}

// ❌ Bad: Magic numbers
if (status === 2) { /* what does 2 mean? */ }

// ✅ Good: Named constants
const STATUS_ACTIVE = 2
if (status === STATUS_ACTIVE) { /* clear */ }
```
