# CNC Portal

CNC Portal helps open-source projects recognize contributors' micro-contributions and coordinate effective governance.

## Start here

- **Human contributors:** read [CONTRIBUTION.md](./CONTRIBUTION.md) for shared workflow and validation, then choose the relevant
  [development guide](./docs/development-guide/README.md).
- **Project documentation:** use the [documentation hub](./docs/README.md) to find product, architecture, contract, and platform owners.
- **AI agents:** start with [AGENTS.md](./AGENTS.md) in addition to the shared contribution contract.
- **Local environment:** use the component `.env.example` files and the development Compose configuration. Exact runtime requirements and
  commands are owned by each component's `package.json`; there is no root npm workspace.

## Components

| Component                    | Purpose                                      | Setup and executable source                                                                                                               |
| ---------------------------- | -------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------- |
| [`app/`](./app/)             | Vue client application                       | [`package.json`](./app/package.json), [environment example](./app/.env.example), and [E2E guide](./app/test/README.md)                    |
| [`backend/`](./backend/)     | Express API and Prisma data layer            | [`package.json`](./backend/package.json) and [environment example](./backend/.env.example)                                                |
| [`dashboard/`](./dashboard/) | Nuxt backoffice dashboard                    | [`package.json`](./dashboard/package.json) and [environment example](./dashboard/.env.example)                                            |
| [`contract/`](./contract/)   | Solidity contracts, deployment, and upgrades | [`package.json`](./contract/package.json), [contract guide](./contract/README.md), and [upgrade strategy](./contract/UPGRADE_STRATEGY.md) |

Use the relevant component scripts and configuration as the executable setup contract. Do not copy dependency versions, command lists, or
environment-variable values into this overview.

## Documentation and contributions

- [Contribution requirements](./CONTRIBUTION.md)
- [Documentation hub](./docs/README.md)
- [Documentation maintenance policy](./docs/platform/documentation-maintenance.md)
- [Current roadmap](./docs/ROADMAP.md)
