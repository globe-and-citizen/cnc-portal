# Deployment Guide

## Overview

The CNC Portal is a multi-component application consisting of four main parts that work together:

1. **Frontend App** (Vue.js 3) - User-facing web application
2. **Backend API** (Express.js) - RESTful API server
3. **Smart Contracts** (Hardhat/Solidity) - Ethereum blockchain contracts
4. **Dashboard** (Nuxt) - Administrative application; see [dashboard setup](../../dashboard/README.md)

This guide covers frontend, backend, and contract deployment. The dashboard owns its separate setup instructions. Contract activity is read
through the shared [RPC event feeds](../implementation/contract-event-feeds/README.md).

## Architecture

```mermaid
graph TB
    subgraph "Client Layer"
        Browser[Web Browser]
    end

    subgraph "Application Layer"
        Frontend[Vue.js Frontend<br/>Port 80/443]
        API[Express.js API<br/>Port 3000]
    end

    subgraph "Data Layer"
        DB[(PostgreSQL<br/>Port 5432)]
        Contracts[Smart Contracts<br/>Ethereum Network]
    end

    Browser --> Frontend
    Frontend --> API
    Frontend --> Contracts
    API --> DB
    API --> Contracts
```

## Prerequisites

### Required Software

- **Node.js** v22.18.0 or higher
- **npm** v10.0.0 or higher
- **Docker** and **Docker Compose** (for containerized deployment)
- **PostgreSQL** 16+ (if not using Docker)
- **Git** for version control

### Required Accounts

- **Google Cloud Platform** account (for Cloud Run deployment)
- **Alchemy** or **Infura** account (for Ethereum RPC access)
- **Etherscan** API key (for contract verification)
- **Domain registrar** access (for custom domain setup)

### Access Requirements

- Repository access (read/write for deployment automation)
- GCP project access with appropriate IAM roles
- Ethereum wallet with testnet/mainnet ETH for contract deployment
- Database credentials with admin access

## Environment Configuration

### Frontend Environment Variables

Create `/app/.env.production`:

```bash
# Backend API URL
VITE_APP_BACKEND_URL=https://api.cnc-portal.com

# Ethereum Network Configuration
VITE_APP_NETWORK_ALIAS=sepolia
VITE_APP_CHAIN_ID=11155111

# Block Explorer
VITE_APP_ETHERSCAN_URL=https://sepolia.etherscan.io

# Contract Addresses (updated after deployment)
VITE_APP_FACTORY_BEACON_ADDRESS=0x...
VITE_APP_BANK_BEACON_ADDRESS=0x...
VITE_APP_INVESTOR_BEACON_ADDRESS=0x...

# Feature Flags
VITE_APP_ENABLE_ANALYTICS=true
VITE_APP_ENABLE_DEBUG=false
```

### Backend Environment Variables

Create `/backend/.env.production`:

```bash
# Server Configuration
NODE_ENV=production
PORT=3000
FRONTEND_URL=https://cnc-portal.com

# Database Configuration
DATABASE_URL=postgresql://user:password@host:5432/cnc-db?schema=public

# JWT Authentication
SECRET_KEY=your-secure-secret-key-min-32-chars
JWT_EXPIRATION=7d

# SIWE Authentication
CHAIN_ID=11155111
DOMAIN=cnc-portal.com

# Rate Limiting
RATE_LIMIT_WINDOW=15m
RATE_LIMIT_MAX=100000

# Blockchain Configuration
RPC_URL=https://eth-sepolia.g.alchemy.com/v2/YOUR_API_KEY
CONTRACT_FACTORY_ADDRESS=0x...

# Google Cloud (for production deployment)
PROJECT_ID=your-gcp-project-id
LOCATION=us-central1

# Monitoring
SENTRY_DSN=https://...@sentry.io/...
LOG_LEVEL=info
```

### Contract Environment Variables

Create `/contract/.env`:

```bash
# Alchemy API Configuration
ALCHEMY_API_KEY=your-alchemy-api-key
ALCHEMY_HTTP=https://eth-sepolia.g.alchemy.com/v2/YOUR_API_KEY

# Deployment Wallet
PRIVATE_KEY=your-deployer-private-key

# Etherscan Verification
ETHERSCAN_API_KEY=your-etherscan-api-key

# Network Configuration
NETWORK=sepolia
CHAIN_ID=11155111

# Gas Configuration
GAS_PRICE=20
GAS_LIMIT=8000000

# Contract Addresses (updated after deployment)
FACTORY_BEACON_ADDRESS=0x...
```

## Deployment Procedures

### 1. Smart Contracts Deployment

Smart contracts must be deployed first as other components depend on contract addresses.

#### Step 1: Compile Contracts

```bash
cd contract/
npm install
npx hardhat compile
```

#### Step 2: Run Tests

```bash
# Run full test suite
npm test

# Generate coverage report
npm run coverage

# Verify coverage meets requirements (350+ tests)
```

#### Step 3: Deploy to Testnet

```bash
# Deploy to Sepolia testnet
npx hardhat run scripts/deploy.ts --network sepolia

# Save deployed addresses
# Output will show contract addresses - save these!
```

#### Step 4: Verify Contracts

```bash
# Verify FactoryBeacon
npx hardhat verify --network sepolia FACTORY_BEACON_ADDRESS

# Verify all beacon implementations
npx hardhat run scripts/verify-all.ts --network sepolia
```

#### Step 5: Initialize Beacons

```bash
# Run initialization script
npx hardhat run scripts/initialize-beacons.ts --network sepolia
```

#### Step 6: Update Configuration

Update contract addresses in:

- `/app/.env.production` (frontend environment)
- `/backend/.env.production` (backend environment)

#### Production Deployment

```bash
# Deploy to mainnet (requires confirmation)
npx hardhat run scripts/deploy.ts --network mainnet

# Verify on Etherscan
npx hardhat verify --network mainnet FACTORY_BEACON_ADDRESS

# Initialize production beacons
npx hardhat run scripts/initialize-beacons.ts --network mainnet
```

### 2. Backend API Deployment

#### Step 1: Database Setup

```bash
cd backend/

# Generate Prisma client
npx prisma generate

# Run migrations
npx prisma migrate deploy

# Seed database (optional, for development)
npx prisma db seed
```

#### Step 2: Build Application

```bash
# Install dependencies
npm ci --production

# Build TypeScript
npm run build

# Test build
NODE_ENV=production node dist/index.js
```

#### Step 3: Local Testing

```bash
# Run with production environment
npm run start

# Test API endpoints
curl http://localhost:3000/health
curl http://localhost:3000/api/v1/teams
```

#### Step 4: Deploy to Google Cloud Run

```bash
# Authenticate with GCP
gcloud auth login

# Set project
gcloud config set project YOUR_PROJECT_ID

# Build and deploy
gcloud builds submit --config=cloudbuild.prod.yaml

# Or use automated deployment
git push origin main  # Triggers Cloud Build
```

#### Step 5: Configure Cloud Run Service

```bash
# Set environment variables
gcloud run services update cnc-portal-api \
  --set-env-vars="NODE_ENV=production,DATABASE_URL=..." \
  --region=us-central1

# Set minimum instances (avoid cold starts)
gcloud run services update cnc-portal-api \
  --min-instances=1 \
  --region=us-central1

# Set memory and CPU
gcloud run services update cnc-portal-api \
  --memory=2Gi \
  --cpu=2 \
  --region=us-central1
```

#### Step 6: Set Up Cloud SQL

```bash
# Create Cloud SQL instance
gcloud sql instances create cnc-db \
  --database-version=POSTGRES_16 \
  --tier=db-f1-micro \
  --region=us-central1

# Create database
gcloud sql databases create cnc-db --instance=cnc-db

# Connect Cloud Run to Cloud SQL
gcloud run services update cnc-portal-api \
  --add-cloudsql-instances=PROJECT_ID:us-central1:cnc-db \
  --region=us-central1
```

#### Step 7: Health Checks

```bash
# Check service health
curl https://api.cnc-portal.com/health

# Expected response:
# {"status":"ok","timestamp":"2025-12-07T...","uptime":...}
```

### 3. Frontend Deployment

#### Step 1: Build Application

```bash
cd app/

# Install dependencies
npm ci

# Build for production
npm run build

# Preview build locally
npm run preview
```

#### Step 2: Test Build

```bash
# Serve build directory
npx serve dist -p 8080

# Test in browser
open http://localhost:8080

# Verify:
# - All pages load
# - API calls work
# - Wallet connection works
# - Contract interactions work
```

#### Step 3: Deploy to Google Cloud Run

```bash
# Build and deploy
gcloud builds submit --config=cloudbuild.prod.yaml

# Or use Docker
docker build -f frontend.Dockerfile -t gcr.io/PROJECT_ID/frontend .
docker push gcr.io/PROJECT_ID/frontend
gcloud run deploy frontend --image gcr.io/PROJECT_ID/frontend
```

#### Step 4: Configure CDN (Optional)

```bash
# Create Cloud CDN backend bucket
gcloud compute backend-buckets create frontend-bucket \
  --gcs-bucket-name=cnc-portal-frontend

# Configure Cloud CDN
gcloud compute url-maps create frontend-cdn \
  --default-backend-bucket=frontend-bucket
```

#### Step 5: Set Up Custom Domain

```bash
# Map custom domain
gcloud run services update frontend \
  --allow-unauthenticated \
  --region=us-central1

# Add domain mapping
gcloud run domain-mappings create \
  --service=frontend \
  --domain=cnc-portal.com \
  --region=us-central1

# Configure DNS records (in your domain registrar)
# Add CNAME record: www.cnc-portal.com -> ghs.googlehosted.com
```

## Docker Deployment

### Using Docker Compose (Development/Testing)

#### Full Stack Deployment

```bash
# Build and start all services
docker-compose up -d

# View logs
docker-compose logs -f

# Check service status
docker-compose ps

# Stop services
docker-compose down

# Stop and remove volumes
docker-compose down -v
```

#### Individual Services

```bash
# Start only database
docker-compose up -d db

# Start database and backend
docker-compose up -d db backend

# Rebuild specific service
docker-compose build backend
docker-compose up -d backend
```

### Production Docker Setup

#### Multi-stage Build (Backend)

```dockerfile
# /backend/backend.Dockerfile
FROM node:22-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build
RUN npx prisma generate

FROM node:22-alpine AS production
WORKDIR /app
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./
COPY prisma ./prisma

ENV NODE_ENV=production
EXPOSE 3000
CMD ["node", "dist/index.js"]
```

#### Multi-stage Build (Frontend)

```dockerfile
# /app/frontend.Dockerfile
FROM node:22-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
ARG VITE_APP_BACKEND_URL
ARG VITE_APP_NETWORK_ALIAS
ENV VITE_APP_BACKEND_URL=$VITE_APP_BACKEND_URL
ENV VITE_APP_NETWORK_ALIAS=$VITE_APP_NETWORK_ALIAS
RUN npm run build

FROM nginx:alpine AS production
COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx/default.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
```

## CI/CD Pipeline

### Google Cloud Build Configuration

#### Backend Pipeline (`/backend/cloudbuild.prod.yaml`)

```yaml
steps:
  # Run tests
  - name: "node:22"
    entrypoint: "npm"
    args: ["ci"]
    dir: "backend"

  - name: "node:22"
    entrypoint: "npm"
    args: ["test"]
    dir: "backend"
    env:
      - "DATABASE_URL=postgresql://test:test@localhost:5432/test"

  # Build Docker image
  - name: "gcr.io/cloud-builders/docker"
    args:
      - "build"
      - "--build-arg"
      - "NODE_ENV=production"
      - "-t"
      - "${LOCATION}-docker.pkg.dev/$PROJECT_ID/cnc-portal-api:$SHORT_SHA"
      - "./backend"

  # Push to Artifact Registry
  - name: "gcr.io/cloud-builders/docker"
    args:
      - "push"
      - "${LOCATION}-docker.pkg.dev/$PROJECT_ID/cnc-portal-api:$SHORT_SHA"

  # Deploy to Cloud Run
  - name: "gcr.io/cloud-builders/gcloud"
    args:
      - "run"
      - "deploy"
      - "cnc-portal-api"
      - "--image"
      - "${LOCATION}-docker.pkg.dev/$PROJECT_ID/cnc-portal-api:$SHORT_SHA"
      - "--region"
      - "${LOCATION}"
      - "--platform"
      - "managed"
      - "--allow-unauthenticated"

timeout: "1200s"
```

#### Frontend Pipeline (`/app/cloudbuild.prod.yaml`)

```yaml
steps:
  # Build Docker image
  - name: "gcr.io/cloud-builders/docker"
    args:
      - "build"
      - "-f"
      - "frontend.Dockerfile"
      - "--build-arg"
      - "VITE_APP_BACKEND_URL=$_VITE_APP_BACKEND_URL"
      - "--build-arg"
      - "VITE_APP_NETWORK_ALIAS=$_VITE_APP_NETWORK_ALIAS"
      - "-t"
      - "${LOCATION}-docker.pkg.dev/$PROJECT_ID/cnc-portal-app:$SHORT_SHA"
      - "./app"

  # Push and deploy (similar to backend)
```

### Automated Deployment Triggers

```bash
# Create Cloud Build trigger for main branch
gcloud builds triggers create github \
  --repo-name=cnc-portal \
  --repo-owner=globe-and-citizen \
  --branch-pattern=^main$ \
  --build-config=backend/cloudbuild.prod.yaml

# Create trigger for staging
gcloud builds triggers create github \
  --repo-name=cnc-portal \
  --repo-owner=globe-and-citizen \
  --branch-pattern=^develop$ \
  --build-config=backend/cloudbuild.yaml
```

### Rollback Procedures

#### Rollback Backend

```bash
# List recent revisions
gcloud run revisions list --service=cnc-portal-api --region=us-central1

# Rollback to specific revision
gcloud run services update-traffic cnc-portal-api \
  --to-revisions=cnc-portal-api-00042-xyz=100 \
  --region=us-central1
```

#### Rollback Frontend

```bash
# List revisions
gcloud run revisions list --service=frontend --region=us-central1

# Rollback
gcloud run services update-traffic frontend \
  --to-revisions=frontend-00023-abc=100 \
  --region=us-central1
```

#### Rollback Smart Contracts

```bash
# For beacon proxies, update beacon to previous implementation
cd contract/
npx hardhat run scripts/rollback-beacon.ts --network sepolia

# Provide previous implementation address when prompted
```

## Monitoring and Maintenance

### Health Checks

#### API Health Endpoint

```bash
# Check API health
curl https://api.cnc-portal.com/health

# Expected response:
{
  "status": "ok",
  "timestamp": "2025-12-07T10:30:00Z",
  "uptime": 86400,
  "database": "connected",
  "blockchain": "connected"
}
```

#### Frontend Availability

```bash
# Check frontend
curl -I https://cnc-portal.com

# Expected: HTTP/2 200
```

#### Contract Verification

```bash
# Check contract is deployed
cast code $FACTORY_BEACON_ADDRESS --rpc-url $RPC_URL

# Should return bytecode (not 0x)
```

### Logging

#### Backend Logs (Cloud Run)

```bash
# View recent logs
gcloud logging read "resource.type=cloud_run_revision AND resource.labels.service_name=cnc-portal-api" \
  --limit=50 \
  --format=json

# Stream logs
gcloud logging tail "resource.type=cloud_run_revision AND resource.labels.service_name=cnc-portal-api"

# Filter errors
gcloud logging read "resource.type=cloud_run_revision AND severity>=ERROR" --limit=20
```

#### Frontend Logs

```bash
# View frontend logs
gcloud logging read "resource.type=cloud_run_revision AND resource.labels.service_name=frontend" \
  --limit=50
```

#### Database Logs

```bash
# View Cloud SQL logs
gcloud logging read "resource.type=cloudsql_database" --limit=50
```

### Error Tracking

Sentry is configured at two levels — frontend (Vue) and backend (Node.js) — with separate Sentry projects sharing the same organisation.
Each project uses the same environment names so events can be filtered consistently across local development, staging, and production.

For Railway, set the environment value separately in each Railway environment:

| Railway environment | Sentry environment |
| ------------------- | ------------------ |
| Local development   | `development`      |
| Staging             | `staging`          |
| Production          | `production`       |

**Required environment variables:**

| Variable                      | Where              | Timing           | Purpose                                    |
| ----------------------------- | ------------------ | ---------------- | ------------------------------------------ |
| `VITE_APP_SENTRY_DSN`         | frontend (browser) | build-time       | Frontend Sentry project DSN                |
| `VITE_APP_SENTRY_ENVIRONMENT` | frontend (browser) | build-time       | `development`, `staging`, or `production`  |
| `SENTRY_DSN`                  | backend (Node.js)  | runtime          | Backend Sentry project DSN                 |
| `SENTRY_ENVIRONMENT`          | backend (Node.js)  | runtime          | `development`, `staging`, or `production`  |
| `SENTRY_FRONTEND_DSN`         | backend (Node.js)  | runtime          | Frontend DSN used by the tunnel route      |
| `SENTRY_FRONTEND_PROJECT_ID`  | backend (Node.js)  | runtime          | Project ID extracted from the frontend DSN |
| `SENTRY_AUTH_TOKEN`           | build-time only    | source-map build | Upload source maps to Sentry               |
| `SENTRY_ORG`                  | build-time only    | source-map build | Sentry organisation slug                   |
| `SENTRY_PROJECT`              | build-time only    | source-map build | Sentry project slug for source-map uploads |

`VITE_*` values are compiled into the frontend bundle, so changing a frontend Sentry environment requires a new Railway deployment. Backend
Sentry environment values are read when the Node.js service starts. Keep `SENTRY_AUTH_TOKEN` server-side and use it only during the
source-map build; it must never be exposed through a `VITE_*` variable.

**Backend** (`backend/src/instrument.ts`) — must be the first import in the server:

```typescript
import * as Sentry from "@sentry/node";

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment:
    process.env.SENTRY_ENVIRONMENT ?? process.env.NODE_ENV ?? "development",
  tracesSampleRate: 0.1,
  sendDefaultPii: true,
});
```

**Frontend** (`app/src/main.ts`) — events are routed through the backend tunnel to bypass ad-blockers (Brave Shields, uBlock Origin, etc.):

```typescript
import * as Sentry from "@sentry/vue";

Sentry.init({
  app,
  dsn: import.meta.env.VITE_APP_SENTRY_DSN,
  environment:
    import.meta.env.VITE_APP_SENTRY_ENVIRONMENT ?? import.meta.env.MODE,
  tunnel: `${import.meta.env.VITE_APP_BACKEND_URL}/api/sentry-tunnel`,
  tracesSampleRate: 0.1,
  replaysOnErrorSampleRate: 1.0,
});
```

Backend controller failures are captured centrally when they produce a `5xx` response through `backend/src/utils/utils.ts#errorResponse`.
Controllers that have a dedicated `5xx` response path use the same capture helper, and the CoinGecko controller adds the provider operation
and HTTP status as Sentry tags. Client errors (`4xx`), expected rate limits, health-check dependency failures, and Sentry tunnel forwarding
failures are not reported as exceptions to avoid noisy or recursive events. Filter backend events by the configured Sentry environment and
the `runtime:backend` tag. The complete runtime contract is documented in the
[Backend Error Tracking capability](../implementation/error-tracking/README.md).

**Source maps** are generated as `hidden` in production builds (not served to browsers) and uploaded to Sentry automatically by
`@sentry/vite-plugin` during `npm run build` (frontend) and by `sentry-cli sourcemaps` during `npm run build` (backend).

### Backup Procedures

#### Database Backups

```bash
# Manual backup
gcloud sql backups create --instance=cnc-db

# Automated daily backups (configure in Cloud SQL)
gcloud sql instances patch cnc-db \
  --backup-start-time=03:00 \
  --enable-bin-log

# List backups
gcloud sql backups list --instance=cnc-db

# Restore from backup
gcloud sql backups restore BACKUP_ID \
  --backup-instance=cnc-db \
  --backup-id=BACKUP_ID
```

#### Configuration Backups

```bash
# Backup environment variables
gcloud run services describe cnc-portal-api \
  --region=us-central1 \
  --format=json > config-backup-$(date +%Y%m%d).json

# Backup Cloud Build configurations
cp backend/cloudbuild.prod.yaml backups/
cp app/cloudbuild.prod.yaml backups/
```

#### Contract State

Smart contracts are immutable on blockchain - no backup needed for code. For operational data:

```bash
# Export important contract addresses
cat > contract-addresses-backup.json << EOF
{
  "network": "sepolia",
  "factoryBeacon": "0x...",
  "bankBeacon": "0x...",
  "deployed": "2025-12-07T10:00:00Z"
}
EOF
```

### Recovery Procedures

#### Database Recovery

```bash
# Restore from latest backup
gcloud sql backups restore BACKUP_ID \
  --backup-instance=cnc-db \
  --instance=cnc-db

# Run migrations if needed
cd backend/
npx prisma migrate deploy
```

#### Service Recovery

```bash
# Redeploy last known good version
gcloud run services update-traffic cnc-portal-api \
  --to-revisions=LAST_GOOD_REVISION=100 \
  --region=us-central1

# Or redeploy from scratch
gcloud builds submit --config=cloudbuild.prod.yaml
```

## Production Checklist

Before deploying to production, verify:

### Pre-Deployment

- [ ] All tests pass (unit, integration, E2E)
- [ ] Test coverage meets requirements (90%+ unit, 85%+ component)
- [ ] Security audit completed for smart contracts
- [ ] Environment variables configured correctly
- [ ] Database migrations tested
- [ ] Backup procedures tested
- [ ] Rollback procedures documented and tested
- [ ] Monitoring and alerting configured
- [ ] SSL certificates valid
- [ ] Domain DNS configured correctly
- [ ] Rate limiting configured
- [ ] CORS settings verified
- [ ] Error tracking enabled (Sentry)
- [ ] Load testing completed

### Smart Contracts

- [ ] Contracts compiled without warnings
- [ ] All tests pass (350+ tests)
- [ ] Gas optimization reviewed
- [ ] Security audit passed
- [ ] Contracts verified on Etherscan
- [ ] Beacons initialized correctly
- [ ] Multisig configured for upgrades
- [ ] Emergency pause mechanism tested

### Backend API

- [ ] Database migrations applied
- [ ] Prisma client generated
- [ ] JWT secrets configured
- [ ] Rate limiting tested
- [ ] CORS configured correctly
- [ ] Health checks responding
- [ ] Logging configured
- [ ] Error tracking enabled
- [ ] Database connections pooled

### Frontend

- [ ] Build optimized (no source maps in production)
- [ ] Environment variables injected
- [ ] Contract addresses updated
- [ ] API endpoints configured
- [ ] Analytics configured
- [ ] Error boundaries in place
- [ ] Loading states implemented
- [ ] Accessibility tested (WCAG 2.1)
- [ ] Cross-browser tested
- [ ] Mobile responsive verified

### Monitoring

- [ ] Cloud Monitoring dashboards created
- [ ] Alerting policies configured
- [ ] Log retention configured
- [ ] Uptime checks configured
- [ ] Performance monitoring enabled
- [ ] Error rate alerts set up
- [ ] Budget alerts configured (GCP costs)

### Post-Deployment

- [ ] Verify all services healthy
- [ ] Test critical user flows
- [ ] Verify database connectivity
- [ ] Test wallet connection
- [ ] Verify contract interactions
- [ ] Verify API endpoints
- [ ] Test authentication flow
- [ ] Monitor error rates
- [ ] Check performance metrics
- [ ] Verify backups working
- [ ] Document deployment date and version
- [ ] Update status page
- [ ] Notify team of deployment

## Troubleshooting

### Common Deployment Issues

#### "Cannot connect to database"

**Cause:** Database connection string incorrect or database not accessible  
**Fix:**

```bash
# Verify DATABASE_URL format
echo $DATABASE_URL

# Test connection
psql $DATABASE_URL -c "SELECT 1"

# Check Cloud SQL connector
gcloud sql instances describe cnc-db
```

#### "Contract address not found"

**Cause:** Contract addresses not updated after deployment  
**Fix:**

```bash
# Update .env files with deployed addresses
# Redeploy backend and frontend
npm run deploy
```

#### "Module not found" errors

**Cause:** Dependencies not installed or build failed  
**Fix:**

```bash
# Clean install
rm -rf node_modules package-lock.json
npm install

# Rebuild
npm run build
```

#### Cloud Build timeout

**Cause:** Build taking too long (>10 minutes default)  
**Fix:**

```yaml
# Add to cloudbuild.yaml
timeout: "1200s" # 20 minutes
```

#### Permission denied on Cloud Run

**Cause:** Service account lacks permissions  
**Fix:**

```bash
# Grant Cloud Run Admin role
gcloud projects add-iam-policy-binding PROJECT_ID \
  --member="serviceAccount:SERVICE_ACCOUNT@PROJECT_ID.iam.gserviceaccount.com" \
  --role="roles/run.admin"
```

## Security Considerations

### Secret Management

```bash
# Use Secret Manager for sensitive data
gcloud secrets create DATABASE_URL --data-file=.env

# Grant access to Cloud Run
gcloud secrets add-iam-policy-binding DATABASE_URL \
  --member="serviceAccount:SERVICE_ACCOUNT" \
  --role="roles/secretmanager.secretAccessor"

# Reference in Cloud Run
gcloud run services update cnc-portal-api \
  --update-secrets=DATABASE_URL=DATABASE_URL:latest
```

### Network Security

- Use VPC connectors for Cloud SQL access
- Enable Cloud Armor for DDoS protection
- Configure IAM roles with least privilege
- Enable audit logging
- Use private Google access where possible

### SSL/TLS Configuration

```bash
# Cloud Run automatically provisions SSL certificates
# Verify HTTPS redirect configured in nginx

# For custom domains
gcloud run domain-mappings create \
  --service=frontend \
  --domain=cnc-portal.com \
  --region=us-central1
# Certificate auto-provisioned
```

## References

- [Google Cloud Run Documentation](https://cloud.google.com/run/docs)
- [Hardhat Deployment](https://hardhat.org/hardhat-runner/docs/guides/deploying)
- [Docker Documentation](https://docs.docker.com/)
- [Prisma Migrations](https://www.prisma.io/docs/concepts/components/prisma-migrate)
- [Nginx Configuration](https://nginx.org/en/docs/)

---

**Last Updated:** December 7, 2025  
**Maintained by:** CNC Portal Development Team
