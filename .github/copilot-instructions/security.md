# Security Guidelines

## Overview

Security is paramount in the CNC Portal, especially given its blockchain integration and handling of financial transactions. Follow these guidelines to ensure user data and assets are protected.

## Input Validation

### Client-Side Validation

Always validate user input on the client side:

```typescript
// ✅ Good: Validate input before processing
import { z } from 'zod'

const emailSchema = z.string().email()
const addressSchema = z.string().regex(/^0x[a-fA-F0-9]{40}$/)

const validateEmail = (email: string): boolean => {
  try {
    emailSchema.parse(email)
    return true
  } catch {
    return false
  }
}

// ✅ Good: Validate Ethereum addresses
import { isAddress } from 'viem'

const validateAddress = (address: string): boolean => {
  return isAddress(address)
}
```

### Server-Side Validation

Never trust client input - always validate on the server:

```typescript
// Backend validation
import { z } from 'zod'

const createUserSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8).max(100),
  name: z.string().min(1).max(100)
})

app.post('/api/users', async (req, res) => {
  try {
    // ✅ Good: Validate request body
    const validatedData = createUserSchema.parse(req.body)
    
    // Process validated data
    const user = await createUser(validatedData)
    res.json(user)
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ 
        error: 'Validation failed',
        details: error.errors 
      })
    }
    throw error
  }
})
```

### Sanitize User Input

```typescript
// ✅ Good: Sanitize HTML content
import DOMPurify from 'dompurify'

const sanitizeHtml = (dirty: string): string => {
  return DOMPurify.sanitize(dirty, {
    ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'a'],
    ALLOWED_ATTR: ['href']
  })
}

// ✅ Good: Escape user content in templates
<template>
  <!-- Vue automatically escapes {{ }} -->
  <div>{{ userContent }}</div>
  
  <!-- Only use v-html with sanitized content -->
  <div v-html="sanitizeHtml(userContent)" />
</template>
```

## Authentication

### JWT Token Handling

```typescript
// ✅ Good: Secure token storage
const TOKEN_KEY = 'auth_token'

const setAuthToken = (token: string) => {
  // Store in httpOnly cookie (preferred) or sessionStorage
  sessionStorage.setItem(TOKEN_KEY, token)
}

const getAuthToken = (): string | null => {
  return sessionStorage.getItem(TOKEN_KEY)
}

const clearAuthToken = () => {
  sessionStorage.removeItem(TOKEN_KEY)
}

// ❌ Bad: Storing tokens in localStorage (vulnerable to XSS)
localStorage.setItem('token', token)
```

### Secure API Requests

```typescript
// ✅ Good: Include auth token in requests
import axios from 'axios'

const api = axios.create({
  baseURL: import.meta.env.VITE_APP_BACKEND_URL
})

// Add auth token to requests
api.interceptors.request.use((config) => {
  const token = getAuthToken()
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

// Handle auth errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Clear invalid token and redirect to login
      clearAuthToken()
      window.location.href = '/login'
    }
    return Promise.reject(error)
  }
)
```

### Password Security

```typescript
// Backend: Hash passwords
import bcrypt from 'bcrypt'

const SALT_ROUNDS = 12

const hashPassword = async (password: string): Promise<string> => {
  return await bcrypt.hash(password, SALT_ROUNDS)
}

const verifyPassword = async (
  password: string,
  hash: string
): Promise<boolean> => {
  return await bcrypt.compare(password, hash)
}

// ✅ Good: Password strength validation
const passwordSchema = z.string()
  .min(8, 'Password must be at least 8 characters')
  .max(100, 'Password must be less than 100 characters')
  .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
  .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
  .regex(/[0-9]/, 'Password must contain at least one number')
  .regex(/[^A-Za-z0-9]/, 'Password must contain at least one special character')
```

## Web3 Security

### Contract Address Validation

```typescript
// ✅ Good: Validate contract addresses
import { isAddress } from 'viem'

const validateContractAddress = (address: string): boolean => {
  if (!isAddress(address)) {
    return false
  }
  
  // Additional checks for known malicious addresses
  const blacklist = ['0x...', '0x...'] // Known malicious addresses
  if (blacklist.includes(address.toLowerCase())) {
    return false
  }
  
  return true
}
```

### Transaction Verification

```typescript
// ✅ Good: Verify transaction parameters
const validateTransferParams = (
  recipient: string,
  amount: bigint,
  balance: bigint
): { valid: boolean; error?: string } => {
  if (!isAddress(recipient)) {
    return { valid: false, error: 'Invalid recipient address' }
  }
  
  if (amount <= 0n) {
    return { valid: false, error: 'Amount must be greater than 0' }
  }
  
  if (amount > balance) {
    return { valid: false, error: 'Insufficient balance' }
  }
  
  return { valid: true }
}

const transfer = async (recipient: string, amount: bigint) => {
  const validation = validateTransferParams(recipient, amount, balance.value)
  
  if (!validation.valid) {
    addErrorToast(validation.error!)
    return
  }
  
  // Proceed with transfer
  await writeContract({
    address: CONTRACT_ADDRESS,
    abi: CONTRACT_ABI,
    functionName: 'transfer',
    args: [recipient as Address, amount]
  })
}
```

### Signature Security

```typescript
// ✅ Good: Verify message signatures
import { verifyMessage } from 'viem'

const verifySignedMessage = async (
  address: Address,
  message: string,
  signature: `0x${string}`
): Promise<boolean> => {
  try {
    const verified = await verifyMessage({
      address,
      message,
      signature
    })
    return verified
  } catch {
    return false
  }
}

// ❌ Bad: Signing arbitrary messages
// Never sign messages you don't understand or from untrusted sources

// ✅ Good: Use structured, readable message formats
const createSignatureMessage = (action: string, timestamp: number): string => {
  return `
CNC Portal Action: ${action}
Timestamp: ${timestamp}
Please sign this message to verify your wallet ownership.
  `.trim()
}
```

### Smart Contract Allowances

```typescript
// ✅ Good: Use specific allowances, not unlimited
const approveTokens = async (spender: Address, amount: bigint) => {
  // Approve exact amount needed
  await writeContract({
    address: TOKEN_ADDRESS,
    abi: ERC20_ABI,
    functionName: 'approve',
    args: [spender, amount]
  })
}

// ❌ Bad: Unlimited approval (security risk)
const unsafeApprove = async (spender: Address) => {
  const MAX_UINT256 = BigInt('0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff')
  await writeContract({
    address: TOKEN_ADDRESS,
    abi: ERC20_ABI,
    functionName: 'approve',
    args: [spender, MAX_UINT256] // Never do this!
  })
}
```

## CSRF Protection

### Backend CSRF Tokens

```typescript
import csrf from 'csurf'

// ✅ Good: Enable CSRF protection
const csrfProtection = csrf({ cookie: true })

app.use(csrfProtection)

app.get('/api/form', (req, res) => {
  res.json({ csrfToken: req.csrfToken() })
})

app.post('/api/submit', csrfProtection, (req, res) => {
  // Protected endpoint
  res.json({ success: true })
})
```

### Frontend CSRF Handling

```typescript
// ✅ Good: Include CSRF token in requests
const api = axios.create({
  baseURL: import.meta.env.VITE_APP_BACKEND_URL,
  withCredentials: true // Include cookies
})

// Get CSRF token and include in requests
const fetchCsrfToken = async () => {
  const response = await api.get('/api/csrf-token')
  return response.data.csrfToken
}

api.interceptors.request.use(async (config) => {
  if (['post', 'put', 'delete'].includes(config.method || '')) {
    const csrfToken = await fetchCsrfToken()
    config.headers['X-CSRF-Token'] = csrfToken
  }
  return config
})
```

## SQL Injection Prevention

```typescript
// ✅ Good: Use parameterized queries with Prisma
const getUserByEmail = async (email: string) => {
  return await prisma.user.findUnique({
    where: { email } // Prisma automatically parameterizes
  })
}

// ✅ Good: Validate and sanitize before queries
const searchUsers = async (searchTerm: string) => {
  const sanitized = searchTerm.replace(/[^\w\s]/gi, '')
  
  return await prisma.user.findMany({
    where: {
      name: {
        contains: sanitized
      }
    }
  })
}

// ❌ Bad: Never use raw SQL with user input
const unsafeQuery = async (email: string) => {
  return await prisma.$queryRaw`SELECT * FROM users WHERE email = ${email}`
}
```

## XSS Prevention

### Content Security Policy

```typescript
// ✅ Good: Set Content Security Policy headers
app.use((req, res, next) => {
  res.setHeader(
    'Content-Security-Policy',
    "default-src 'self'; " +
    "script-src 'self' 'unsafe-inline' https://trusted-cdn.com; " +
    "style-src 'self' 'unsafe-inline'; " +
    "img-src 'self' data: https:; " +
    "font-src 'self' data:; " +
    "connect-src 'self' https://api.example.com;"
  )
  next()
})
```

### Safe Dynamic Content

```vue
<template>
  <!-- ✅ Good: Vue automatically escapes -->
  <div>{{ userInput }}</div>
  
  <!-- ✅ Good: Sanitize before using v-html -->
  <div v-html="sanitizedHtml" />
  
  <!-- ❌ Bad: Never use v-html with raw user input -->
  <div v-html="userInput" />
</template>

<script setup lang="ts">
import DOMPurify from 'dompurify'

const sanitizedHtml = computed(() => 
  DOMPurify.sanitize(userInput.value)
)
</script>
```

## Rate Limiting

### Backend Rate Limiting

```typescript
import rateLimit from 'express-rate-limit'

// ✅ Good: Rate limit API endpoints
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later.'
})

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5, // Stricter limit for auth endpoints
  message: 'Too many login attempts, please try again later.'
})

app.use('/api/', apiLimiter)
app.use('/api/auth/', authLimiter)
```

### Frontend Request Throttling

```typescript
// ✅ Good: Debounce user actions
import { useDebounceFn } from '@vueuse/core'

const debouncedSearch = useDebounceFn(async (query: string) => {
  await performSearch(query)
}, 300)

// ✅ Good: Prevent duplicate submissions
const isSubmitting = ref(false)

const handleSubmit = async () => {
  if (isSubmitting.value) return
  
  isSubmitting.value = true
  try {
    await submitForm()
  } finally {
    isSubmitting.value = false
  }
}
```

## Environment Variables

### Secure Configuration

```typescript
// ✅ Good: Never commit secrets
// .env (add to .gitignore)
SECRET_KEY=your_secret_key_here
DATABASE_URL=postgresql://user:pass@localhost:5432/db
PRIVATE_KEY=0x...

// ✅ Good: Use different configs per environment
// .env.production
VITE_APP_BACKEND_URL=https://api.production.com
VITE_APP_NETWORK_ALIAS=mainnet

// .env.development
VITE_APP_BACKEND_URL=http://localhost:8000
VITE_APP_NETWORK_ALIAS=sepolia

// ✅ Good: Validate required env vars
const requiredEnvVars = [
  'SECRET_KEY',
  'DATABASE_URL',
  'FRONTEND_URL'
]

requiredEnvVars.forEach((envVar) => {
  if (!process.env[envVar]) {
    throw new Error(`Missing required environment variable: ${envVar}`)
  }
})
```

## CORS Configuration

```typescript
import cors from 'cors'

// ✅ Good: Restrictive CORS policy
const corsOptions = {
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true,
  optionsSuccessStatus: 200
}

app.use(cors(corsOptions))

// ❌ Bad: Wildcard CORS (security risk)
app.use(cors({ origin: '*' }))
```

## Security Headers

```typescript
import helmet from 'helmet'

// ✅ Good: Use Helmet for security headers
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", 'data:', 'https:']
    }
  },
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true
  }
}))
```

## Logging and Monitoring

```typescript
// ✅ Good: Log security events
const logSecurityEvent = (event: string, details: any) => {
  console.log({
    timestamp: new Date().toISOString(),
    event,
    details,
    ip: details.ip,
    userAgent: details.userAgent
  })
}

// Log failed login attempts
app.post('/api/login', async (req, res) => {
  try {
    const user = await authenticateUser(req.body)
    res.json({ user })
  } catch (error) {
    logSecurityEvent('failed_login', {
      email: req.body.email,
      ip: req.ip,
      userAgent: req.get('user-agent')
    })
    res.status(401).json({ error: 'Invalid credentials' })
  }
})

// ❌ Bad: Don't log sensitive data
console.log('User password:', user.password) // Never do this!
console.log('JWT token:', token) // Never do this!
```

## Security Checklist

### Frontend
- [ ] Validate all user input
- [ ] Sanitize HTML content before display
- [ ] Use HTTPS in production
- [ ] Implement CSP headers
- [ ] Store tokens securely
- [ ] Validate Ethereum addresses
- [ ] Verify transaction parameters
- [ ] Use specific contract allowances

### Backend
- [ ] Validate and sanitize all inputs
- [ ] Use parameterized queries
- [ ] Hash passwords with bcrypt
- [ ] Implement CSRF protection
- [ ] Enable rate limiting
- [ ] Set secure HTTP headers
- [ ] Configure CORS properly
- [ ] Log security events
- [ ] Never expose sensitive data in errors
- [ ] Use environment variables for secrets

### Smart Contracts
- [ ] Audit smart contracts
- [ ] Implement access controls
- [ ] Validate all inputs
- [ ] Handle reentrancy
- [ ] Use safe math operations
- [ ] Test edge cases thoroughly

## Resources

- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [Web3 Security Best Practices](https://consensys.github.io/smart-contract-best-practices/)
- [JWT Best Practices](https://tools.ietf.org/html/rfc8725)
- [Content Security Policy](https://developer.mozilla.org/en-US/docs/Web/HTTP/CSP)
