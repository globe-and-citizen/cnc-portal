#!/bin/bash

# Check if the first argument is provided
if [ -z "$1" ]; then
  echo "Error: No network specified."
  echo "Usage: $0 <network>"
  exit 1
fi

npx hardhat ignition deploy ignition/modules/ProxyModule.ts --network "$1"
npx hardhat ignition deploy ignition/modules/OfficerModule.ts --network "$1"

if [ "$2" == "mock" ]; then
  npx hardhat ignition deploy ignition/modules/MockTokensModule.ts --network "$1"
fi