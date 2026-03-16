# Contract: Officer

**Epic Goal:** Deploy and orchestrate all team contracts from a single on-chain hub.
**Contract File:** `contracts/Officer.sol`
**Upgradeable:** Yes (Beacon)
**Last updated:** 2026-03-16

---

## Status Overview

| User Story     | Title                                        | Contract | Frontend | Effort |
| -------------- | -------------------------------------------- | :------: | :------: | ------ |
| US-OFFICER-001 | Deploy all team contracts in one transaction | ✅       | 🚫       | L      |
| US-OFFICER-002 | Configure beacons per contract type          | ✅       | 🚫       | S      |
| US-OFFICER-003 | Look up a deployed contract by type          | ✅       | 🚫       | XS     |
| US-OFFICER-004 | Query fee configuration via Officer          | ✅       | 🚫       | S      |
| US-OFFICER-005 | Pause/unpause team operations                | ✅       | 🚫       | S      |

**Contract: 5 / 5 — Frontend: 0 / 5**

---

## Implementation Notes

- **Contract:** `contracts/Officer.sol`
- **Key functions:** `deployAllContracts`, `deployBeaconProxy`, `findDeployedContract`, `configureBeacon`, `getFeeFor`, `isFeeCollectorToken`
- **Access roles:** `onlyOwner` for configuration and deployment
- **Dependencies:** FeeCollector (fee queries), FactoryBeacon (creates Officer instances), Beacon (per-contract-type implementation pointers)
- **Pattern:** Stores `DeployedContract[]` array; also auto-links contracts (Bank↔InvestorV1, Elections→BoardOfDirectors, CashRemuneration→InvestorV1) after deployment

---

## US-OFFICER-001: Deploy All Team Contracts in One Transaction

> **As a** deployer, **I want to** create all required team contracts (Bank, InvestorV1, Elections, etc.) in a single transaction, **so that** the team is fully set up without manual per-contract deployment steps.

**Status:** ✅ | **Priority:** P1 | **Effort:** L | **Dependencies:** US-OFFICER-002

### Acceptance Criteria

- [x] `deployAllContracts(deployments[])` accepts an array of `{ contractType, initializerData }` entries
- [x] Each entry creates a `UserBeaconProxy` pointing to the configured beacon for that type
- [x] Proxies are registered in the internal `_deployedContracts` array
- [x] Auto-linking runs after deployment: Bank receives InvestorV1 address via Officer lookup; CashRemuneration receives MINTER_ROLE on InvestorV1; Elections receives BoardOfDirectors address
- [x] Ownership of each deployed contract is transferred to the team owner
- [x] Returns array of deployed addresses in the same order as inputs
- [x] Reverts if a required beacon is not configured

---

## US-OFFICER-002: Configure Beacons per Contract Type

> **As a** deployer, **I want to** register a beacon address for each contract type, **so that** Officer knows which implementation to use when deploying proxies.

**Status:** ✅ | **Priority:** P1 | **Effort:** S | **Dependencies:** none

### Acceptance Criteria

- [x] `configureBeacon(contractType, beaconAddress)` stores the mapping
- [x] Only the Officer owner can call this function
- [x] `getConfiguredContractTypes()` returns all registered type strings
- [x] Reconfiguring an existing type overwrites the previous beacon address
- [x] Reverts if `beaconAddress` is zero address

---

## US-OFFICER-003: Look Up a Deployed Contract by Type

> **As a** team member, **I want to** resolve the address of any deployed contract by its type string, **so that** contracts can locate siblings (e.g. InvestorV1 → Bank) without hard-coded addresses.

**Status:** ✅ | **Priority:** P1 | **Effort:** XS | **Dependencies:** US-OFFICER-001

### Acceptance Criteria

- [x] `findDeployedContract(contractType)` iterates `_deployedContracts` and returns the matching address
- [x] Returns `address(0)` if no contract of that type is deployed
- [x] `getDeployedContracts()` returns the full `DeployedContract[]` array
- [x] Called at runtime by Bank, InvestorV1, Elections, etc. to resolve sibling addresses dynamically

---

## US-OFFICER-004: Query Fee Configuration via Officer

> **As a** contract, **I want to** retrieve the protocol fee and check whether a token is supported by FeeCollector, **so that** I can compute and route fees without storing these addresses locally.

**Status:** ✅ | **Priority:** P2 | **Effort:** S | **Dependencies:** none

### Acceptance Criteria

- [x] `getFeeFor(contractType)` delegates to FeeCollector and returns the fee in basis points
- [x] `getFeeCollector()` returns the FeeCollector address stored at initialisation
- [x] `isFeeCollectorToken(tokenAddress)` returns whether the token is on the FeeCollector whitelist
- [x] Returns `0` for unknown contract types (no revert)
- [x] FeeCollector address set once at `initialize()` and immutable thereafter

---

## US-OFFICER-005: Pause/Unpause Team Operations

> **As a** team owner, **I want to** pause all Officer-controlled operations in an emergency, **so that** no new deployments or configuration changes can occur during an incident.

**Status:** ✅ | **Priority:** P2 | **Effort:** S | **Dependencies:** none

### Acceptance Criteria

- [x] Officer inherits OpenZeppelin `PausableUpgradeable`
- [x] `pause()` / `unpause()` restricted to `onlyOwner`
- [x] `deployBeaconProxy` and `deployAllContracts` blocked when paused
- [x] State variable changes (e.g. `configureBeacon`) blocked when paused

---

_[← Back to index](../README.md)_
