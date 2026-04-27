#!/usr/bin/env bash

set -euo pipefail

# Ponder requires DATABASE_SCHEMA, and Railway branch/deploy values can contain
# invalid schema characters. Build a safe schema name automatically.
build_default_input() {
  local base="ponder"

  if [[ -n "${RAILWAY_ENVIRONMENT_NAME:-}" ]]; then
    base+="_${RAILWAY_ENVIRONMENT_NAME}"
  fi

  if [[ -n "${RAILWAY_SERVICE_NAME:-}" ]]; then
    base+="_${RAILWAY_SERVICE_NAME}"
  fi

  if [[ -n "${RAILWAY_DEPLOYMENT_ID:-}" ]]; then
    base+="_${RAILWAY_DEPLOYMENT_ID}"
  fi

  if [[ -n "${RAILWAY_GIT_BRANCH:-}" ]]; then
    base+="_${RAILWAY_GIT_BRANCH}"
  fi

  printf '%s' "$base"
}

sanitize_schema() {
  local value="$1"
  local cleaned
  cleaned="$(printf '%s' "$value" \
    | tr '[:upper:]' '[:lower:]' \
    | sed -E 's/[^a-z0-9_]+/_/g; s/_+/_/g; s/^_+|_+$//g')"

  if [[ -z "$cleaned" ]]; then
    cleaned="ponder_default"
  fi

  if [[ "$cleaned" != ponder_* ]]; then
    cleaned="ponder_${cleaned}"
  fi

  if [[ "$cleaned" == "ponder_sync" ]]; then
    cleaned="ponder_sync_app"
  fi

  # Keep below Ponder/Postgres identifier guardrails.
  cleaned="$(printf '%s' "$cleaned" | cut -c1-45)"
  printf '%s' "$cleaned"
}

INPUT_SCHEMA="${DATABASE_SCHEMA:-$(build_default_input)}"
export DATABASE_SCHEMA
DATABASE_SCHEMA="$(sanitize_schema "$INPUT_SCHEMA")"

echo "Using DATABASE_SCHEMA=${DATABASE_SCHEMA}"

exec ponder start "$@"
