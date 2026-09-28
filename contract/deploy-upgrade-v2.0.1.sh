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

echo "Verifying beacon ownership and recording rollback inputs..."
CNC_UPGRADE_TARGET=all \
  CNC_EXPECTED_VERSIONS=2.0.0,2.0.1 \
  CNC_UPGRADE_MANIFEST_PATH="$manifest_path" \
  npx hardhat run scripts/verify-v201-upgrade.ts --network "$network"

if [[ "${CNC_PREPARE_ONLY:-0}" == "1" ]]; then
  echo "Preparation checks passed. No upgrade transaction was broadcast."
  exit 0
fi

deploy_and_verify() {
  local target="$1"
  local module_path="$2"

  echo "Upgrading $target..."
  CNC_UPGRADE_CHAIN_ID="$chain_id" npx hardhat ignition deploy "$module_path" --network "$network"
  CNC_UPGRADE_TARGET="$target" \
    CNC_EXPECTED_VERSIONS=2.0.1 \
    npx hardhat run scripts/verify-v201-upgrade.ts --network "$network"
}

deploy_and_verify CashRemunerationEIP712 ignition/modules/upgrades/v2.0.1/CashRemunerationUpgradeModule.ts
deploy_and_verify ExpenseAccountEIP712 ignition/modules/upgrades/v2.0.1/ExpenseAccountUpgradeModule.ts
deploy_and_verify Investor ignition/modules/upgrades/v2.0.1/InvestorUpgradeModule.ts
deploy_and_verify Officer ignition/modules/upgrades/v2.0.1/OfficerUpgradeModule.ts

echo "Verifying the complete Polygon 2.0.1 implementation set..."
CNC_UPGRADE_TARGET=all \
  CNC_EXPECTED_VERSIONS=2.0.1 \
  npx hardhat run scripts/verify-v201-upgrade.ts --network "$network"

echo "Upgrade complete. Pre-upgrade implementation addresses are stored in $manifest_path"
