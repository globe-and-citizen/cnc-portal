#!/bin/bash

# Check if the first argument is provided
if [ -z "$1" ]; then
  echo "Error: No network specified."
  echo "Usage: $0 <network>"
  exit 1
fi

npx hardhat ignition deploy ignition/modules/ProxyModule.ts --network "$1"
npx hardhat ignition deploy ignition/modules/BankImplementationModule.ts --network "$1"
npx hardhat ignition deploy ignition/modules/BankBeaconModule.ts --network "$1"
npx hardhat ignition deploy ignition/modules/ExpenseAccountModule.ts --network "$1"
