# CNC Portal GitHub Copilot Instructions

Always reference these instructions first and fallback to search or bash commands only when you encounter unexpected information that does not match the info here.

The CNC Portal is a multi-component application consisting of a Vue.js frontend (`app/`), Express.js backend (`backend/`), and Hardhat smart contracts (`contract/`). The project enables financial recognition of micro contributions in open-source projects and promotes effective governance tools.

## Critical Network Limitations

**WARNING**: This codebase has dependencies that download from external CDNs which may be blocked in restricted network environments:

- **Frontend (`app/`)**: `npm install` fails due to `cdn.sheetjs.com` firewall restrictions (node-xlsx package)
- **Backend**: `npx prisma generate` fails due to `binaries.prisma.sh` firewall restrictions  
- **Contracts**: `npx hardhat compile` and `npx hardhat test` fail due to `binaries.soliditylang.org` firewall restrictions

If you encounter these issues, document them clearly and use Docker Compose or pre-built environments when available.

## Working Effectively 

### Initial Setup Requirements
- Node.js v20.10.0 or higher (tested with v20.19.4)
- Docker and Docker Compose (for alternative setup)
- PostgreSQL database (local or containerized)

### Component Installation and Build Process

#### 1. Backend Setup (WORKS - 60 seconds)
```bash
cd backend/
npm ci  # ~55 seconds - NEVER CANCEL, set timeout to 120+ seconds
```

**If network allows Prisma**:
```bash
npx prisma generate  # Required before build/test - ~30 seconds
npm run build  # ~5 seconds after Prisma generation
```

**Network Issues**: If `npx prisma generate` fails with `binaries.prisma.sh` error, use Docker Compose setup instead.

#### 2. Contract Setup (PARTIAL - 60 seconds)  
```bash
cd contract/
npm ci  # ~57 seconds - NEVER CANCEL, set timeout to 120+ seconds
npm run lint  # ~2 seconds - WORKS (with TypeScript warnings)
```

**Network Issues**: `npm run compile` and `npm run test` fail due to Solidity compiler download restrictions.

#### 3. Frontend Setup (BLOCKED)
```bash
cd app/
npm ci  # FAILS due to cdn.sheetjs.com restrictions
```

**Network Issues**: Frontend installation is blocked. Use Docker Compose for complete environment.

### Docker Compose Alternative (RECOMMENDED for restricted networks)
```bash
# Full stack with database
docker compose up --build  # NEVER CANCEL - may take 15-45 minutes depending on network
```

Access points after successful Docker build:
- Frontend: http://localhost:5173 
- Backend API: http://localhost:3000
- Database: PostgreSQL on port 5432

## Testing and Validation

### Backend Testing (PARTIAL - 5 seconds)
```bash
cd backend/
npm run test  # ~4 seconds - utility tests pass, others need Prisma
```

**Prerequisites**: Requires `npx prisma generate` to be successful for full test suite.

**Test Results Without Prisma**: 
- 8/8 utility tests pass
- 10 controller test suites fail due to missing Prisma client

### Contract Testing (BLOCKED)
```bash
cd contract/
npm run test  # FAILS - requires Solidity compiler download
```

### Frontend Testing (BLOCKED)
Cannot test without successful dependency installation.

## Environment Configuration

### Backend Environment Variables
Create `backend/.env` with:
```env
SECRET_KEY="your-jwt-secret-key"
DATABASE_URL="postgres://username:password@localhost:5432/cnc-db"
FRONTEND_URL="http://localhost:5173"
CHAIN_ID=11155111  # Sepolia Testnet
```

### Frontend Environment Variables  
Create `app/.env` with:
```env
VITE_APP_BACKEND_URL=http://localhost:8000
VITE_APP_NETWORK_ALIAS=hardhat  # or polygon, sepolia, etc.
VITE_APP_ETHERSCAN_URL=https://sepolia.etherscan.io
```

### Contract Environment Variables
Create `contract/.env` with:
```env
ALCHEMY_API_KEY=your-alchemy-api-key
ALCHEMY_HTTP=your-alchemy-http-url
PRIVATE_KEY=your-wallet-private-key
```

## Validation Scenarios

### Backend API Validation (when Prisma works)
1. Start backend: `npm run start` 
2. Test health endpoint: `curl http://localhost:8000/health`
3. Check API documentation: `http://localhost:8000/docs`

### Contract Validation (when compiler works)  
1. Compile contracts: `npm run compile`
2. Run tests: `npm run test`
3. Deploy locally: `npm run deploy`

### Frontend Validation (when dependencies install)
1. Start development server: `npm run dev`
2. Access application: `http://localhost:5173`
3. Test wallet connection and basic navigation

## Contribution Workflow

### Code Quality Commands (when available)
- **Backend**: No lint/format scripts available (inconsistency with docs)
- **Frontend**: `npm run lint`, `npm run format`, `npm run type-check`
- **Contract**: `npm run lint`, `npm run format`

### Pre-commit Checklist
Run these commands before committing (when network allows):

**Frontend** (`app/`):
```bash
npm run build        # ~30 seconds - NEVER CANCEL  
npm run test         # E2E tests - may take 5+ minutes
npm run test:unit    # ~10 seconds
npm run type-check   # ~5 seconds  
npm run lint         # ~3 seconds
npm run format       # ~2 seconds
```

**Backend** (`backend/`):
```bash
npm run build        # ~5 seconds after Prisma setup
npm run test         # ~4 seconds (partial without database)
# No lint/format scripts available
```

**Contract** (`contract/`):
```bash
npm run test         # BLOCKED by network restrictions
npm run lint         # ~2 seconds - WORKS  
npm run format       # ~1 second
```

## Common Issues and Workarounds

### Issue: "cdn.sheetjs.com" ENOTFOUND
**Solution**: Use Docker Compose or remove node-xlsx dependency temporarily.

### Issue: "binaries.prisma.sh" ENOTFOUND  
**Solution**: Use Docker Compose with pre-built Prisma client or use production environment.

### Issue: "binaries.soliditylang.org" ENOTFOUND
**Solution**: Use Docker Compose or pre-install Solidity compiler locally.

### Issue: "@typescript-eslint" version warning
**Expected**: Contract linting shows TypeScript 5.7.2 incompatibility warning but completes successfully.

### Issue: Backend missing lint/format scripts
**Expected**: Despite CONTRIBUTION.md mentioning them, backend package.json lacks these scripts.

## Repository Structure Reference

```
.
├── app/                 # Vue.js frontend (TypeScript, Vite, Web3)
├── backend/             # Express.js API (TypeScript, Prisma, PostgreSQL)  
├── contract/            # Hardhat smart contracts (Solidity, TypeScript)
├── docker-compose.yml   # Full stack setup
├── README.md            # Main documentation
└── CONTRIBUTION.md      # Contribution guidelines
```

### Key Folders to Monitor
- `app/src/components/` - Vue components
- `app/src/stores/` - Pinia state management
- `backend/src/controllers/` - API endpoints
- `backend/prisma/schema.prisma` - Database schema
- `contract/contracts/` - Solidity smart contracts
- `contract/test/` - Contract test suites

## Timing Expectations

- **Dependency Installation**: 55-60 seconds per component - NEVER CANCEL, set 120+ second timeouts
- **Docker Compose Build**: 15-45 minutes - NEVER CANCEL, set 60+ minute timeouts  
- **Backend Tests**: 4 seconds (partial), up to 30 seconds (full with database)
- **Frontend Build**: 30 seconds - NEVER CANCEL, set 60+ second timeouts
- **Contract Compilation**: 5-10 seconds (when network allows)
- **E2E Tests**: 5-15 minutes - NEVER CANCEL, set 30+ minute timeouts

Always wait for commands to complete fully. Network timeouts are common and expected in restricted environments.