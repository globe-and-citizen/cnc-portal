# Error Handling Guidelines

## Overview

Proper error handling improves user experience, aids debugging, and ensures application stability. The CNC Portal should handle errors gracefully at all levels.

## Frontend Error Handling

### Try-Catch Blocks

Always wrap risky operations in try-catch:

```typescript
// ✅ Good: Comprehensive error handling
const fetchUserData = async (userId: string) => {
  loading.value = true
  error.value = null
  
  try {
    const response = await api.get(`/users/${userId}`)
    data.value = response.data
    return response.data
  } catch (err) {
    error.value = err as Error
    console.error('Failed to fetch user:', err)
    addErrorToast('Failed to load user data. Please try again.')
    throw err
  } finally {
    loading.value = false
  }
}

// ❌ Bad: Unhandled promise rejection
const badFetch = async () => {
  const data = await api.get('/data') // Can throw but not caught
  return data
}
```

### Error State Management

```typescript
// ✅ Good: Track error states in components
interface ComponentState {
  data: User | null
  loading: boolean
  error: Error | null
}

const state = reactive<ComponentState>({
  data: null,
  loading: false,
  error: null
})

const resetError = () => {
  state.error = null
}

const loadData = async () => {
  state.loading = true
  state.error = null
  
  try {
    state.data = await fetchData()
  } catch (err) {
    state.error = err as Error
  } finally {
    state.loading = false
  }
}
```

### User-Friendly Error Messages

```typescript
// ✅ Good: Map technical errors to user-friendly messages
const ERROR_MESSAGES: Record<string, string> = {
  'NETWORK_ERROR': 'Unable to connect. Please check your internet connection.',
  'TIMEOUT': 'Request timed out. Please try again.',
  'UNAUTHORIZED': 'Your session has expired. Please log in again.',
  'NOT_FOUND': 'The requested resource was not found.',
  'VALIDATION_ERROR': 'Please check your input and try again.',
  'SERVER_ERROR': 'Something went wrong on our end. Please try again later.'
}

const getErrorMessage = (error: Error): string => {
  if (axios.isAxiosError(error)) {
    if (!error.response) {
      return ERROR_MESSAGES.NETWORK_ERROR
    }
    
    switch (error.response.status) {
      case 401:
        return ERROR_MESSAGES.UNAUTHORIZED
      case 404:
        return ERROR_MESSAGES.NOT_FOUND
      case 422:
        return ERROR_MESSAGES.VALIDATION_ERROR
      case 500:
      case 502:
      case 503:
        return ERROR_MESSAGES.SERVER_ERROR
      default:
        return error.response.data?.message || 'An error occurred'
    }
  }
  
  return error.message || 'An unexpected error occurred'
}

// Usage
try {
  await performAction()
} catch (error) {
  const message = getErrorMessage(error as Error)
  addErrorToast(message)
}
```

### Toast Notifications

```typescript
// ✅ Good: Consistent error notifications
import { useToastStore } from '@/stores'

const { addErrorToast, addSuccessToast, addWarningToast } = useToastStore()

const handleSubmit = async () => {
  try {
    loading.value = true
    await submitForm(formData)
    addSuccessToast('Form submitted successfully!')
    router.push('/success')
  } catch (error) {
    console.error('Form submission failed:', error)
    addErrorToast('Failed to submit form. Please try again.')
  } finally {
    loading.value = false
  }
}

const handleDelete = async (id: string) => {
  try {
    await deleteItem(id)
    addSuccessToast('Item deleted successfully')
  } catch (error) {
    if ((error as any).response?.status === 409) {
      addWarningToast('Cannot delete item. It is referenced by other records.')
    } else {
      addErrorToast('Failed to delete item')
    }
  }
}
```

## Error Display Components

### Error Boundary Pattern

```vue
<!-- ErrorBoundary.vue -->
<template>
  <div v-if="error" class="error-boundary">
    <div class="error-content">
      <h2>Something went wrong</h2>
      <p>{{ errorMessage }}</p>
      <button @click="resetError">Try Again</button>
    </div>
  </div>
  <slot v-else />
</template>

<script setup lang="ts">
import { ref, onErrorCaptured } from 'vue'

const error = ref<Error | null>(null)

const errorMessage = computed(() => {
  if (!error.value) return ''
  return import.meta.env.DEV 
    ? error.value.stack 
    : 'An unexpected error occurred'
})

const resetError = () => {
  error.value = null
}

onErrorCaptured((err) => {
  error.value = err
  console.error('Error captured:', err)
  return false // Prevent error from propagating
})
</script>
```

### Loading and Error States

```vue
<template>
  <div>
    <!-- Loading state -->
    <div v-if="loading" class="loading">
      <LoadingSpinner />
      <p>Loading...</p>
    </div>
    
    <!-- Error state -->
    <div v-else-if="error" class="error">
      <IconError />
      <p>{{ error.message }}</p>
      <button @click="retry">Retry</button>
    </div>
    
    <!-- Success state -->
    <div v-else-if="data">
      <slot :data="data" />
    </div>
    
    <!-- Empty state -->
    <div v-else class="empty">
      <p>No data available</p>
    </div>
  </div>
</template>
```

## Validation Errors

### Form Validation

```typescript
// ✅ Good: Comprehensive form validation
import { z } from 'zod'

const userSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string()
    .min(8, 'Password must be at least 8 characters')
    .max(100, 'Password must be less than 100 characters'),
  name: z.string()
    .min(1, 'Name is required')
    .max(100, 'Name must be less than 100 characters')
})

type ValidationErrors = Partial<Record<keyof z.infer<typeof userSchema>, string>>

const errors = ref<ValidationErrors>({})

const validateForm = () => {
  errors.value = {}
  
  try {
    userSchema.parse(formData)
    return true
  } catch (err) {
    if (err instanceof z.ZodError) {
      err.errors.forEach((error) => {
        const field = error.path[0] as keyof ValidationErrors
        errors.value[field] = error.message
      })
    }
    return false
  }
}

const handleSubmit = async () => {
  if (!validateForm()) {
    addErrorToast('Please fix the errors in the form')
    return
  }
  
  // Proceed with submission
}
```

### Display Validation Errors

```vue
<template>
  <form @submit.prevent="handleSubmit">
    <div class="form-field">
      <label for="email">Email</label>
      <input
        id="email"
        v-model="formData.email"
        type="email"
        :class="{ 'error': errors.email }"
        :aria-invalid="!!errors.email"
        aria-describedby="email-error"
      />
      <span
        v-if="errors.email"
        id="email-error"
        class="error-message"
        role="alert"
      >
        {{ errors.email }}
      </span>
    </div>
    
    <button type="submit" :disabled="loading">
      Submit
    </button>
  </form>
</template>
```

## API Error Handling

### Axios Interceptors

```typescript
// ✅ Good: Global error handling with interceptors
import axios from 'axios'
import { useAuthStore } from '@/stores/authStore'
import { useToastStore } from '@/stores/toastStore'

const api = axios.create({
  baseURL: import.meta.env.VITE_APP_BACKEND_URL
})

// Request interceptor
api.interceptors.request.use(
  (config) => {
    const authStore = useAuthStore()
    if (authStore.token) {
      config.headers.Authorization = `Bearer ${authStore.token}`
    }
    return config
  },
  (error) => {
    return Promise.reject(error)
  }
)

// Response interceptor
api.interceptors.response.use(
  (response) => response,
  (error) => {
    const toastStore = useToastStore()
    
    if (!error.response) {
      toastStore.addErrorToast('Network error. Please check your connection.')
      return Promise.reject(error)
    }
    
    const { status, data } = error.response
    
    switch (status) {
      case 401:
        // Handle unauthorized
        const authStore = useAuthStore()
        authStore.logout()
        window.location.href = '/login'
        break
        
      case 403:
        toastStore.addErrorToast('You do not have permission to perform this action')
        break
        
      case 404:
        toastStore.addErrorToast('Resource not found')
        break
        
      case 422:
        // Validation errors
        toastStore.addErrorToast(data.message || 'Validation error')
        break
        
      case 429:
        toastStore.addErrorToast('Too many requests. Please try again later.')
        break
        
      case 500:
      case 502:
      case 503:
        toastStore.addErrorToast('Server error. Please try again later.')
        break
        
      default:
        toastStore.addErrorToast(data.message || 'An error occurred')
    }
    
    return Promise.reject(error)
  }
)

export default api
```

## Web3 Error Handling

### Contract Interaction Errors

```typescript
// ✅ Good: Handle contract errors
import { BaseError, ContractFunctionRevertedError } from 'viem'

const handleContractError = (error: unknown): string => {
  if (error instanceof BaseError) {
    const revertError = error.walk(
      err => err instanceof ContractFunctionRevertedError
    )
    
    if (revertError instanceof ContractFunctionRevertedError) {
      const errorName = revertError.data?.errorName ?? ''
      
      // Map contract errors to user-friendly messages
      const CONTRACT_ERRORS: Record<string, string> = {
        'InsufficientBalance': 'Insufficient balance for this transaction',
        'InsufficientAllowance': 'Insufficient token allowance',
        'TransferFailed': 'Transfer failed. Please try again.',
        'InvalidAddress': 'Invalid address provided',
        'ZeroAmount': 'Amount must be greater than zero',
        'Unauthorized': 'You are not authorized to perform this action'
      }
      
      return CONTRACT_ERRORS[errorName] || `Contract error: ${errorName}`
    }
    
    // Handle other Web3 errors
    const message = error.message.toLowerCase()
    
    if (message.includes('user rejected')) {
      return 'Transaction was cancelled'
    }
    if (message.includes('insufficient funds')) {
      return 'Insufficient funds for transaction + gas'
    }
    if (message.includes('nonce')) {
      return 'Transaction nonce error. Please try again.'
    }
    if (message.includes('gas')) {
      return 'Gas estimation failed. Transaction may fail.'
    }
  }
  
  return 'Transaction failed. Please try again.'
}

// Usage
const transfer = async (to: string, amount: bigint) => {
  try {
    loading.value = true
    const hash = await writeContract({
      address: TOKEN_ADDRESS,
      abi: ERC20_ABI,
      functionName: 'transfer',
      args: [to as Address, amount]
    })
    
    // Wait for confirmation
    const receipt = await waitForTransactionReceipt({ hash })
    
    if (receipt.status === 'success') {
      addSuccessToast('Transfer successful!')
    } else {
      throw new Error('Transaction failed')
    }
  } catch (error) {
    const message = handleContractError(error)
    addErrorToast(message)
    console.error('Transfer error:', error)
  } finally {
    loading.value = false
  }
}
```

### Wallet Connection Errors

```typescript
// ✅ Good: Handle wallet connection errors
const connectWallet = async () => {
  try {
    await connect({ connector: metaMaskConnector })
    addSuccessToast('Wallet connected successfully')
  } catch (error) {
    const message = (error as Error).message
    
    if (message.includes('user rejected')) {
      addWarningToast('Wallet connection was cancelled')
    } else if (message.includes('already pending')) {
      addWarningToast('Connection request is already pending')
    } else {
      addErrorToast('Failed to connect wallet. Please try again.')
      console.error('Wallet connection error:', error)
    }
  }
}
```

## Backend Error Handling

### Error Classes

```typescript
// ✅ Good: Custom error classes
export class AppError extends Error {
  constructor(
    public message: string,
    public statusCode: number = 500,
    public code?: string
  ) {
    super(message)
    this.name = this.constructor.name
    Error.captureStackTrace(this, this.constructor)
  }
}

export class ValidationError extends AppError {
  constructor(message: string) {
    super(message, 422, 'VALIDATION_ERROR')
  }
}

export class UnauthorizedError extends AppError {
  constructor(message: string = 'Unauthorized') {
    super(message, 401, 'UNAUTHORIZED')
  }
}

export class NotFoundError extends AppError {
  constructor(message: string) {
    super(message, 404, 'NOT_FOUND')
  }
}

export class ConflictError extends AppError {
  constructor(message: string) {
    super(message, 409, 'CONFLICT')
  }
}
```

### Error Middleware

```typescript
// ✅ Good: Global error handler middleware
import { Request, Response, NextFunction } from 'express'

const errorHandler = (
  error: Error,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  console.error('Error:', {
    message: error.message,
    stack: error.stack,
    url: req.url,
    method: req.method,
    body: req.body
  })
  
  if (error instanceof AppError) {
    return res.status(error.statusCode).json({
      error: error.message,
      code: error.code
    })
  }
  
  if (error instanceof z.ZodError) {
    return res.status(422).json({
      error: 'Validation failed',
      details: error.errors
    })
  }
  
  // Don't expose internal errors in production
  const message = process.env.NODE_ENV === 'production'
    ? 'Internal server error'
    : error.message
  
  res.status(500).json({
    error: message
  })
}

app.use(errorHandler)
```

### Async Error Handling

```typescript
// ✅ Good: Async error wrapper
const asyncHandler = (fn: Function) => {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next)
  }
}

// Usage
app.get('/api/users/:id', asyncHandler(async (req, res) => {
  const user = await getUserById(req.params.id)
  
  if (!user) {
    throw new NotFoundError('User not found')
  }
  
  res.json(user)
}))
```

## Logging Errors

### Structured Logging

```typescript
// ✅ Good: Structured error logging
interface ErrorLog {
  timestamp: string
  level: 'error' | 'warn' | 'info'
  message: string
  error?: {
    name: string
    message: string
    stack?: string
  }
  context?: {
    userId?: string
    url?: string
    method?: string
  }
}

const logError = (error: Error, context?: ErrorLog['context']) => {
  const log: ErrorLog = {
    timestamp: new Date().toISOString(),
    level: 'error',
    message: error.message,
    error: {
      name: error.name,
      message: error.message,
      stack: error.stack
    },
    context
  }
  
  console.error(JSON.stringify(log))
  
  // Send to error tracking service in production
  if (process.env.NODE_ENV === 'production') {
    // sendToErrorTracking(log)
  }
}
```

## Error Recovery

### Retry Logic

```typescript
// ✅ Good: Implement retry for transient errors
const fetchWithRetry = async <T>(
  fn: () => Promise<T>,
  maxRetries: number = 3,
  delay: number = 1000
): Promise<T> => {
  let lastError: Error
  
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn()
    } catch (error) {
      lastError = error as Error
      
      // Don't retry on client errors (4xx)
      if (axios.isAxiosError(error) && error.response?.status < 500) {
        throw error
      }
      
      if (i < maxRetries - 1) {
        await new Promise(resolve => setTimeout(resolve, delay * (i + 1)))
      }
    }
  }
  
  throw lastError!
}

// Usage
const loadData = async () => {
  try {
    const data = await fetchWithRetry(() => api.get('/data'))
    return data
  } catch (error) {
    addErrorToast('Failed to load data after multiple attempts')
  }
}
```

## Error Boundaries Best Practices

- Always handle errors at appropriate levels
- Provide fallback UI for error states
- Log errors for debugging
- Show user-friendly error messages
- Implement retry mechanisms for transient errors
- Clean up resources in finally blocks
- Don't swallow errors silently
- Validate inputs to prevent errors
- Handle edge cases explicitly
- Test error scenarios thoroughly

## Error Checklist

- [ ] All async operations wrapped in try-catch
- [ ] User-friendly error messages
- [ ] Error state tracked and displayed
- [ ] Validation errors shown inline
- [ ] API errors handled globally
- [ ] Contract errors handled specifically
- [ ] Errors logged appropriately
- [ ] Retry logic for transient errors
- [ ] Cleanup in finally blocks
- [ ] Error boundaries implemented
- [ ] Loading states shown
- [ ] Empty states handled
