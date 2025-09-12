import { ContractStatusChecker } from './contractStatusChecker'
import * as fs from 'fs'
import * as path from 'path'

/**
 * Demo script that shows contract status checking functionality
 * This version works offline by using mock data and deployment information
 */

async function demonstrateStatusChecker() {
  console.log('🏗️  Contract Status Checker Demo')
  console.log('=================================')
  console.log('This demo shows how the contract status checker works with deployment files.\n')

  // Check available deployment networks
  const deploymentsDir = path.join(__dirname, '../ignition/deployments')
  const networks = fs.readdirSync(deploymentsDir).filter(dir => 
    fs.statSync(path.join(deploymentsDir, dir)).isDirectory()
  )

  console.log('📁 Available Deployment Networks:')
  networks.forEach(network => {
    const chainMap: { [key: string]: string } = {
      'chain-31337': 'Hardhat Local',
      'chain-11155111': 'Sepolia Testnet', 
      'chain-137': 'Polygon Mainnet',
      'chain-80002': 'Polygon Amoy'
    }
    
    const networkName = chainMap[network] || network
    console.log(`  - ${networkName} (${network})`)
    
    // Check deployed addresses
    const deployedPath = path.join(deploymentsDir, network, 'deployed_addresses.json')
    if (fs.existsSync(deployedPath)) {
      const deployed = JSON.parse(fs.readFileSync(deployedPath, 'utf8'))
      const contractCount = Object.keys(deployed).length
      console.log(`    └─ ${contractCount} contracts deployed`)
    }
  })

  console.log('\n🔍 Deployment Analysis:')
  
  // Analyze each network's deployments
  for (const network of networks) {
    const deployedPath = path.join(deploymentsDir, network, 'deployed_addresses.json')
    if (!fs.existsSync(deployedPath)) continue
    
    const deployed = JSON.parse(fs.readFileSync(deployedPath, 'utf8'))
    const chainMap: { [key: string]: string } = {
      'chain-31337': 'Hardhat Local',
      'chain-11155111': 'Sepolia Testnet', 
      'chain-137': 'Polygon Mainnet',
      'chain-80002': 'Polygon Amoy'
    }
    
    const networkName = chainMap[network] || network
    console.log(`\n📊 ${networkName}:`)
    
    // Group contracts by type
    const contractTypes = {
      beacons: [] as string[],
      implementations: [] as string[],
      proxies: [] as string[],
      direct: [] as string[]
    }
    
    Object.keys(deployed).forEach(key => {
      if (key.includes('Beacon') || key.includes('FactoryBeacon')) {
        contractTypes.beacons.push(key)
      } else if (key.includes('Proxy') || key.includes('TransparentUpgradeableProxy')) {
        contractTypes.proxies.push(key)
      } else if (key.includes('#')) {
        // Implementation or named contract
        const contractName = key.split('#')[1]
        if (['Bank', 'Officer', 'BoardOfDirectors', 'Tips', 'Vesting'].includes(contractName)) {
          contractTypes.implementations.push(key)
        } else {
          contractTypes.direct.push(key)
        }
      } else {
        contractTypes.direct.push(key)
      }
    })
    
    if (contractTypes.beacons.length > 0) {
      console.log(`  🔗 Beacons (${contractTypes.beacons.length}):`)
      contractTypes.beacons.forEach(beacon => {
        console.log(`    - ${beacon}: ${deployed[beacon]}`)
      })
    }
    
    if (contractTypes.implementations.length > 0) {
      console.log(`  📦 Implementations (${contractTypes.implementations.length}):`)
      contractTypes.implementations.forEach(impl => {
        console.log(`    - ${impl}: ${deployed[impl]}`)
      })
    }
    
    if (contractTypes.proxies.length > 0) {
      console.log(`  🔀 Proxies (${contractTypes.proxies.length}):`)
      contractTypes.proxies.forEach(proxy => {
        console.log(`    - ${proxy}: ${deployed[proxy]}`)
      })
    }
  }

  console.log('\n🛠️  How the Status Checker Works:')
  console.log('1. 📂 Reads deployment addresses from ignition/deployments/<network>/')
  console.log('2. 🔍 For each contract, determines its type (direct, beacon, or proxy)')
  console.log('3. 📡 Connects to the blockchain network via RPC')
  console.log('4. 🔗 For beacon contracts: calls beacon.implementation() to get actual implementation address')
  console.log('5. 🔀 For proxy contracts: reads EIP-1967 storage slot to get implementation address')
  console.log('6. 📄 Gets bytecode from the blockchain at the implementation address')
  console.log('7. 📚 Loads compiled bytecode from artifacts/')
  console.log('8. ⚖️  Compares bytecodes (after normalizing to remove metadata hashes)')
  console.log('9. ✅ Reports MATCH, ⚠️  DIVERGE, ❌ ERROR, or ❓ NOT_FOUND')
  
  console.log('\n📋 Usage Examples:')
  console.log('# Interactive mode - select network from menu:')
  console.log('npm run check-contracts')
  console.log('')
  console.log('# Verbose mode for debugging - shows detailed info:')
  console.log('npm run check-contracts-verbose')
  console.log('')
  console.log('# With environment variable:')
  console.log('CONTRACT_CHECKER_VERBOSE=true npm run check-contracts')
  console.log('')
  console.log('# Run with node.js directly:')
  console.log('npx hardhat run scripts/contractStatusChecker.ts')
  console.log('npx hardhat run scripts/contractStatusChecker.ts -- --verbose')
  console.log('')
  console.log('# Run tests:')
  console.log('npx hardhat test scripts/contractStatusChecker.test.ts')
  
  console.log('\n🎯 What to Look For:')
  console.log('✅ MATCH - Implementation on-chain matches your local artifacts')
  console.log('⚠️  DIVERGE - Implementation differs! You may need to update or redeploy')
  console.log('❌ ERROR - Network connection issues or contract problems')
  console.log('❓ NOT_FOUND - Contract not deployed or address not found')
  
  console.log('\n📝 Note:')
  console.log('This demo ran in offline mode. To check actual on-chain contracts,')
  console.log('ensure you have network access and run the interactive script.')
}

// Run the demo
if (require.main === module) {
  demonstrateStatusChecker().catch(console.error)
}

export { demonstrateStatusChecker }