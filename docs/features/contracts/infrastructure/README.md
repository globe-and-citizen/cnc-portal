# Contract: Infrastructure (FactoryBeacon, Beacon, UserBeaconProxy)

**Epic Goal:** Provide the upgrade-safe deployment primitives that underpin all team contracts.
**Contract Files:** `contracts/beacons/FactoryBeacon.sol`, `contracts/beacons/Beacon.sol`, `contracts/beacons/UserBeaconProxy.sol`
**Upgradeable:** No (these are the upgrade mechanism themselves)
**Last updated:** 2026-03-16

---

## Status Overview

| User Story   | Title                                               | Status | Effort |
| ------------ | --------------------------------------------------- | ------ | ------ |
| US-INFRA-001 | Deploy a new Officer instance via FactoryBeacon     | ✅     | M      |
| US-INFRA-002 | Upgrade all proxies atomically by updating a Beacon | ✅     | M      |
| US-INFRA-003 | Delegate calls transparently via UserBeaconProxy    | ✅     | S      |

**3 / 3 stories complete**

---

## Implementation Notes

- **FactoryBeacon** (`contracts/beacons/FactoryBeacon.sol`): Singleton entry point; creates Officer instances as `UserBeaconProxy` contracts pointing to the Officer Beacon
- **Beacon** (`contracts/beacons/Beacon.sol`): Stores a single `implementation` address; one Beacon per contract type; owner calls `upgradeTo(newImpl)` to update all proxies at once
- **UserBeaconProxy** (`contracts/beacons/UserBeaconProxy.sol`): Lightweight delegatecall proxy; reads implementation from its Beacon on every call; created by FactoryBeacon (for Officers) and by Officer (for all other contracts)
- **Pattern:** OpenZeppelin Beacon Proxy pattern; all instances of a contract type share logic from one Beacon; upgrading the Beacon upgrades all instances simultaneously

---

## US-INFRA-001: Deploy a New Officer Instance via FactoryBeacon

> **As a** deployer, **I want to** call FactoryBeacon to create a new Officer proxy for a team, **so that** each team gets an independent Officer instance sharing the same logic.

**Status:** ✅ | **Priority:** P1 | **Effort:** M | **Dependencies:** none

### Acceptance Criteria

- [x] `FactoryBeacon.createBeaconProxy()` (or equivalent) deploys a new `UserBeaconProxy` pointing to the Officer Beacon
- [x] The proxy is initialized with the caller as team owner
- [x] Each call produces an independent storage slot (separate Officer state per team)
- [x] The new Officer proxy address returned and/or emitted in an event
- [x] FactoryBeacon itself is not upgradeable — a known, stable entry point

---

## US-INFRA-002: Upgrade All Proxies Atomically by Updating a Beacon

> **As a** protocol admin, **I want to** deploy a new contract implementation and update the Beacon, **so that** all existing proxy instances immediately use the new logic without any per-proxy transaction.

**Status:** ✅ | **Priority:** P1 | **Effort:** M | **Dependencies:** none

### Acceptance Criteria

- [x] `Beacon.upgradeTo(newImpl)` stores the new implementation address (owner only)
- [x] `newImpl` must be a non-zero address; reverts otherwise
- [x] All `UserBeaconProxy` instances pointing to this Beacon use `newImpl` on the very next call (no migration required)
- [x] Old implementation address replaced atomically in a single transaction
- [x] `Beacon.implementation()` returns the current implementation address

---

## US-INFRA-003: Delegate Calls Transparently via UserBeaconProxy

> **As a** team contract caller, **I want to** interact with a proxy address exactly as if it were the implementation contract, **so that** the upgrade mechanism is invisible to end users and integrators.

**Status:** ✅ | **Priority:** P1 | **Effort:** S | **Dependencies:** US-INFRA-002

### Acceptance Criteria

- [x] `UserBeaconProxy` reads `beacon.implementation()` on every call
- [x] All calldata forwarded via `delegatecall` to the implementation address
- [x] Return data and reverts propagated faithfully back to the caller
- [x] Proxy storage is never modified by the implementation (storage lives in proxy, logic lives in impl)
- [x] No ABI differences between calling the proxy and calling the implementation directly
- [x] `receive()` fallback handles plain ETH transfers (forwarded via delegatecall)

---

_[← Back to index](../README.md)_
