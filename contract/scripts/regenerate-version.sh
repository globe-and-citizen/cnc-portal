#!/usr/bin/env bash
#
# Regenerate one deployment-aligned version snapshot by recompiling the contracts
# at their deploy commit (authoritative — committed ABIs can lag the .sol source)
# and copying the deployed addresses from git history.
#
#   contract/scripts/regenerate-version.sh <version> <deploy-commit>
#
# Writes:
#   contract/versions/<version>/abi/*.json
#   contract/versions/<version>/deployed_addresses/chain-137.json
#   app/src/artifacts/abi/<version>/json/*.json
#   app/src/artifacts/deployed_addresses/<version>/chain-137.json
#
# After regenerating the versions you care about, rebuild the registry:
#   node contract/scripts/build-version-registry.mjs
set -euo pipefail

VERSION="${1:?usage: regenerate-version.sh <version> <deploy-commit>}"
COMMIT="${2:?usage: regenerate-version.sh <version> <deploy-commit>}"
REPO="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT

echo "[$VERSION] clone + checkout $COMMIT"
git clone --quiet "$REPO" "$TMP/clone"
git -C "$TMP/clone" checkout -f --detach "$COMMIT"

echo "[$VERSION] npm ci + hardhat compile (regenerates ABIs at this commit)"
( cd "$TMP/clone/contract" && npm ci --no-audit --no-fund && npx hardhat compile )

CANON="$REPO/contract/versions/$VERSION"
APP_ABI="$REPO/app/src/artifacts/abi/$VERSION/json"
APP_ADDR="$REPO/app/src/artifacts/deployed_addresses/$VERSION"
mkdir -p "$CANON/abi" "$CANON/deployed_addresses" "$APP_ABI" "$APP_ADDR"

cp "$TMP/clone/app/src/artifacts/abi/json/"*.json "$CANON/abi/"
cp "$TMP/clone/contract/ignition/deployments/chain-137/deployed_addresses.json" \
   "$CANON/deployed_addresses/chain-137.json"
cp "$CANON/abi/"*.json "$APP_ABI/"
cp "$CANON/deployed_addresses/chain-137.json" "$APP_ADDR/chain-137.json"

echo "[$VERSION] done: $(ls "$CANON/abi" | wc -l | tr -d ' ') ABI json + deployed_addresses"
