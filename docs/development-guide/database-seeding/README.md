# Database Seeding

**Scope:** Developer and operational tooling for controlled Prisma seed execution

**Last verified:** 2026-08-21

Database seeding is not a user-accessible product feature. This guide owns the current execution
flags and safety boundaries implemented by the backend seed orchestrator.

## Current Invocation Model

Run commands from `backend/`. Selecting an environment does not enable data creation by itself;
`SEED_DATABASE=true` is required for entity seeding.

```bash
# Development profile
SEED_DATABASE=true npm run seed:dev

# Test profile
SEED_DATABASE=true npm run seed:test

# Staging profile
SEED_DATABASE=true npm run seed:staging

# Add configured administrator roles without generating product data
SEED_ADMINS=true \
ADMIN_ADDRESSES="<comma-separated-wallet-addresses>" \
ADMIN_ROLES="<matching-comma-separated-roles>" \
npm run seed
```

The valid administrator roles are `ROLE_ADMIN` and `ROLE_SUPER_ADMIN`. Address and role lists must
contain the same number of entries.

## Execution Flow

```mermaid
flowchart TB
  start[Start seed orchestrator] --> environment[Resolve NODE_ENV profile]
  environment --> flags[Parse explicit control flags]
  flags --> validate{Configuration valid?}
  validate -->|No| fail[Stop with an error]
  validate -->|Yes| clear{CLEAR_DATA enabled?}
  clear -->|Yes, non-production| delete[Delete teams and users]
  clear -->|Yes, production| fail
  clear -->|No| database
  delete --> database{SEED_DATABASE enabled?}
  database -->|Yes| entities[Seed dependent entities in order]
  database -->|No| admins
  entities --> admins{SEED_ADMINS enabled?}
  admins -->|Yes| roles[Create or update configured administrators]
  admins -->|No| summary[Print database summary]
  roles --> summary
```

## Safety Boundaries

- `CLEAR_DATA=true` is rejected when `NODE_ENV=production`.
- Production execution requires `SEED_DATABASE=true` or `SEED_ADMINS=true`.
- Data and administrator seeding are independently controlled.
- Administrator seeding validates every wallet address and role before assignment.
- The production volume profile contains zero generated entities; explicit enablement alone does not
  define production data.
- `seed:reset` invokes a forced Prisma migration reset and then runs the seed script without setting
  `SEED_DATABASE=true`; treat it as destructive tooling and do not assume it repopulates data.

## Entity Dependency Order

```mermaid
flowchart LR
  users[Users] --> teams[Teams]
  teams --> memberships[Memberships]
  teams --> wages[Wages]
  wages --> claims[Weekly and daily claims]
  teams --> expenses[Expenses]
  teams --> actions[Board actions]
  users --> notifications[Notifications]
```

The current orchestrator calls users, teams, wages, claims, expenses, board actions, and
notifications. Team contract records are not called directly by the current `seed.ts` entry point.

## Preserved Historical References

The following files preserve the December 2025 documentation snapshot. Their commands, metrics,
completion claims, and file counts have not been revalidated against the current implementation; use
this README and current source for operational decisions.

- [Legacy quick start](./QUICK_START.md)
- [Legacy functional specification](./functional-specification.md)
- [Legacy implementation summary](./IMPLEMENTATION_SUMMARY.md)

## Implementation Evidence

- [Seed orchestrator](../../../backend/prisma/seed.ts)
- [Environment profiles](../../../backend/prisma/seeders/config.ts)
- [Administrator seeder](../../../backend/prisma/seeders/admin.ts)
- [Backend scripts](../../../backend/package.json)

## Related Documentation

- [Development Guide](../README.md)
- [Architectural Capability Inventory](../../implementation/README.md)
