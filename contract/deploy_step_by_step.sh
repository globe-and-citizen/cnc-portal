#!/usr/bin/env bash

set -euo pipefail

if [ $# -lt 1 ]; then
  echo "Usage: $0 <network> [deployment_id] [pause_seconds] [mock]"
  echo
  echo "Examples:"
  echo "  $0 polygon"
  echo "  $0 polygon polygon-stack-20260403 10"
  echo "  $0 polygon polygon-stack-20260403 5 mock"
  exit 1
fi

NETWORK="$1"
DEPLOYMENT_ID="${2:-polygon-stack-$(date +%Y%m%d-%H%M%S)}"
PAUSE_SECONDS="${3:-10}"
MOCK_FLAG="${4:-}"

if ! [[ "$PAUSE_SECONDS" =~ ^[0-9]+$ ]]; then
  echo "Error: pause_seconds must be a non-negative integer."
  exit 1
fi

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

MODULES=(
  # Officer dependencies (deploy individually to reduce provider pressure)
  "ignition/modules/FeeCollectorModule.ts"
  "ignition/modules/BankBeaconModule.ts"
  "ignition/modules/BoardOfDirectorsBeaconModule.ts"
  "ignition/modules/ProposalModule.ts"
  "ignition/modules/ElectionsModule.ts"
  "ignition/modules/InvestorsV1BeaconModule.ts"
  "ignition/modules/ExpenseAccountEIP712Module.ts"
  "ignition/modules/CashRemunerationEIP712Module.ts"
  "ignition/modules/SafeDepositRouterBeaconModule.ts"

  # Officer itself (should mostly reuse completed futures above)
  "ignition/modules/OfficerModule.ts"

  # Remaining stack
  "ignition/modules/VestingProxyModule.ts"
  # Run this later once Officer has an actual deployed InvestorV1:
  # "ignition/modules/VestingInvestorRoleModule.ts"
)

if [ "$MOCK_FLAG" = "mock" ]; then
  MODULES+=("ignition/modules/MockTokensModule.ts")
fi

echo "Network:       $NETWORK"
echo "Deployment ID: $DEPLOYMENT_ID"
echo "Pause:         ${PAUSE_SECONDS}s"
echo

run_module() {
  local module="$1"
  echo "============================================================"
  echo "Deploying: $module"
  echo "Command: npx hardhat ignition deploy $module --network $NETWORK --deployment-id $DEPLOYMENT_ID"
  echo "============================================================"
  npx hardhat ignition deploy "$module" --network "$NETWORK" --deployment-id "$DEPLOYMENT_ID"
}

last_index=$((${#MODULES[@]} - 1))

for i in "${!MODULES[@]}"; do
  run_module "${MODULES[$i]}"

  if [ "$i" -lt "$last_index" ] && [ "$PAUSE_SECONDS" -gt 0 ]; then
    echo
    echo "Waiting ${PAUSE_SECONDS}s before next module..."
    sleep "$PAUSE_SECONDS"
    echo
  fi
done

echo "All deployment steps completed."
