#!/usr/bin/env bash
set -euo pipefail

contract_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$contract_dir"
network="${1:-polygon}"
if [[ "$network" != "polygon" ]]; then
  echo "Usage: $0 [polygon]" >&2
  exit 1
fi
if [[ "${CNC_CONFIRM_POLYGON_V202_UPGRADE:-}" != "upgrade-polygon-v2.0.2" ]]; then
  echo "Refusing upgrade without CNC_CONFIRM_POLYGON_V202_UPGRADE=upgrade-polygon-v2.0.2" >&2
  exit 1
fi
if [[ -n "$(git status --porcelain --untracked-files=no)" ]]; then
  echo "Refusing upgrade from a dirty worktree" >&2
  exit 1
fi
export CNC_UPGRADE_CHAIN_ID=137
timestamp="$(date -u +%Y%m%dT%H%M%SZ)"
manifest_path="${CNC_UPGRADE_MANIFEST_PATH:-$contract_dir/.upgrade-state/${network}-v2.0.2-${timestamp}.json}"
(
  unset POLYGON_URL PRIVATE_KEY POLYGONSCAN_API_KEY CONTRACT
  CNC_EXPECTED_IMPLEMENTATION_VERSION=2.0.2 CNC_STORAGE_BASELINE_NETWORK=polygon \
    CONTRACTS=ExpenseAccountEIP712 \
    npx hardhat run scripts/validate-upgrade.ts --network hardhat
)
CNC_UPGRADE_MANIFEST_PATH="$manifest_path" \
  npx hardhat run scripts/deploy-v202-upgrade.ts --network "$network"
