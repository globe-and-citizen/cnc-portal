#!/bin/bash

# Bulk ETH Transfer Script Runner (localhost only)

echo "🚀 Bulk ETH Transfer — localhost"
echo "================================"

npx hardhat run ./scripts/bulkSendEth.ts --network localhost
