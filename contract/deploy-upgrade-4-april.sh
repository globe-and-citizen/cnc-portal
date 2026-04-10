#!/usr/bin/env bash

NETWORK="polygon"

npx hardhat ignition deploy ignition/modules/ExpenseAccountUpgradeModule.ts --network "$NETWORK"
npx hardhat ignition deploy ignition/modules/CashRemunerationUpgradeModule.ts --network "$NETWORK"
