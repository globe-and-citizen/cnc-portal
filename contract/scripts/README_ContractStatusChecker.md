# Contract Status Checker

A tool to verify that deployed smart contracts match their local artifacts by comparing bytecode on-chain vs locally compiled artifacts.

## Features

- **Multi-Network Support**: Works with Hardhat local, Sepolia, Polygon, and Amoy networks
- **Proxy Pattern Support**: Handles direct contracts, beacon proxies, and transparent proxies
- **Interactive Interface**: User-friendly network selection menu
- **Bytecode Comparison**: Normalizes and compares bytecode while ignoring metadata differences
- **Comprehensive Reporting**: Clear status indicators for each contract

## Quick Start

```bash
# Run the interactive status checker
npm run check-contracts

# Run the demo (offline mode)
npm run demo-status-checker

# Run tests
npx hardhat test scripts/contractStatusChecker.test.ts
```

## How It Works

1. **📂 Reads Deployments**: Loads deployed contract addresses from `ignition/deployments/<network>/`
2. **🔍 Detects Contract Types**: Identifies whether contracts are direct, beacon-based, or proxy-based
3. **📡 Connects to Network**: Uses RPC endpoints to connect to the selected blockchain network
4. **🔗 Resolves Implementation Addresses**: 
   - For beacon contracts: calls `beacon.implementation()`
   - For proxy contracts: reads EIP-1967 storage slot
   - For direct contracts: uses the deployed address directly
5. **📄 Fetches Bytecode**: Gets the actual bytecode from the blockchain
6. **📚 Loads Artifacts**: Reads compiled bytecode from local artifacts
7. **⚖️ Compares**: Normalizes both bytecodes (removes metadata) and compares
8. **📊 Reports Results**: Shows status for each contract with detailed information

## Contract Types Supported

### Direct Contracts
- BoardOfDirectors
- Officer

### Beacon-Based Contracts
- Bank
- CashRemunerationEIP712
- ExpenseAccountEIP712
- ExpenseAccount
- InvestorV1
- Voting
- Elections
- Proposals

### Proxy Contracts
- Tips
- Vesting

## Status Indicators

- ✅ **MATCH**: Implementation on-chain matches your local artifacts
- ⚠️ **DIVERGE**: Implementation differs! You may need to update or redeploy
- ❌ **ERROR**: Network connection issues or contract problems
- ❓ **NOT_FOUND**: Contract not deployed or address not found

## Example Output

```
🔍 Checking contracts on Polygon Mainnet...

📊 Contract Status Report
========================

✅ Bank (beacon)
   Status: MATCH
   Deployed: 0x4a4173FDA9Af253Bc78A192f8B6046EEE438e9Fe
   Implementation: 0x6C4ACd4623f60d34A0d46Dfa5E34a9e9BA136B78
   Bytecode Length - Onchain: 12045, Artifact: 12045

⚠️ Officer (direct)
   Status: DIVERGE
   Deployed: 0xAF3966f1c81BA527d6D0801517B08351975d91E2
   Implementation: 0xAF3966f1c81BA527d6D0801517B08351975d91E2
   Bytecode Length - Onchain: 15234, Artifact: 15678

Summary:
✅ Matches: 1
⚠️ Divergences: 1
❌ Errors: 0
❓ Not Found: 0
```

## Configuration

### Environment Variables

Set these in your `.env` file for external network access:

```env
SEPOLIA_URL=https://your-sepolia-rpc-url
POLYGON_URL=https://your-polygon-rpc-url
AMOY_URL=https://your-amoy-rpc-url
PRIVATE_KEY=your-private-key-for-deployments
```

### Network Configuration

Networks are configured in the script with default RPC endpoints:

```typescript
const NETWORKS = {
  hardhat: { rpcUrl: 'http://localhost:8545' },
  sepolia: { rpcUrl: process.env.SEPOLIA_URL || 'https://ethereum-sepolia-rpc.publicnode.com' },
  polygon: { rpcUrl: process.env.POLYGON_URL || 'https://polygon-rpc.com' },
  amoy: { rpcUrl: process.env.AMOY_URL || 'https://rpc-amoy.polygon.technology' }
}
```

## Files

- `contractStatusChecker.ts` - Main script with status checking logic
- `contractStatusChecker.test.ts` - Test suite
- `contractStatusCheckerDemo.ts` - Offline demonstration script

## When to Use

- After deploying contract upgrades
- Before important operations to verify contract state
- As part of CI/CD pipeline to ensure deployment consistency
- When debugging contract interaction issues
- Regular audits of deployed infrastructure

## Troubleshooting

### Common Issues

1. **Network Connection Errors**: Ensure you have internet access and valid RPC URLs
2. **No Deployed Addresses Found**: Check that contracts are deployed on the selected network
3. **Bytecode Not Found**: Compile contracts with `npm run compile` before running
4. **Implementation Address Errors**: Verify beacon/proxy contracts are properly configured

### Debug Tips

- Run tests first: `npx hardhat test scripts/contractStatusChecker.test.ts`
- Try the demo mode: `npm run demo-status-checker`
- Check deployment files in `ignition/deployments/`
- Verify artifacts exist in `artifacts/contracts/`