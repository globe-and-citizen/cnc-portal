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
for contract_name in CashRemunerationEIP712 ExpenseAccountEIP712 Investor Officer; do
  CNC_STORAGE_BASELINE_NETWORK=polygon \
    CONTRACT="$contract_name" \
    npm run validate-upgrade:polygon
done

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

deploy_and_verify CashRemunerationEIP712 ignition/modules/CashRemunerationV201UpgradeModule.ts
deploy_and_verify ExpenseAccountEIP712 ignition/modules/ExpenseAccountV201UpgradeModule.ts
deploy_and_verify Investor ignition/modules/InvestorV201UpgradeModule.ts
deploy_and_verify Officer ignition/modules/OfficerV201UpgradeModule.ts

echo "Verifying the complete Polygon 2.0.1 implementation set..."
CNC_UPGRADE_TARGET=all \
  CNC_EXPECTED_VERSIONS=2.0.1 \
  npx hardhat run scripts/verify-v201-upgrade.ts --network "$network"

echo "Upgrade complete. Pre-upgrade implementation addresses are stored in $manifest_path"
