# CNC Portal - System Architecture

**Version:** 1.0.0  
**Last Updated:** December 7, 2025

---

## Overview

The CNC Portal is a multi-component decentralized application that enables financial recognition of micro contributions in open-source projects and promotes effective governance tools.

## System Architecture

```
┌──────────────────────────────────────────────────────┐
│                  CNC Portal Platform                  │
├──────────────────────────────────────────────────────┤
│                                                       │
│  ┌─────────────┐  ┌──────────────┐  ┌────────────┐ │
│  │   Vue App   │  │Nuxt Dashboard│  │  Contract  │ │
│  │  (Frontend) │  │  (Frontend)  │  │ (Hardhat)  │ │
│  └──────┬──────┘  └──────┬───────┘  └─────┬──────┘ │
│         │                 │                 │        │
│         └────────┬────────┘                 │        │
│                  │ REST/JWT                 │        │
│                  ▼                          │        │
│         ┌────────────────┐                  │        │
│         │  Express API   │                  │        │
│         │   (Backend)    │◄─────────────────┘        │
│         └────────┬───────┘      Web3                 │
│                  │                                    │
│                  ▼                                    │
│         ┌────────────────┐                           │
│         │   PostgreSQL   │                           │
│         │   (Database)   │                           │
│         └────────────────┘                           │
│                                                       │
└──────────────────────────────────────────────────────┘
```

## Technology Stack

### Frontend Applications

**Vue App** (`/app`)

- Vue.js 3 with Composition API
- TypeScript 5.x
- Vite build tool
- Pinia for state management
- Wagmi for Web3 integration
- Tailwind CSS + daisyUI

**Nuxt Dashboard** (`/dashboard`)

- Nuxt 3.x (SSR disabled for SPA mode)
- Vue 3 Composition API
- TypeScript 5.x
- Nuxt UI component library
- VueUse composables
- Chart.js for visualizations

### Backend

**Express API** (`/backend`)

- Node.js 22.18.0+
- Express.js 4.x
- TypeScript 5.x
- Prisma ORM 5.x for database access
- PostgreSQL 14+ database
- Zod 4.x for validation
- JWT for authentication
- Swagger/OpenAPI documentation

### Smart Contracts

**Hardhat Project** (`/contract`)

- Hardhat development environment
- Solidity smart contracts
- TypeScript for tests and scripts
- Beacon Proxy pattern for upgradeability
- Ethers.js for blockchain interaction

### Supporting Services

**The Graph** (`/the-graph`)

- GraphQL API for blockchain data indexing
- Subgraph for querying contract events

## Component Communication

### Frontend → Backend

**Protocol:** HTTPS/REST  
**Authentication:** JWT Bearer tokens  
**Data Format:** JSON

```typescript
// Example API call
const response = await fetch(`${BACKEND_URL}/api/stats/overview`, {
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  }
})
```

### Backend → Database

**ORM:** Prisma  
**Database:** PostgreSQL  
**Connection:** Connection pooling

```typescript
// Example Prisma query
const users = await prisma.user.findMany({
  where: { createdAt: { gte: startDate } },
  include: { teams: true }
})
```

### Frontend → Smart Contracts

**Library:** Wagmi (Vue) / Ethers.js  
**Protocol:** JSON-RPC via provider  
**Networks:** Ethereum mainnet, Sepolia testnet

```typescript
// Example contract interaction
const { data } = await readContract(config, {
  address: contractAddress,
  abi: contractABI,
  functionName: 'balanceOf',
  args: [userAddress]
})
```

## Data Flow

### User Authentication Flow

```
1. User connects wallet (MetaMask, WalletConnect)
   ↓
2. Frontend requests SIWE message from backend
   ↓
3. User signs message with wallet
   ↓
4. Backend verifies signature
   ↓
5. Backend issues JWT token
   ↓
6. Frontend stores token in localStorage
   ↓
7. Frontend includes token in subsequent API calls
```

### Data Persistence

**Web2 Data (PostgreSQL):**

- User profiles
- Team metadata
- Claims and time tracking
- Expenses
- Notifications
- Activity logs

**Web3 Data (Blockchain):**

- Equity tokens (ERC20)
- Governance actions
- Board elections
- Contract deployments
- Wage distributions
- Dividend payments

### Hybrid Data Model

The platform uses a hybrid approach:

- **Off-chain:** User interactions, claims, time tracking (fast, low cost)
- **On-chain:** Financial transactions, governance, token management (transparent, immutable)
- **Synchronization:** The Graph indexes blockchain events for efficient querying

## Scalability Considerations

### Horizontal Scaling

**Backend API:**

- Stateless design allows multiple API server instances
- Load balancer distributes traffic
- Session state stored in JWT (client-side)

**Database:**

- Read replicas for analytics queries
- Connection pooling to manage connections
- Indexed columns for query optimization

### Caching Strategy

**Application Level:**

- Redis for frequently accessed data
- Cache key namespacing by feature
- TTL-based invalidation
- Event-driven cache invalidation

**CDN Level:**

- Static assets served via CDN
- Edge caching for public endpoints
- Geographic distribution

### Performance Targets

- **API Response Time:** < 500ms (95th percentile)
- **Frontend Load Time:** < 2s (First Contentful Paint)
- **Database Query Time:** < 100ms (95th percentile)
- **Contract Interaction:** < 30s (including confirmation)

## Database Schema

The database uses Prisma ORM with the following core entities:

**Core Entities:**

- User (wallet-based authentication)
- Team (organizations/projects)
- Claim (time tracking submissions)
- WeeklyClaim (aggregated weekly claims)
- Wage (compensation rates)
- Expense (expense submissions)
- TeamContract (deployed smart contract references)
- BoardOfDirectorActions (governance actions)
- MemberTeamsData (team membership)
- Notification (user notifications)

**Relationships:**

- Users ↔ Teams (many-to-many via MemberTeamsData)
- Teams → TeamContracts (one-to-many)
- Users → Claims (one-to-many)
- Teams → Expenses (one-to-many)
- Teams → BoardOfDirectorActions (one-to-many)

For complete schema, see `/backend/prisma/schema.prisma`

## Deployment Architecture

### Development Environment

```
Local Development:
- Frontend: localhost:5173 (Vite dev server)
- Dashboard: localhost:3001 (Nuxt dev server)
- Backend: localhost:3000 (Express)
- Database: localhost:5432 (PostgreSQL)
- Contracts: Hardhat local network or testnet
```

### Production Environment

```
Production:
- Frontend: CDN + Static hosting
- Dashboard: CDN + Static hosting
- Backend: Cloud VMs with load balancer
- Database: Managed PostgreSQL (with backups)
- Contracts: Ethereum mainnet
- Monitoring: Application Performance Monitoring (APM)
```

## Security Architecture

**Authentication:**

- Sign-In with Ethereum (SIWE) for wallet-based auth
- JWT tokens with short expiry (24h)
- Refresh token mechanism
- Token validation on every API request

**Authorization:**

- Role-based access control (RBAC)
- Team ownership verification
- Resource-level permissions
- Smart contract access control (Ownable, AccessControl)

**Data Protection:**

- HTTPS/TLS for all communications
- Environment variables for secrets
- Parameterized queries (SQL injection prevention)
- Input validation with Zod schemas
- XSS prevention (Vue auto-escaping)
- Rate limiting on API endpoints

## Monitoring & Observability

**Logging:**

- Structured logging (JSON format)
- Log levels: ERROR, WARN, INFO, DEBUG
- Request/response logging
- Error stack traces with Sentry

**Metrics:**

- API response times
- Error rates
- Database query performance
- Smart contract gas usage
- User activity metrics

**Alerting:**

- Critical error notifications
- Performance degradation alerts
- Database connection pool alerts
- Security incident notifications

## Disaster Recovery

**Backup Strategy:**

- Database: Daily automated backups with 30-day retention
- Configuration: Version controlled in Git
- Smart contracts: Immutable on blockchain
- User data: Redundant storage

**Recovery Procedures:**

- Database restoration from backup
- Application redeployment from Git
- Contract state verification
- Data integrity checks

## Future Architecture Considerations

**Planned Improvements:**

- Microservices architecture for backend
- Message queue for asynchronous processing
- GraphQL API layer
- Real-time WebSocket connections
- Enhanced caching with Redis
- Container orchestration (Kubernetes)
- Service mesh for microservices
- Advanced monitoring with distributed tracing

---

For specific implementation details, see:

- [Security Standards](./security.md)
- [Performance Optimization](./performance.md)
- [Deployment Procedures](./deployment.md)
- [Development Standards](./development-standards.md)
