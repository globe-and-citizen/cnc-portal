# CNC Portal GitHub Copilot Instructions

Always reference these instructions first and fallback to search or bash commands only when you encounter unexpected information that does not match the info here.

The CNC Portal is a multi-component application consisting of a Vue.js frontend (`app/`), Express.js backend (`backend/`), and Hardhat smart contracts (`contract/`). The project enables financial recognition of micro contributions in open-source projects and promotes effective governance tools.

## Network Dependencies (Resolved)

**NOTE**: This codebase has dependencies that download from external CDNs. These have been allowlisted for the repository:

- **Frontend (`app/`)**: `cdn.sheetjs.com` (node-xlsx package) - ✅ WORKING
- **Backend**: `binaries.prisma.sh` (Prisma client generation) - ✅ WORKING
- **Contracts**: `binaries.soliditylang.org` (Solidity compiler) - ✅ WORKING

All network restrictions have been resolved. Development can proceed normally with all components.

## Working Effectively 

### Initial Setup Requirements
- Node.js v22.18.0 or higher (tested with v22.18.0)
- Docker and Docker Compose (for alternative setup)
- PostgreSQL database (local or containerized)

### Component Installation and Build Process

#### 1. Backend Setup (WORKS - 55 seconds)
```bash
cd backend/
npm ci  # ~55 seconds - NEVER CANCEL, set timeout to 120+ seconds
npx prisma generate  # ~30 seconds - generates Prisma client
npm run build  # ~5 seconds after Prisma generation
```

**✅ All backend operations now working**

#### 2. Contract Setup (WORKS - 20 seconds)  
```bash
cd contract/
npm ci  # ~20 seconds - NEVER CANCEL, set timeout to 120+ seconds
npm run compile  # ~10 seconds - compiles Solidity contracts
npm run test  # ~15 seconds - runs 350 contract tests
npm run lint  # ~2 seconds - lints TypeScript code
```

**✅ All contract operations now working**

#### 3. Frontend Setup (WORKS - 47 seconds)
```bash
cd app/
npm ci  # ~47 seconds - installs all dependencies
npm run build  # ~23 seconds - builds production bundle
npm run lint  # ~3 seconds - lints Vue/TypeScript code
npm run type-check  # ~5 seconds - TypeScript type checking
```

**✅ All frontend operations now working**

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

### Backend Testing (FULL - 5 seconds)
```bash
cd backend/
npm run test  # ~5 seconds - all 163 tests pass with full Prisma support
```

**✅ Prerequisites met**: Prisma client generated successfully, all controller tests now pass.

### Contract Testing (WORKS - 15 seconds)
```bash
cd contract/
npm run test  # ~15 seconds - all 350 tests pass
```

**✅ All contract tests working**: Solidity compiler downloads successfully.

### Frontend Testing (READY)
```bash
cd app/
npm run test:unit  # ~10 seconds - unit tests
npm run test  # E2E tests - may take 5+ minutes
```

**✅ Ready for testing**: Dependencies installed successfully, can run all test suites.

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

### Backend API Validation
1. Start backend: `npm run start` 
2. Test health endpoint: `curl http://localhost:8000/health`
3. Check API documentation: `http://localhost:8000/docs`

### Contract Validation
1. Compile contracts: `npm run compile`
2. Run tests: `npm run test`
3. Deploy locally: `npm run deploy`

### Frontend Validation
1. Start development server: `npm run dev`
2. Access application: `http://localhost:5173`
3. Test wallet connection and basic navigation

## Contribution Workflow

### Code Quality Commands
- **Backend**: No lint/format scripts available (inconsistency with docs)
- **Frontend**: `npm run lint`, `npm run format`, `npm run type-check` - ✅ All working
- **Contract**: `npm run lint`, `npm run format` - ✅ All working

### Pre-commit Checklist
Run these commands before committing:

**Frontend** (`app/`):
```bash
npm run build        # ~23 seconds - production build
npm run test         # E2E tests - may take 5+ minutes
npm run test:unit    # ~10 seconds - unit tests
npm run type-check   # ~5 seconds - TypeScript validation  
npm run lint         # ~3 seconds - code linting
npm run format       # ~2 seconds - code formatting
```

**Backend** (`backend/`):
```bash
npx prisma generate  # ~30 seconds - generate Prisma client
npm run build        # ~5 seconds - TypeScript compilation
npm run test         # ~5 seconds - all 163 tests
# No lint/format scripts available
```

**Contract** (`contract/`):
```bash
npm run compile      # ~10 seconds - Solidity compilation
npm run test         # ~15 seconds - all 350 tests
npm run lint         # ~2 seconds - TypeScript linting
npm run format       # ~1 second - code formatting
```

## Common Issues and Workarounds

### Issue: "@typescript-eslint" version warning
**Expected**: Contract linting shows TypeScript 5.7.2 incompatibility warning but completes successfully.

### Issue: Backend missing lint/format scripts
**Expected**: Despite CONTRIBUTION.md mentioning them, backend package.json lacks these scripts.

### Issue: Frontend ESLint warnings
**Expected**: Some files exceed the 300-line limit but this is a warning, not an error.

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

- **Dependency Installation**: 20-55 seconds per component - NEVER CANCEL, set 120+ second timeouts
- **Docker Compose Build**: 15-45 minutes - NEVER CANCEL, set 60+ minute timeouts  
- **Backend Tests**: 5 seconds (all 163 tests with Prisma)
- **Frontend Build**: 23 seconds - NEVER CANCEL, set 60+ second timeouts
- **Contract Compilation**: 10 seconds
- **Contract Tests**: 15 seconds (all 350 tests)
- **E2E Tests**: 5-15 minutes - NEVER CANCEL, set 30+ minute timeouts

Always wait for commands to complete fully. All network dependencies are now resolved.