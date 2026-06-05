# Solidity Audit Checklist

Pre-merge checklist for every PR that touches `contract/`. Deployed contract bugs
are unrecoverable post-deploy, so this list is **mandatory** — copy it into the PR
description and tick each item. It complements the upgrade-safety rules in
[`../../contract/UPGRADE_STRATEGY.md`](../../contract/UPGRADE_STRATEGY.md) and the
general [`review-checklist.md`](./review-checklist.md).

## Automated gate (CI)

[`.github/workflows/contract-slither.yml`](../workflows/contract-slither.yml) runs
[Slither](https://github.com/crytic/slither) on every PR touching `contract/`.

- [ ] **Slither passes.** The job blocks the PR on **new high / medium severity**
      findings. Low / informational findings are uploaded to the GitHub Security
      tab (code scanning) but do not fail the build.
- [ ] **No silent suppressions.** Any false positive is excluded **explicitly** in
      [`../../contract/slither.config.json`](../../contract/slither.config.json)
      (or with an inline `// slither-disable-next-line <detector>` plus a one-line
      justification), never by loosening the severity gate.

## Manual review

Slither cannot catch everything. Confirm each of these by hand:

- [ ] **No `hardhat/console.sol`** (or any `console.sol`) imported in production
      contracts. It is only allowed under `contracts/mocks` and `contracts/test`.
      A dedicated CI guard already enforces this, but check it in review too.
- [ ] **No raw `transfer` / `transferFrom` on ERC-20.** Use OpenZeppelin
      `SafeERC20` (`safeTransfer` / `safeTransferFrom`). Some tokens do not return
      a bool and a raw `transfer` silently fails against them.
- [ ] **`__gap` on every upgradeable contract.** Each upgradeable contract reserves
      a `uint256[N] private __gap;` storage gap so future versions can add state
      without colliding with child layouts.
- [ ] **No `blockhash` (or `block.timestamp` / `block.prevrandao`) used as a source
      of randomness.** These are miner/validator-influenceable. Use a commit-reveal
      scheme or an external VRF if randomness is required.
- [ ] **`nonReentrant` on token paths.** Any function that moves value (ETH or ERC-20
      in/out) or performs an external call before updating state is guarded by
      `ReentrancyGuard` / follows checks-effects-interactions.
- [ ] **Access control reviewed.** Every state-changing entry point has an explicit
      authorization check (`onlyOwner` / role / membership). New roles are documented.
- [ ] **No unchecked external call return values.** `call` / `send` results are
      checked; prefer pull-over-push for payouts.

## Upgrade safety

- [ ] **Storage layout / upgrade safety checked.** Run
      `npm run validate-upgrade:polygon` (production baseline) — see
      [`../../contract/UPGRADE_STRATEGY.md`](../../contract/UPGRADE_STRATEGY.md).
      A `FAIL` means **do not upgrade the proxy in place**.
- [ ] **`version()` bumped** per the semver convention when the implementation changes.
- [ ] **Baselines updated** (`BAKE=1 ...`) only **after** a production deploy, never before.

## Outputs

- [ ] **ABIs regenerated.** Run `npm run update-abi` (or `npm run compile`, which
      runs the ABI exporter) and commit the refreshed ABIs mirrored into `app/`,
      `dashboard/`, and `ponder/`.
- [ ] **`CHANGELOG.md` updated** for any deployed change.

## Local commands

```bash
cd contract
npm run compile             # also regenerates ABIs
npm run lint                # solhint + eslint
npm run test
npm run validate-upgrade:polygon
npm run update-abi          # refresh ABIs into app/ dashboard/ ponder/
```

Slither itself is **not** required locally — CI runs it. To run it locally anyway:

```bash
pip install slither-analyzer
cd contract && slither . --config-file slither.config.json
```
