#!/usr/bin/env bash

# Check if the first argument is provided
if [ -z "$1" ]; then
  echo "Error: No network specified."
  echo "Usage: $0 <network>"
  exit 1
fi


# npx hardhat ignition deploy ignition/modules/ProxyModule.ts --network "$1"
if [ "$1" != "localhost" ] && [ "$1" != "hardhat" ]; then
  npx hardhat ignition deploy ignition/modules/FeeCollectorModule.ts --network "$1"
  npx hardhat ignition deploy ignition/modules/BankBeaconModule.ts --network "$1"
  npx hardhat ignition deploy ignition/modules/BoardOfDirectorsBeaconModule.ts --network "$1"
  npx hardhat ignition deploy ignition/modules/ProposalModule.ts --network "$1"
  npx hardhat ignition deploy ignition/modules/ElectionsModule.ts --network "$1"
  npx hardhat ignition deploy ignition/modules/InvestorBeaconModule.ts --network "$1"
  npx hardhat ignition deploy ignition/modules/ExpenseAccountEIP712Module.ts --network "$1"
  npx hardhat ignition deploy ignition/modules/CashRemunerationEIP712Module.ts --network "$1"
  npx hardhat ignition deploy ignition/modules/SafeDepositRouterBeaconModule.ts --network "$1"
fi

npx hardhat ignition deploy ignition/modules/OfficerModule.ts --network "$1"

if [ "$2" == "mock" ]; then
  npx hardhat ignition deploy ignition/modules/MockTokensModule.ts --network "$1"
fi

if [ "$1" == "localhost" ] || [ "$1" == "hardhat" ]; then
  # Safe v1.4.1 infra (Singleton, ProxyFactory, CompatibilityFallbackHandler) is
  # already live at fixed canonical addresses on every real supported network
  # (see app/src/constant/index.ts). A fresh local Hardhat node has none of it,
  # so we deploy our own copies here purely for local dev/test. Deployed last so
  # it never shifts the nonce-derived addresses of every other local contract.
  npx hardhat ignition deploy ignition/modules/SafeInfraModule.ts --network "$1"
fi