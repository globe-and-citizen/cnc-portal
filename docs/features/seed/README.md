# Database Seeding Feature

**Status:** ✅ Implemented and Production Ready  
**Last Updated:** December 30, 2025

Automated, environment-aware database seeding for the CNC Portal with flexible control, admin provisioning, and production safety.

---

## 🚀 Quick Start

```bash
cd backend

# Development (10 users, 5 teams, ~750 records)
npm run seed:dev

# Test (3 users, Hardhat addresses, ~90 records)
npm run seed:test

# Staging (50 users, 20 teams, ~4000+ records)
npm run seed:staging

# Production - data seeding only
SEED_DATABASE=true NODE_ENV=production npx prisma db seed

# Production - admin assignment (recommended)
SEED_ADMINS=true \
ADMIN_ADDRESSES="0xaddress1,0xaddress2" \
ADMIN_ROLES="ROLE_ADMIN,ROLE_SUPER_ADMIN" \
NODE_ENV=production npx prisma db seed

# Clear and reseed development
CLEAR_DATA=true npm run seed:dev

# Full database reset
npm run seed:reset
```

---

## 📚 Documentation

| Document                                                     | Purpose                                    | Audience       |
| ------------------------------------------------------------ | ------------------------------------------ | -------------- |
| [QUICK_START.md](./QUICK_START.md)                           | Commands, troubleshooting, verification    | All developers |
| [IMPLEMENTATION_SUMMARY.md](./IMPLEMENTATION_SUMMARY.md)     | What was built, test results, metrics      | Tech leads, PM |
| [functional-specification.md](./functional-specification.md) | Requirements, business logic, architecture | Product, QA    |
| [seed.ts](../../../backend/prisma/seed.ts)                   | Main seed implementation (~550 lines)      | Backend devs   |
| [admin.ts](../../../backend/prisma/seeders/admin.ts)         | Admin role assignment seeder (~150 lines)  | Backend devs   |

---

## 📊 What Gets Seeded

**10 Entity Types:**
Users, Teams, MemberTeamsData, Wages, WeeklyClaims, Claims, Expenses, TeamContracts, BoardOfDirectorActions, Notifications

**Data Volumes by Environment:**

| Environment | Users  | Teams  | Records | Execution |
| ----------- | ------ | ------ | ------- | --------- |
| Test        | 3      | 2      | ~90     | 0.10s     |
| Development | 10     | 5      | ~750    | 0.27s     |
| Staging     | 50     | 20     | ~4000+  | <2s       |
| Production  | Custom | Custom | Custom  | Variable  |

---

## ✨ Key Features

- ✅ **Environment-aware** - Automatic detection with production safety guardrails
- ✅ **Flexible control** - Independent boolean flags: CLEAR_DATA, SEED_DATABASE, SEED_ADMINS
- ✅ **Admin provisioning** - Assign roles to Ethereum addresses with auto user creation
- ✅ **Referential integrity** - All relationships properly maintained
- ✅ **Idempotent operations** - Safe to re-run without side effects
- ✅ **Realistic data** - Uses Faker.js for human-like data generation
- ✅ **Smart date distribution** - 30% recent, 40% medium, 20% older, 10% oldest
- ✅ **Hardhat addresses** - Test environment uses Hardhat contract addresses
- ✅ **Wage chaining** - Proper wage period relationships and transitions
- ✅ **Temporal consistency** - Expenses respect member join dates, claims respect wage periods

---

## 🔧 Configuration

### Environment Variables

**Standard Seeding:**

- `NODE_ENV` - Environment (development/test/staging/production)
- `CLEAR_DATA` - Clear database before seeding (dev/test/staging only, default: false)
- `SEED_DATABASE` - Seed all entities (default: false)
- `SEED_ADMINS` - Seed admin roles (default: false)

**Admin Provisioning:**

- `ADMIN_ADDRESSES` - Comma-separated Ethereum addresses (required if SEED_ADMINS=true)
- `ADMIN_ROLES` - Comma-separated role names: ROLE_ADMIN, ROLE_SUPER_ADMIN (required if SEED_ADMINS=true)

### Production Safety

**Restrictions in Production:**

- ❌ `CLEAR_DATA` is always blocked (prevents accidental data loss)
- ⚠️ Requires at least one flag (`SEED_DATABASE` or `SEED_ADMINS`) to be true
- ✅ All other operations allowed with explicit flags

**Non-Production (Dev/Test/Staging):**

- ✅ All operations allowed
- Clear data: `CLEAR_DATA=true`
- Seed database: `SEED_DATABASE=true`
- Seed admins: `SEED_ADMINS=true`

---

## 🔗 Related Files

**Implementation:**

- `/backend/prisma/seed.ts` - Main seed orchestrator
- `/backend/prisma/seeders/` - Individual entity seeders (users, teams, wages, claims, expenses, contracts, actions, notifications, admin)
- `/backend/package.json` - Seed CLI scripts

**Supporting Documentation:**

- Detailed quick start → [QUICK_START.md](./QUICK_START.md)
- Architecture & business logic → [functional-specification.md](./functional-specification.md)
- Implementation results → [IMPLEMENTATION_SUMMARY.md](./IMPLEMENTATION_SUMMARY.md)

---

## 🎯 Common Tasks

### Seed with Admin Roles (Production)

```bash
cd backend

SEED_ADMINS=true \
ADMIN_ADDRESSES="0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb" \
ADMIN_ROLES="ROLE_SUPER_ADMIN" \
NODE_ENV=production npx prisma db seed
```

### Reset Development Database

```bash
cd backend
CLEAR_DATA=true npm run seed:dev
```

### Verify Seeded Data

```bash
cd backend
npx prisma studio  # Opens interactive database viewer
```

### Check Data Volumes

```bash
cd backend
npx prisma db execute --stdin < queries.sql
```

---

## 📖 Contributing

When adding new entities to seeding:

1. **Create seeder function** in `/backend/prisma/seeders/entity.ts`
2. **Update SeedConfig** interface in `seed.ts` with dev/test/staging counts
3. **Add to main()** in correct dependency order (respect foreign keys)
4. **Update CONFIGS** with volume profile for your environment
5. **Document** in this README and functional-specification.md

**Dependency Order:**

```
Users → Teams → MemberTeamsData → Wages →
WeeklyClaims → Claims → Expenses → TeamContracts →
BoardOfDirectorActions → Notifications
```

---

## ❓ FAQ

**Q: Can I seed production data?**  
A: Yes, use `SEED_DATABASE=true` flag with explicit opt-in.

**Q: Can I clear production data?**  
A: No, `CLEAR_DATA` is permanently blocked in production.

**Q: How do I create admin users in production?**  
A: Use `SEED_ADMINS=true` with `ADMIN_ADDRESSES` and `ADMIN_ROLES`. Users are auto-created if they don't exist.

**Q: Can I mix SEED_DATABASE and SEED_ADMINS?**  
A: Yes, both can be true simultaneously.

**Q: How do I verify seeding worked?**  
A: Run `npx prisma studio` to browse the database interactively.

**Q: What if seeding fails?**  
A: See [QUICK_START.md](./QUICK_START.md) troubleshooting section.

---

## 📞 Support

For detailed information:

- **Getting started** → [QUICK_START.md](./QUICK_START.md)
- **Architecture details** → [functional-specification.md](./functional-specification.md)
- **Implementation metrics** → [IMPLEMENTATION_SUMMARY.md](./IMPLEMENTATION_SUMMARY.md)
- **Source code** → `/backend/prisma/seed.ts` and `/backend/prisma/seeders/`
