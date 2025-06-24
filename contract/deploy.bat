@echo off
REM Usage: deploy.bat <network> [mock]

IF "%1"=="" (
  echo Error: No network specified.
  echo Usage: %0 ^<network^> [mock]
  exit /b 1
)

call npx hardhat ignition deploy ignition/modules/ProxyModule.ts --network %1
call npx hardhat ignition deploy ignition/modules/OfficerModule.ts --network %1
call npx hardhat ignition deploy ignition/modules/VestingProxyModule.ts --network %1

IF /I "%2"=="mock" (
  call npx hardhat ignition deploy ignition/modules/MockTokensModule.ts --network %1
)
