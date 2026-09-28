#!/usr/bin/env bash
set -euo pipefail

contract_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$contract_dir"

network="${1:-polygon}"
if [[ "$network" != "polygon" ]]; then
  echo "Usage: $0 [polygon]" >&2
  exit 1
fi

chain_id=137

if [[ "${CNC_CONFIRM_POLYGON_V201_UPGRADE:-}" != "upgrade-polygon-v2.0.1" ]]; then
  echo "Refusing Polygon upgrade without CNC_CONFIRM_POLYGON_V201_UPGRADE=upgrade-polygon-v2.0.1" >&2
  exit 1
fi

if [[ -n "$(git status --porcelain --untracked-files=no)" && "${CNC_ALLOW_DIRTY_UPGRADE_WORKTREE:-0}" != "1" ]]; then
  echo "Refusing Polygon upgrade from a dirty worktree. Commit or isolate local changes first." >&2
  exit 1
fi

export CNC_UPGRADE_CHAIN_ID="$chain_id"
timestamp="$(date -u +%Y%m%dT%H%M%SZ)"
manifest_path="${CNC_UPGRADE_MANIFEST_PATH:-$contract_dir/.upgrade-state/${network}-v2.0.1-${timestamp}.json}"

echo "Validating storage and implementation safety for the four 2.0.1 upgrades..."
(
  # These checks use compiled bytecode and committed storage baselines only. Keep
  # production configuration out of this process so the keystore remains locked.
  unset POLYGON_URL PRIVATE_KEY POLYGONSCAN_API_KEY
  CNC_STORAGE_BASELINE_NETWORK=polygon \
    CONTRACTS=CashRemunerationEIP712,ExpenseAccountEIP712,Investor,Officer \
    npx hardhat run scripts/validate-upgrade.ts --network hardhat
)

CNC_UPGRADE_MANIFEST_PATH="$manifest_path" \
  npx hardhat run scripts/deploy-v201-upgrade.ts --network "$network"
