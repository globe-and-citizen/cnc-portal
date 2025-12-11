# CNC Portal - Security Standards

**Version:** 1.0.0  
**Last Updated:** December 7, 2025

---

## Overview

This document defines security standards and requirements for all features in the CNC Portal platform.

## Authentication

### JWT Token Requirements

All API endpoints require JWT authentication unless explicitly marked as public.

**Token Specifications:**

- Issued by backend authentication service after wallet signature verification
- Stored in browser localStorage
- Included in Authorization header: `Bearer <token>`
- Token expiry: 24 hours
- Refresh token mechanism (if implemented)

**Token Validation Process:**

1. Check token presence in Authorization header
2. Verify token signature
3. Check token expiration
4. Extract user ID from token payload
5. Verify user exists in database

### Sign-In with Ethereum (SIWE)

**Wallet-Based Authentication:**

- Users authenticate using Ethereum wallet signatures
- No passwords required
- Non-custodial - users retain control of their keys
- Challenge-response protocol prevents replay attacks

**SIWE Message Format:**

```
[Domain] wants you to sign in with your Ethereum account:
[Address]

[Statement]

URI: [URI]
Version: 1
Chain ID: [Chain ID]
Nonce: [Nonce]
Issued At: [Timestamp]
```

## Authorization

### Access Control Rules

**Role-Based Access Control (RBAC):**

- Platform Administrators: Full access to all resources
- Team Owners: Full access to their team resources
- Team Members: Read access to their team resources
- Regular Users: Access to their own resources only

**Resource-Level Permissions:**

- Verify user ownership before allowing modifications
- Team-specific data filtered by team membership
- Contract interactions verify on-chain ownership

**Middleware Implementation:**

```typescript
// Example authorization middleware
const authorize = (requiredRole) => {
  return async (req, res, next) => {
    // 1. Verify JWT token
    const token = req.headers.authorization?.split(' ')[1]
    if (!token) return res.status(401).json({ error: 'Unauthorized' })
    
    // 2. Extract user ID
    const decoded = jwt.verify(token, JWT_SECRET)
    
    // 3. If teamId parameter provided, verify access
    if (req.query.teamId) {
      const hasAccess = await verifyTeamAccess(decoded.userId, req.query.teamId)
      if (!hasAccess) return res.status(403).json({ error: 'Forbidden' })
    }
    
    // 4. Attach user to request
    req.user = decoded
    next()
  }
}
```

## Data Protection

### Sensitive Data Handling

**Protected Information:**

- Wallet private keys (never stored or transmitted)
- Email addresses (if collected)
- Personal identifiable information (PII)
- Financial data

**Security Measures:**

- Don't expose sensitive data in API responses
- Sanitize error messages (no stack traces to client)
- Mask sensitive fields in logs
- Use parameterized queries (Prisma ORM prevents SQL injection)

### Encryption

**In Transit:**

- All communications over HTTPS/TLS
- Minimum TLS 1.2
- Strong cipher suites only
- Certificate pinning (mobile apps)

**At Rest:**

- Database encryption at rest
- Encrypted backups
- Secure key management
- Environment variables for secrets

## Rate Limiting

### API Rate Limits

**Default Limits:**

- Endpoint: All `/api/*`
- Limit: 100,000 requests per 15 minutes per IP
- Response on limit exceeded: `429 Too Many Requests`
- Headers: `X-RateLimit-Limit`, `X-RateLimit-Remaining`, `X-RateLimit-Reset`

**Stricter Limits for Sensitive Endpoints:**

- Authentication endpoints: 10 requests per minute
- Password reset: 3 requests per hour
- Contract interactions: 50 requests per minute

**Implementation:**

```typescript
import rateLimit from 'express-rate-limit'

const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100000,
  standardHeaders: true,
  legacyHeaders: false,
  message: 'Too many requests, please try again later'
})

app.use('/api/', apiLimiter)
```

## Input Validation & Sanitization

### Validation Rules

**All Inputs Must Be Validated:**

- Type validation (string, number, boolean, etc.)
- Format validation (email, UUID, Ethereum address)
- Range validation (min/max length, value ranges)
- Enum validation (allowed values only)
- Required vs optional fields

**Validation Library:**

- Use Zod for TypeScript-first schema validation
- Define schemas for all API endpoints
- Validate both query parameters and request body

**Example Schema:**

```typescript
import { z } from 'zod'

export const userInputSchema = z.object({
  walletAddress: z.string().regex(/^0x[a-fA-F0-9]{40}$/),
  email: z.string().email().optional(),
  teamId: z.string().uuid()
})
```

### XSS Prevention

**Frontend (Vue/Nuxt):**

- Vue automatically escapes HTML in templates
- Use `v-text` instead of `v-html` where possible
- Sanitize user-generated content before display
- Use DOMPurify for HTML sanitization when needed

**Backend:**

- Escape output in non-JSON responses
- Set Content-Security-Policy headers
- Validate and sanitize all inputs

### SQL Injection Prevention

**Always Use Parameterized Queries:**

- Prisma ORM prevents SQL injection by design
- Never concatenate user input into SQL queries
- Use Prisma's type-safe query builder

```typescript
// ✅ Good: Parameterized with Prisma
const user = await prisma.user.findUnique({
  where: { walletAddress: userInput }
})

// ❌ Bad: String concatenation (don't do this)
const query = `SELECT * FROM users WHERE walletAddress = '${userInput}'`
```

## Smart Contract Security

### Contract Interaction Security

**Address Validation:**

- Always validate Ethereum addresses using `isAddress()` from viem
- Verify contract addresses match expected deployments
- Check contract code hash for verification

**Transaction Security:**

- Verify user has sufficient balance before transactions
- Estimate gas before sending transactions
- Handle transaction failures gracefully
- Implement transaction replay protection

**Access Control:**

- Smart contracts use OpenZeppelin's AccessControl
- Role-based permissions (OWNER, ADMIN, MINTER, etc.)
- Multi-signature for critical operations
- Time locks for sensitive actions

### Contract Upgradeability

**Beacon Proxy Pattern:**

- Implementation contracts are upgradeable
- Beacon contract controls implementation address
- Upgrade process requires admin role
- Storage layout compatibility checks

**Upgrade Security:**

- Multi-signature approval for upgrades
- Time delay before upgrade activation
- Comprehensive testing before deployment
- Audit trail for all upgrades

## Session Management

### Token Lifecycle

**Token Generation:**

- Generate tokens after successful SIWE verification
- Include user ID and minimal metadata
- Sign with secure secret key
- Set appropriate expiration time

**Token Storage:**

- Frontend stores in localStorage
- Include token in Authorization header
- Clear token on logout
- Automatic refresh before expiry (if supported)

**Token Revocation:**

- Implement token blacklist for immediate revocation
- Tokens expire automatically after 24 hours
- Force logout on security events

## Security Headers

### Required HTTP Headers

```
Content-Security-Policy: default-src 'self'
X-Content-Type-Options: nosniff
X-Frame-Options: DENY
X-XSS-Protection: 1; mode=block
Strict-Transport-Security: max-age=31536000; includeSubDomains
Referrer-Policy: strict-origin-when-cross-origin
Permissions-Policy: geolocation=(), microphone=(), camera=()
```

## Monitoring & Incident Response

### Security Monitoring

**Log Security Events:**

- Authentication failures
- Authorization denials
- Unusual access patterns
- Failed validation attempts
- Rate limit violations
- Contract interaction failures

**Alerting:**

- Real-time alerts for critical security events
- Automated response for known threats
- Integration with Sentry for error tracking
- Security dashboard for monitoring

### Incident Response

**Response Plan:**

1. Detect and assess security incident
2. Contain the threat (rate limiting, IP blocking, etc.)
3. Investigate root cause
4. Remediate vulnerability
5. Notify affected users (if applicable)
6. Document incident and lessons learned

**Security Contacts:**

- Maintain security contact email
- Security disclosure policy
- Bug bounty program (planned)

## Compliance & Best Practices

### Data Privacy

**GDPR Considerations:**

- Minimal data collection
- User consent for data processing
- Right to data deletion
- Data export functionality
- Privacy policy disclosure

### Audit Trail

**Logging Requirements:**

- Log all administrative actions
- Track data modifications
- Blockchain transactions are inherently auditable
- Retain logs for compliance period

### Regular Security Reviews

**Schedule:**

- Monthly security scans
- Quarterly penetration testing
- Annual third-party security audit
- Continuous dependency updates

**Tools:**

- Automated vulnerability scanning
- Dependency checking (npm audit, Snyk)
- Smart contract audits
- Code review process

## Security Checklist for Features

When implementing new features, ensure:

- [ ] All endpoints require authentication
- [ ] Authorization rules implemented
- [ ] Input validation with Zod schemas
- [ ] Rate limiting configured
- [ ] XSS prevention measures in place
- [ ] SQL injection prevention (Prisma)
- [ ] HTTPS/TLS for all communications
- [ ] Sensitive data not exposed
- [ ] Error messages sanitized
- [ ] Security headers configured
- [ ] Logging for security events
- [ ] Contract addresses validated
- [ ] Gas estimation for transactions
- [ ] Access control for smart contracts
- [ ] Security tests written
- [ ] Code reviewed by security-aware developer

---

For feature-specific security considerations, see individual feature specifications in `/docs/features/`.
