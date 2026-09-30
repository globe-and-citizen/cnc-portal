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
#
# After regenerating the versions you care about, rebuild and distribute them:
#   node contract/scripts/build-version-registry.mjs
#   node contract/scripts/distribute-versions.mjs
set -euo pipefail

VERSION="${1:?usage: regenerate-version.sh <version> <deploy-commit>}"
COMMIT="${2:?usage: regenerate-version.sh <version> <deploy-commit>}"
REPO="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT

echo "[$VERSION] clone + checkout $COMMIT"
git clone --quiet "$REPO" "$TMP/clone"
git -C "$TMP/clone" checkout -f --detach "$COMMIT"

echo "[$VERSION] npm ci + compile at the historical commit"
( cd "$TMP/clone/contract" && npm ci --no-audit --no-fund && npm run compile )

CANON="$REPO/contract/versions/$VERSION"
mkdir -p "$CANON/abi" "$CANON/deployed_addresses"

node "$REPO/contract/scripts/extract-compiled-abis.mjs" \
  "$TMP/clone/contract/artifacts" "$CANON/abi"
cp "$TMP/clone/contract/ignition/deployments/chain-137/deployed_addresses.json" \
   "$CANON/deployed_addresses/chain-137.json"

echo "[$VERSION] done: $(ls "$CANON/abi" | wc -l | tr -d ' ') canonical ABI json + deployed_addresses"
