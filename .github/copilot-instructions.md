# CNC Portal GitHub Copilot Instructions

The CNC Portal is a multi-component application enabling financial recognition of micro contributions in open-source projects and promoting effective governance tools.

## Architecture Overview

**Tech Stack:**
- **Frontend** (`app/`): Vue.js 3, TypeScript, Vite, Pinia (state management), Web3 integration with wagmi, tailwind & daisyUI
- **Backend** (`backend/`): Express.js, TypeScript, Prisma ORM, PostgreSQL, JWT authentication
- **Contracts** (`contract/`): Hardhat, Solidity, TypeScript testing, Ethereum blockchain integration

**Component Relationships:**
- Frontend communicates with backend via REST API and directly with smart contracts via Web3
- Backend manages user data, authentication, and serves as API gateway
- Smart contracts handle on-chain governance and contribution tracking

## Repository Structure

```
├── app/                 # Vue.js frontend application
│   ├── src/components/  # Vue components  
│   ├── src/stores/      # Pinia state management
│   └── src/views/       # Route components
├── backend/             # Express.js API server
│   ├── src/controllers/ # REST API endpoints
│   ├── src/models/      # Database models
│   └── prisma/          # Database schema and migrations
├── contract/            # Hardhat smart contract project
│   ├── contracts/       # Solidity smart contracts
│   ├── test/            # Contract test suites
│   └── scripts/         # Deployment scripts
└── docker-compose.yml   # Full stack orchestration
```

## Development Environment

**Requirements:**
- Node.js v22.18.0+
- PostgreSQL database
- Docker & Docker Compose (optional)

**Key Commands:**
- **Frontend**: `npm run dev`, `npm run build`, `npm run lint`, `npm run type-check`
- **Backend**: `npm run start`, `npm run build`, `npm run test`, `npx prisma generate`
- **Contracts**: `npm run compile`, `npm run test`, `npm run deploy`

**Environment Variables:**
- Backend: `SECRET_KEY`, `DATABASE_URL`, `FRONTEND_URL`, `CHAIN_ID`
- Frontend: `VITE_APP_BACKEND_URL`, `VITE_APP_NETWORK_ALIAS`, `VITE_APP_ETHERSCAN_URL`
- Contracts: `ALCHEMY_API_KEY`, `ALCHEMY_HTTP`, `PRIVATE_KEY`

## Development Patterns

**Frontend (Vue.js):**
- Uses Composition API with `<script setup lang="ts">` syntax
- Pinia stores for global state management
- TypeScript for type safety
- Vite for build tooling and HMR

**Backend (Express.js):**
- RESTful API design
- Prisma ORM for database operations
- JWT-based authentication
- TypeScript throughout

**Smart Contracts (Solidity):**
- Hardhat development environment
- Comprehensive test coverage with TypeScript
- Gas optimization considerations
- Multi-network deployment support

## Code Quality Standards

**Frontend:**
- ESLint + Prettier for code formatting
- Vue style guide compliance
- TypeScript strict mode
- Component testing with Vitest

**Backend:**
- TypeScript compilation
- Prisma client generation required
- Comprehensive test suite (163 tests)
- Note: Linting scripts not currently available

**Contracts:**
- Solidity linting and formatting
- Extensive test coverage (350+ tests)
- TypeScript for test files
- Gas usage reporting