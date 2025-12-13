# Database Seeding Feature - Functional Specification

**Version:** 1.0.0  
**Date:** December 8, 2025  
**Status:** ✅ Implemented  
**Feature Branch:** feature/perf-stats

---

## 1. Executive Summary

### 1.1 Purpose

The Database Seeding Feature provides automated, environment-aware test data generation for the CNC Portal platform. It enables developers to quickly populate the database with realistic, consistent data for development, testing, and staging environments while preventing accidental data seeding in production.

### 1.2 Scope

This feature encompasses:

- **Environment-Based Seeding**: Different data volumes and characteristics for dev, test, and staging
- **Referential Integrity**: Automatic handling of foreign key relationships and dependencies
- **Realistic Data Generation**: Use of Faker.js and custom helpers for authentic test data
- **Idempotent Operations**: Safe to run multiple times without creating duplicates
- **Date Distribution**: Strategic date ranges to support statistics feature testing
- **Modular Organization**: Separate seed functions for each entity type
- **Validation**: Data validation before insertion to prevent integrity issues

### 1.3 Stakeholders

- **Backend Developers**: Quickly set up development environments with realistic data
- **QA Engineers**: Consistent, predictable test data for automated testing
- **DevOps Engineers**: Populate staging environments with production-like volumes
- **Product Managers**: Demo environments with representative data
- **Database Administrators**: Maintain database health and performance

---

## 2. Business Requirements

### 2.1 Functional Requirements

#### FR-1: Multi-Environment Seeding

**Priority:** Critical  
**Description:** Support different seeding strategies based on environment

**User Story:**
> As a developer, I want different data volumes in dev/test/staging environments so that I can work efficiently without overwhelming the database.

**Acceptance Criteria:**

- [x] Detect environment from `NODE_ENV` variable
- [x] Development environment: Rich, realistic dataset (10 users, 5 teams, 100 claims)
- [x] Test environment: Minimal, predictable dataset (3 users, 2 teams, 10 claims)
- [x] Staging environment: Production-like volumes (50 users, 20 teams, 500 claims)
- [x] Production environment: Prevent seeding with clear error message
- [x] Support custom environment configuration via env variables

#### FR-2: Referential Integrity Management

**Priority:** Critical  
**Description:** Maintain database referential integrity during seeding

**User Story:**
> As a database administrator, I want seeding to respect foreign key constraints so that the database remains in a valid state.

**Acceptance Criteria:**

- [x] Seed entities in correct dependency order
- [x] Validate foreign key references before insertion
- [x] Handle circular references (e.g., Team ↔ User ownership)
- [x] Roll back entire seed operation if any entity fails
- [x] Log warnings for skipped records due to missing references
- [x] Support optional vs required relationships

#### FR-3: Realistic Data Generation

**Priority:** High  
**Description:** Generate realistic, diverse test data

**User Story:**
> As a QA engineer, I want realistic test data so that I can identify bugs that would occur with real user data.

**Acceptance Criteria:**

- [x] Use valid Ethereum addresses (checksum format)
- [x] Generate realistic names, emails using Faker.js
- [x] Create varied claim amounts and hours (realistic ranges)
- [x] Generate diverse expense amounts and categories
- [x] Include edge cases (empty teams, maximum hours, zero amounts)
- [x] Create data distributions matching expected production patterns

#### FR-4: Idempotent Seeding Operations

**Priority:** High  
**Description:** Allow seeds to be run multiple times safely

**User Story:**
> As a developer, I want to re-run seeds without errors so that I can quickly reset my development database.

**Acceptance Criteria:**

- [x] Use `upsert` operations for critical entities
- [x] Use `skipDuplicates` flag for bulk inserts
- [x] Clear existing data before seeding (optional flag)
- [x] Detect existing data and skip or update appropriately
- [x] Log actions taken (created, updated, skipped)
- [x] Support incremental seeding (add without clearing)

#### FR-5: Date Distribution for Testing

**Priority:** High  
**Description:** Distribute entities across time periods to support stats feature testing

**User Story:**
> As a developer testing the stats feature, I want data distributed across different time periods so that I can verify 7d/30d/90d filtering works correctly.

**Acceptance Criteria:**

- [x] Create claims spanning last 90 days
- [x] Include data in each time bucket (0-7d, 7-30d, 30-90d, >90d)
- [x] Generate weekly claims with varied week start dates
- [x] Create expenses and actions with distributed dates
- [x] Support custom date ranges via configuration
- [ ] Include future dates for testing scheduled features

#### FR-6: Modular Seed Organization

**Priority:** Medium  
**Description:** Organize seed logic into maintainable, reusable modules

**User Story:**
> As a backend developer, I want modular seed functions so that I can easily add new entities or modify existing ones.

**Acceptance Criteria:**

- [x] Separate seed function for each entity type
- [x] Shared helper functions library
- [x] Clear interfaces for seed functions (input/output)
- [ ] Support independent seeding of specific entities
- [x] Enable entity-specific configuration
- [x] Document each seed module with examples

#### FR-7: Seed Data Validation

**Priority:** Medium  
**Description:** Validate seed data before insertion to prevent errors

**User Story:**
> As a QA engineer, I want seed data to be validated so that invalid data doesn't corrupt test databases.

**Acceptance Criteria:**

- [x] Validate Ethereum addresses (checksum, length)
- [x] Validate date formats and ranges
- [x] Check required fields are present
- [x] Verify enum values match allowed options
- [x] Validate JSON fields structure
- [x] Log validation errors with details

---

## 3. Seeding Architecture

### 3.1 Seeding Order

Entities must be seeded in this specific order to maintain referential integrity:

```typescript
1. Users                    // No dependencies
2. Teams                    // Depends on: Users (owner)
3. MemberTeamsData          // Depends on: Users, Teams
4. TeamContracts            // Depends on: Teams
5. Wages                    // Depends on: Users, Teams
6. WeeklyClaims             // Depends on: Users, Teams, Wages
7. Claims                   // Depends on: Wages, WeeklyClaims
8. Expenses                 // Depends on: Users, Teams
9. BoardOfDirectorActions   // Depends on: Users, Teams
10. Notifications           // Depends on: Users
```

### 3.2 Seed Function Interface

Each seed function follows this pattern:

```typescript
interface SeedFunction<T> {
  (
    prisma: PrismaClient,
    environment: Environment,
    options?: SeedOptions
  ): Promise<T[]>;
}

interface SeedOptions {
  count?: number;           // Override default count
  skipIfExists?: boolean;   // Skip if data already exists
  clearExisting?: boolean;  // Clear before seeding
  dateRange?: DateRange;    // Custom date range
}

type Environment = 'development' | 'test' | 'staging' | 'production';
```

### 3.3 Module Structure

```
backend/prisma/
├── seed.ts                    # Main orchestration file
├── seeds/
│   ├── users.seed.ts          # User seeding logic
│   ├── teams.seed.ts          # Team seeding logic
│   ├── wages.seed.ts          # Wage seeding logic
│   ├── claims.seed.ts         # Claim seeding logic
│   ├── expenses.seed.ts       # Expense seeding logic
│   ├── contracts.seed.ts      # Contract seeding logic
│   ├── actions.seed.ts        # Board action seeding logic
│   ├── notifications.seed.ts  # Notification seeding logic
│   └── helpers.ts             # Shared utility functions
├── config/
│   └── seed-config.ts         # Environment-specific configurations
└── schema.prisma              # Database schema
```

---

## 4. Data Volume Specifications

### 4.1 Development Environment

**Purpose:** Rich dataset for interactive development

| Entity | Count | Notes |
|--------|-------|-------|
| Users | 10 | Mix of team owners and members |
| Teams | 5 | Various sizes (1-5 members each) |
| MemberTeamsData | 15 | Some users in multiple teams |
| Wages | 30 | Multiple wage rates, some with history |
| WeeklyClaims | 20 | Mix of statuses, various weeks |
| Claims | 100 | Distributed across last 90 days |
| Expenses | 15 | Various amounts and statuses |
| TeamContracts | 10 | 2-3 contracts per team |
| BoardOfDirectorActions | 20 | Mix of executed and pending |
| Notifications | 50 | Some read, some unread |

**Characteristics:**

- Realistic variety in data values
- Include edge cases and unusual scenarios
- Optimized for manual testing and exploration
- Data distributed across time periods

### 4.2 Test Environment

**Purpose:** Minimal, predictable data for automated tests

| Entity | Count | Notes |
|--------|-------|-------|
| Users | 3 | Fixed addresses, predictable names |
| Teams | 2 | One small (1 member), one larger (2 members) |
| MemberTeamsData | 4 | Clear membership patterns |
| Wages | 6 | 2 wages per user with clear rates |
| WeeklyClaims | 5 | One per week, fixed statuses |
| Claims | 10 | Fixed hours and dates |
| Expenses | 5 | Fixed amounts and statuses |
| TeamContracts | 4 | 2 per team, fixed addresses |
| BoardOfDirectorActions | 6 | 3 executed, 3 pending |
| Notifications | 10 | 5 read, 5 unread |

**Characteristics:**

- Fixed, predictable data (no randomness)
- Minimal relationships for fast setup
- Clear test scenarios
- Deterministic for reproducible tests

### 4.3 Staging Environment

**Purpose:** Production-like volumes for performance testing

| Entity | Count | Notes |
|--------|-------|-------|
| Users | 50 | Realistic address distribution |
| Teams | 20 | Various team sizes |
| MemberTeamsData | 100 | Complex membership patterns |
| Wages | 150 | Full wage histories |
| WeeklyClaims | 100 | 2-3 months of data |
| Claims | 500 | Large dataset for pagination testing |
| Expenses | 75 | Various categories and amounts |
| TeamContracts | 40 | Multiple contracts per team |
| BoardOfDirectorActions | 100 | Realistic action distribution |
| Notifications | 250 | Large notification backlog |

**Characteristics:**

- Production-like data volumes
- Test performance with realistic load
- Complex relationships and edge cases
- Full date range coverage

---

## 5. Business Logic

### 5.1 Environment Detection

```typescript
function detectEnvironment(): Environment {
  const env = process.env.NODE_ENV || 'development';
  
  if (env === 'production') {
    throw new Error('⚠️  PRODUCTION SEEDING BLOCKED: Seeds cannot run in production');
  }
  
  const validEnvs = ['development', 'test', 'staging'];
  if (!validEnvs.includes(env)) {
    console.warn(`Unknown environment "${env}", defaulting to development`);
    return 'development';
  }
  
  return env as Environment;
}
```

### 5.2 Data Generation Strategies

#### Ethereum Addresses

```typescript
// Development: Mix of hardhat default and generated
const devAddresses = [
  '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266', // Hardhat Account #0
  '0x70997970C51812dc3A010C7d01b50e0d17dc79C8', // Hardhat Account #1
  // ... + generated addresses
];

// Test: Fixed, predictable addresses
const testAddresses = [
  '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266',
  '0x70997970C51812dc3A010C7d01b50e0d17dc79C8',
  '0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC',
];

// Staging: Generated with faker
const stagingAddresses = Array.from(
  { length: 50 },
  () => faker.finance.ethereumAddress()
);
```

#### Date Distribution

```typescript
function generateDistributedDates(count: number): Date[] {
  const now = new Date();
  const periods = {
    last7d: { start: -7, end: 0, weight: 0.3 },
    last30d: { start: -30, end: -7, weight: 0.4 },
    last90d: { start: -90, end: -30, weight: 0.2 },
    older: { start: -365, end: -90, weight: 0.1 }
  };
  
  // Distribute dates according to weights
  return generateWeightedDates(count, periods);
}
```

#### Wage Chains

```typescript
async function createWageChain(
  prisma: PrismaClient,
  userId: string,
  teamId: number
): Promise<Wage[]> {
  // Create initial wage
  const wage1 = await prisma.wage.create({
    data: {
      userAddress: userId,
      teamId,
      cashRatePerHour: 20,
      maximumHoursPerWeek: 40,
    },
  });
  
  // Create raise (30% of users get a raise)
  if (Math.random() < 0.3) {
    const wage2 = await prisma.wage.create({
      data: {
        userAddress: userId,
        teamId,
        cashRatePerHour: wage1.cashRatePerHour * 1.15, // 15% raise
        maximumHoursPerWeek: 40,
      },
    });
    
    // Link them
    await prisma.wage.update({
      where: { id: wage1.id },
      data: { nextWageId: wage2.id },
    });
    
    return [wage1, wage2];
  }
  
  return [wage1];
}
```

### 5.3 Validation Rules

#### Address Validation

```typescript
function validateEthereumAddress(address: string): boolean {
  // Check format
  if (!/^0x[a-fA-F0-9]{40}$/.test(address)) {
    console.error(`Invalid address format: ${address}`);
    return false;
  }
  
  // Check checksum (optional but recommended)
  const checksumAddress = ethers.utils.getAddress(address);
  if (address !== checksumAddress && address !== checksumAddress.toLowerCase()) {
    console.warn(`Address ${address} has invalid checksum`);
  }
  
  return true;
}
```

#### Date Validation

```typescript
function validateDate(date: Date, fieldName: string): boolean {
  if (!(date instanceof Date) || isNaN(date.getTime())) {
    console.error(`Invalid date for ${fieldName}: ${date}`);
    return false;
  }
  
  // Prevent dates too far in future
  const maxFutureDate = new Date();
  maxFutureDate.setFullYear(maxFutureDate.getFullYear() + 1);
  
  if (date > maxFutureDate) {
    console.warn(`Date ${date} is more than 1 year in future for ${fieldName}`);
    return false;
  }
  
  return true;
}
```

---

## 6. CLI Interface

### 6.1 NPM Scripts

```json
{
  "scripts": {
    "seed": "tsx prisma/seed.ts",
    "seed:dev": "NODE_ENV=development tsx prisma/seed.ts",
    "seed:test": "NODE_ENV=test tsx prisma/seed.ts",
    "seed:staging": "NODE_ENV=staging tsx prisma/seed.ts",
    "seed:reset": "npm run db:reset && npm run seed",
    "seed:verify": "tsx prisma/scripts/verify-seed.ts"
  }
}
```

### 6.2 Command Options

```bash
# Basic seeding
npm run seed

# Environment-specific
NODE_ENV=test npm run seed

# With options (future enhancement)
npm run seed -- --count=20 --clear --entities=users,teams

# Verify seed data
npm run seed:verify

# Reset and reseed
npm run seed:reset
```

### 6.3 Output Format

```text
🌱 Starting database seeding...
📍 Environment: development
🗑️  Clearing existing data...
  ✓ Cleared 100 claims
  ✓ Cleared 20 weekly claims
  ✓ Cleared 30 wages
  ...

👥 Seeding users...
  ✓ Created 10 users

🏢 Seeding teams...
  ✓ Created 5 teams

💰 Seeding wages...
  ✓ Created 30 wages (with 5 wage chains)

📋 Seeding claims...
  ✓ Created 100 claims across 90 days

✅ Seeding completed successfully!
📊 Summary:
  - Users: 10
  - Teams: 5
  - Claims: 100
  - Total time: 3.2s
```

---

## 7. Error Handling

### 7.1 Production Prevention

```typescript
if (process.env.NODE_ENV === 'production') {
  console.error('🚫 FATAL: Cannot seed production database');
  console.error('   Set NODE_ENV to development, test, or staging');
  process.exit(1);
}
```

### 7.2 Foreign Key Violations

```typescript
try {
  await prisma.claim.create({ data: claimData });
} catch (error) {
  if (error.code === 'P2003') {
    console.error(`Foreign key violation: ${error.meta?.field_name}`);
    console.error(`  Ensure parent records exist before creating claims`);
    throw error;
  }
}
```

### 7.3 Transaction Rollback

```typescript
await prisma.$transaction(async (tx) => {
  const users = await seedUsers(tx);
  const teams = await seedTeams(tx, users);
  const wages = await seedWages(tx, users, teams);
  // If any fails, entire operation rolls back
});
```

---

## 8. Performance Considerations

### 8.1 Bulk Operations

```typescript
// ❌ Slow: Individual creates
for (const user of users) {
  await prisma.user.create({ data: user });
}

// ✅ Fast: Bulk create
await prisma.user.createMany({
  data: users,
  skipDuplicates: true,
});
```

### 8.2 Transaction Boundaries

```typescript
// Create users and teams in one transaction
await prisma.$transaction([
  prisma.user.createMany({ data: users }),
  prisma.team.createMany({ data: teams }),
]);

// But separate complex operations to avoid long-running transactions
await seedComplexWageChains(wages);
```

### 8.3 Indexing

Ensure indexes exist for foreign keys:

```prisma
model Claim {
  wageId Int
  wage   Wage @relation(fields: [wageId], references: [id])
  
  @@index([wageId]) // Speeds up seeding
}
```

---

## 9. Testing Strategy

### 9.1 Seed Verification Tests

```typescript
describe('Database Seeding', () => {
  beforeAll(async () => {
    process.env.NODE_ENV = 'test';
    await runSeed();
  });
  
  it('should create correct number of users', async () => {
    const count = await prisma.user.count();
    expect(count).toBe(3); // Test environment count
  });
  
  it('should maintain referential integrity', async () => {
    const teams = await prisma.team.findMany({
      include: { owner: true },
    });
    
    teams.forEach(team => {
      expect(team.owner).toBeDefined();
    });
  });
  
  it('should distribute dates correctly', async () => {
    const now = new Date();
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    
    const recentClaims = await prisma.claim.count({
      where: { createdAt: { gte: sevenDaysAgo } },
    });
    
    expect(recentClaims).toBeGreaterThan(0);
  });
});
```

### 9.2 Integration Tests

```typescript
describe('Stats API with Seeded Data', () => {
  beforeAll(async () => {
    await seedTestEnvironment();
  });
  
  it('should return correct claim counts', async () => {
    const response = await request(app)
      .get('/api/stats/claims?period=7d')
      .set('Authorization', `Bearer ${token}`);
    
    expect(response.body.total).toBe(expectedCount);
  });
});
```

---

## 10. Future Enhancements

### 10.1 Phase 2 Features

**Advanced Configuration:**

- YAML/JSON configuration files for seed data
- Custom scenarios (e.g., "large team", "inactive users")
- Seed templates for common test cases

**CLI Enhancements:**

- Interactive seed wizard
- Selective entity seeding
- Dry-run mode (preview without executing)
- Progress bars and detailed logging

**Data Relationships:**

- Smart relationship inference
- Automatic dependency resolution
- Circular reference handling
- Soft delete support

### 10.2 Phase 3 Features

**Seed Management:**

- Seed versioning and migrations
- Seed snapshots (save/restore states)
- Incremental seeding (add without clearing)
- Seed data diffing

**Advanced Generation:**

- AI-powered realistic data generation
- Import from production (anonymized)
- Graph-based relationship generation
- Custom data generators per entity

**Monitoring:**

- Seed performance metrics
- Data distribution analytics
- Integrity validation reports
- Automated seed health checks

### 10.3 Phase 4 Features

**Cloud Integration:**

- Seed remote databases
- Multi-region seeding
- Scheduled reseeding
- Seed as a service

**Developer Experience:**

- VS Code extension for seed management
- Graphical seed designer
- Seed data marketplace
- Collaborative seed editing

---

## 11. Success Metrics

### 11.1 Performance Metrics

- **Seed Time (Development):** < 5 seconds
- **Seed Time (Test):** < 2 seconds
- **Seed Time (Staging):** < 30 seconds
- **Memory Usage:** < 500MB peak
- **Database Size:** Development < 50MB, Staging < 500MB

### 11.2 Quality Metrics

- **Referential Integrity:** 100% (no orphaned records)
- **Data Validity:** 100% (all records pass validation)
- **Test Pass Rate:** 100% with seeded data
- **Reproducibility:** 100% (same input = same output in test)

### 11.3 Acceptance Criteria

- [ ] All functional requirements implemented
- [ ] Seed runs successfully in all environments
- [ ] No foreign key violations occur
- [ ] Data distributions match specifications
- [ ] Idempotent operations work correctly
- [ ] CLI interface is user-friendly
- [ ] Comprehensive error handling
- [ ] Integration tests pass with seeded data
- [x] Documentation is complete and accurate
- [ ] Performance benchmarks are met

---

## 12. Related Documentation

**Platform Documentation:**

- [Architecture](../../platform/architecture.md) - System architecture
- [Development Standards](../../platform/development-standards.md) - Coding standards
- [Testing Strategy](../../platform/testing-strategy.md) - Testing approach

**Feature Documentation:**

- [Stats Feature](../stats/functional-specification.md) - Statistics feature that uses seed data
- [Seed Implementation](../../../backend/prisma/seed.ts) - Actual seed implementation code (~550 lines)

**External Resources:**

- [Prisma Seeding](https://www.prisma.io/docs/guides/database/seed-database)
- [Faker.js](https://fakerjs.dev/guide/)

---

## 13. Version History

**Version 1.0.0 - December 8, 2025**

- Initial specification of database seeding feature
- Environment-based seeding strategy defined
- Data volume specifications established
- Helper functions and utilities designed
- CLI interface and scripts defined
- Comprehensive documentation created
