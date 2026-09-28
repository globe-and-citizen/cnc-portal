# Contract upgrade modules

Upgrade modules are release-specific Hardhat Ignition recipes. They deploy a new implementation and point an existing beacon at it; they do
not create a replacement beacon or proxy.

[`../MODULES.md`](../MODULES.md) owns the complete deployment-module inventory. This guide owns the procedure for adding and operating an
upgrade module.

## When to create one

Create an upgrade module only when all of these conditions are true:

1. A released network already has proxies using the implementation.
2. The contract's `version()` has been bumped.
3. The production storage-layout validation passes.
4. The release that will execute the upgrade is identified.

Fresh local environments should use [`../../deploy.sh`](../../deploy.sh), which deploys the latest implementations and new beacons. They do
not need to replay production upgrade history.

## Directory, naming, and lifecycle

Group each release under `upgrades/vX.Y.Z/`, then use a contract-specific filename without repeating the version:

- `upgrades/v2.0.1/InvestorUpgradeModule.ts`
- `upgrades/v2.0.3/BankUpgradeModule.ts`

The directory versions the source file, but Ignition does not use the directory as the module identity. Keep the compact version in
`buildModule(...)` and in every future ID, for example `InvestorV201UpgradeModule` and `Investor_v2_0_1`. This prevents journal collisions
between releases.

A version directory is an immutable release recipe. After it has been used on its target network, never edit it for a later release. Create
a new directory with new Ignition module and future IDs instead. Remove root-level templates and one-off modules once no current release
script uses them; Git and frozen deployment snapshots retain the history.

## Implementation pattern

Resolve the existing beacon from the canonical Ignition deployment registry. Never hard-code a beacon, proxy, implementation, or admin
address in source code.

```typescript
import { buildModule } from '@nomicfoundation/hardhat-ignition/modules'
import {
  loadDeploymentAddresses,
  requireDeploymentAddress
} from '../../../lib/deployment-addresses.js'

export default buildModule('ExampleV203UpgradeModule', (m) => {
  const beaconOwner = m.getAccount(0)
  const deployedAddresses = loadDeploymentAddresses()
  const beaconAddress = requireDeploymentAddress(
    deployedAddresses,
    'ExampleBeaconModule#Beacon'
  )
  const beacon = m.contractAt('Beacon', beaconAddress, {
    id: 'ExampleBeacon_v2_0_3'
  })
  const newImplementation = m.contract('Example', [], {
    id: 'Example_v2_0_3'
  })

  m.call(beacon, 'upgradeTo', [newImplementation], { from: beaconOwner })

  return { beacon, newImplementation }
})
```

Use `FactoryBeacon` instead of `Beacon` when that is the deployed beacon contract. Supply every constructor argument required by the new
implementation, resolving deployed dependencies from the same canonical registry.

## Release script

Add the module path from `modules/upgrades/vX.Y.Z/` to one `deploy-upgrade-vX.Y.Z.sh` script for the network that actually needs the
upgrade. The script must fail before the first transaction unless it has:

- validated storage compatibility against that network's committed baseline;
- confirmed the connected chain and the canonical deployment registry agree;
- confirmed the configured signer owns every target beacon;
- recorded the previous implementation addresses in a Git-ignored rollback manifest;
- required an explicit production confirmation value;
- rejected a dirty production worktree;
- defined dependency ordering between upgraded contracts.

After each `upgradeTo`, read back the implementation and reported contract version before continuing. Do not add upgrade modules to
`deploy.sh`; that script is reserved for fresh installations.

## Test and validate

Add tests for the behaviour represented by the module:

- only the beacon owner can upgrade;
- invalid implementation addresses are rejected;
- existing proxies use the new implementation;
- proxy storage and permissions are preserved;
- the expected `version()` is visible through a representative proxy;
- the release script selects only the intended versioned modules and preserves required ordering.

Before publishing, run the production storage check and the full contract gate:

```bash
npm run validate-upgrade:polygon
npm run lint
npm run format-check
npm run compile
npm run test
```

The current Polygon `2.0.1` commands and operator checks are documented in the [`Polygon 2.0.1 runbook`](../../releases/polygon-v2.0.1.md).
