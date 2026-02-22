# TypeScript Guidelines

## General TypeScript Standards

All TypeScript code in the CNC Portal project should follow strict TypeScript practices to ensure type safety, maintainability, and developer productivity.

## TypeScript Configuration

### Strict Mode

The project uses TypeScript strict mode. Always ensure:

```json
{
  "compilerOptions": {
    "strict": true,
    "noImplicitAny": true,
    "strictNullChecks": true,
    "strictFunctionTypes": true,
    "strictBindCallApply": true,
    "strictPropertyInitialization": true,
    "noImplicitThis": true,
    "alwaysStrict": true
  }
}
```

## Type Definitions

### Interface vs Type

Use **interfaces** for object shapes that may be extended:

```typescript
// ✅ Good: Use interface for object shapes
interface User {
  id: number
  name: string
  email: string
}

interface AdminUser extends User {
  permissions: string[]
  role: 'admin' | 'superadmin'
}
```

Use **type** for unions, intersections, and complex types:

```typescript
// ✅ Good: Use type for unions and complex types
type Status = 'pending' | 'approved' | 'rejected'
type TokenId = 'eth' | 'usdc' | 'usdt' | 'dai'
type Result<T> = { success: true; data: T } | { success: false; error: string }
```

### Explicit Return Types

Always specify return types for functions, especially public APIs:

```typescript
// ❌ Bad: Implicit return type
function calculateTotal(items) {
  return items.reduce((sum, item) => sum + item.price, 0)
}

// ✅ Good: Explicit return type
function calculateTotal(items: Array<{ price: number }>): number {
  return items.reduce((sum, item) => sum + item.price, 0)
}

// ✅ Good: Async function with explicit return
async function fetchUserData(userId: string): Promise<User> {
  const response = await api.get(`/users/${userId}`)
  return response.data
}
```

## Type Safety Best Practices

### Avoid `any`

Never use `any` unless absolutely necessary. Use `unknown` for truly unknown types:

```typescript
// ❌ Bad: Using any
function processData(data: any): void {
  console.log(data.value)
}

// ✅ Good: Use unknown and type guards
function processData(data: unknown): void {
  if (typeof data === 'object' && data !== null && 'value' in data) {
    console.log((data as { value: unknown }).value)
  }
}

// ✅ Better: Define proper types
interface DataWithValue {
  value: string | number
}

function processData(data: DataWithValue): void {
  console.log(data.value)
}
```

### Type Assertions

Use type assertions sparingly and only when you have more information than TypeScript:

```typescript
// ❌ Bad: Unnecessary assertion
const value = someFunction() as string

// ✅ Good: With type guard
if (typeof value === 'string') {
  const strValue = value // TypeScript infers this as string
}

// ✅ Good: When you know more than TypeScript
const element = document.querySelector('#app') as HTMLDivElement
```

### Null and Undefined Handling

Always handle null and undefined explicitly:

```typescript
// ❌ Bad: Not handling nullability
function getUserName(user: User | null): string {
  return user.name // Error: Object is possibly 'null'
}

// ✅ Good: Optional chaining and nullish coalescing
function getUserName(user: User | null): string {
  return user?.name ?? 'Guest'
}

// ✅ Good: Type guard
function getUserName(user: User | null): string {
  if (!user) {
    return 'Guest'
  }
  return user.name
}
```

## Generic Types

### Writing Generic Functions

Use generics for reusable, type-safe code:

```typescript
// ✅ Good: Generic function
function identity<T>(value: T): T {
  return value
}

// ✅ Good: Generic with constraints
function getProperty<T, K extends keyof T>(obj: T, key: K): T[K] {
  return obj[key]
}

// ✅ Good: Multiple type parameters
function merge<T extends object, U extends object>(obj1: T, obj2: U): T & U {
  return { ...obj1, ...obj2 }
}
```

### Generic Interfaces

```typescript
// ✅ Good: Generic interface
interface ApiResponse<T> {
  data: T
  status: number
  message: string
}

interface PaginatedResponse<T> extends ApiResponse<T[]> {
  page: number
  totalPages: number
  totalItems: number
}

// Usage
type UserResponse = ApiResponse<User>
type UsersListResponse = PaginatedResponse<User>
```

## Utility Types

### Leverage Built-in Utility Types

```typescript
// Partial: Make all properties optional
type PartialUser = Partial<User>

// Required: Make all properties required
type RequiredConfig = Required<OptionalConfig>

// Pick: Select specific properties
type UserPreview = Pick<User, 'id' | 'name' | 'email'>

// Omit: Exclude specific properties
type UserWithoutPassword = Omit<User, 'password'>

// Record: Create an object type with specific keys
type ErrorMessages = Record<string, string>

// ReturnType: Extract function return type
type ApiResult = ReturnType<typeof fetchUserData>

// Parameters: Extract function parameters
type FetchParams = Parameters<typeof fetchUserData>
```

### Custom Utility Types

```typescript
// ✅ Good: Custom utility types for common patterns
type Nullable<T> = T | null
type Optional<T> = T | undefined
type AsyncResult<T> = Promise<Result<T>>

// Deep partial
type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P]
}

// Readonly deep
type DeepReadonly<T> = {
  readonly [P in keyof T]: T[P] extends object ? DeepReadonly<T[P]> : T[P]
}
```

## Vue 3 + TypeScript Patterns

### Component Props with TypeScript

```typescript
// ✅ Good: Define props with interface
interface Props {
  userId: string
  isActive?: boolean
  onUpdate?: (id: string) => void
}

const props = withDefaults(defineProps<Props>(), {
  isActive: false
})
```

### Composable Return Types

```typescript
// ✅ Good: Explicit return type for composables
interface UseUserResult {
  user: Ref<User | null>
  loading: Ref<boolean>
  error: Ref<Error | null>
  fetchUser: (id: string) => Promise<void>
  updateUser: (updates: Partial<User>) => Promise<void>
}

function useUser(): UseUserResult {
  const user = ref<User | null>(null)
  const loading = ref(false)
  const error = ref<Error | null>(null)

  const fetchUser = async (id: string): Promise<void> => {
    // implementation
  }

  const updateUser = async (updates: Partial<User>): Promise<void> => {
    // implementation
  }

  return {
    user,
    loading,
    error,
    fetchUser,
    updateUser
  }
}
```

### Store Types with Pinia

```typescript
// ✅ Good: Strongly typed Pinia store
export const useUserStore = defineStore('user', () => {
  const currentUser = ref<User | null>(null)
  const users = ref<User[]>([])
  const loading = ref(false)

  const isAuthenticated = computed((): boolean => currentUser.value !== null)

  const fetchUsers = async (): Promise<void> => {
    loading.value = true
    try {
      const response = await api.get<User[]>('/users')
      users.value = response.data
    } finally {
      loading.value = false
    }
  }

  return {
    currentUser,
    users,
    loading,
    isAuthenticated,
    fetchUsers
  }
})

// Type inference for store
type UserStore = ReturnType<typeof useUserStore>
```

## Type Guards

### Custom Type Guards

```typescript
// ✅ Good: Type guard functions
function isUser(value: unknown): value is User {
  return (
    typeof value === 'object' &&
    value !== null &&
    'id' in value &&
    'name' in value &&
    'email' in value
  )
}

function isErrorResponse(response: unknown): response is ErrorResponse {
  return (
    typeof response === 'object' &&
    response !== null &&
    'error' in response &&
    typeof (response as ErrorResponse).error === 'string'
  )
}

// Usage
function handleResponse(response: unknown): void {
  if (isErrorResponse(response)) {
    console.error(response.error)
  } else if (isUser(response)) {
    console.log(response.name)
  }
}
```

### Discriminated Unions

```typescript
// ✅ Good: Use discriminated unions for type safety
type ApiResult<T> =
  | { status: 'loading' }
  | { status: 'success'; data: T }
  | { status: 'error'; error: string }

function handleResult<T>(result: ApiResult<T>): void {
  switch (result.status) {
    case 'loading':
      console.log('Loading...')
      break
    case 'success':
      console.log(result.data) // TypeScript knows data exists
      break
    case 'error':
      console.error(result.error) // TypeScript knows error exists
      break
  }
}
```

## Enums vs Union Types

### Prefer Union Types Over Enums

```typescript
// ❌ Avoid: Enums (they have runtime overhead)
enum UserRole {
  Admin = 'admin',
  User = 'user',
  Guest = 'guest'
}

// ✅ Good: Use const assertions and union types
const USER_ROLES = {
  ADMIN: 'admin',
  USER: 'user',
  GUEST: 'guest'
} as const

type UserRole = (typeof USER_ROLES)[keyof typeof USER_ROLES]

// ✅ Or simple string literal union
type UserRole = 'admin' | 'user' | 'guest'
```

## Error Handling with Types

### Type-Safe Error Handling

```typescript
// ✅ Good: Typed error classes
class ApiError extends Error {
  constructor(
    message: string,
    public statusCode: number,
    public code: string
  ) {
    super(message)
    this.name = 'ApiError'
  }
}

class ValidationError extends Error {
  constructor(
    message: string,
    public field: string
  ) {
    super(message)
    this.name = 'ValidationError'
  }
}

// ✅ Good: Type-safe error handling
async function fetchData(): Promise<User> {
  try {
    const response = await api.get<User>('/user')
    return response.data
  } catch (error) {
    if (error instanceof ApiError) {
      console.error(`API Error: ${error.message} (${error.statusCode})`)
    } else if (error instanceof ValidationError) {
      console.error(`Validation Error on ${error.field}: ${error.message}`)
    } else {
      console.error('Unknown error:', error)
    }
    throw error
  }
}
```

## Documentation with TSDoc

### Document Complex Types

```typescript
/**
 * Represents a user in the system
 * @property {string} id - Unique identifier
 * @property {string} name - Full name of the user
 * @property {string} email - Email address
 * @property {UserRole} role - User's role in the system
 * @property {Date} createdAt - Account creation timestamp
 */
interface User {
  id: string
  name: string
  email: string
  role: UserRole
  createdAt: Date
}

/**
 * Fetches user data from the API
 * @param userId - The unique identifier of the user
 * @returns Promise resolving to User object
 * @throws {ApiError} When the API request fails
 * @throws {ValidationError} When userId is invalid
 * @example
 * ```typescript
 * const user = await fetchUser('123')
 * console.log(user.name)
 * ```
 */
async function fetchUser(userId: string): Promise<User> {
  // implementation
}
```

## Common Anti-Patterns to Avoid

### Don't Use Type Casting to Bypass Type Checking

```typescript
// ❌ Bad: Casting to bypass type checking
const user = response as User // Dangerous if response doesn't match

// ✅ Good: Validate and type guard
function isUser(value: unknown): value is User {
  // Proper validation
  return (
    typeof value === 'object' &&
    value !== null &&
    'id' in value &&
    typeof (value as User).id === 'string'
  )
}

const user = isUser(response) ? response : null
```

### Don't Overuse Optional Properties

```typescript
// ❌ Bad: Too many optional properties
interface User {
  id?: string
  name?: string
  email?: string
}

// ✅ Good: Required core properties, separate optional config
interface User {
  id: string
  name: string
  email: string
}

interface UserPreferences {
  theme?: 'light' | 'dark'
  notifications?: boolean
}
```

### Don't Duplicate Type Definitions

```typescript
// ❌ Bad: Duplicating types
interface UserRequest {
  name: string
  email: string
}

interface UserResponse {
  name: string
  email: string
  id: string
}

// ✅ Good: Reuse and extend
interface UserBase {
  name: string
  email: string
}

interface UserRequest extends UserBase {}

interface UserResponse extends UserBase {
  id: string
}

// ✅ Or use utility types
type UserResponse = UserBase & { id: string }
```

## Type Import/Export

### Prefer Type-Only Imports

```typescript
// ✅ Good: Type-only imports (better for tree-shaking)
import type { User, UserRole } from './types'
import { fetchUser } from './api'

// ✅ Good: Mixed imports
import { type User, fetchUser } from './api'
```

## Testing with TypeScript

### Type-Safe Test Helpers

```typescript
// ✅ Good: Generic test helper with proper types
function createMockStore<T extends object>(overrides?: Partial<T>): T {
  return {
    ...defaultStoreState,
    ...overrides
  } as T
}

// ✅ Good: Type-safe mock data
function createMockUser(overrides?: Partial<User>): User {
  return {
    id: '1',
    name: 'Test User',
    email: 'test@example.com',
    ...overrides
  }
}
```
