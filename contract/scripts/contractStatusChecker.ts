import { ethers } from 'hardhat'
import { JsonRpcProvider } from 'ethers'
import * as fs from 'fs'
import * as path from 'path'
import * as readline from 'readline'
import * as dotenv from 'dotenv'

dotenv.config()

// Network configurations
const NETWORKS = {
  hardhat: { 
    name: 'Hardhat Local', 
    chainId: 31337, 
    deploymentDir: 'chain-31337',
    rpcUrl: 'http://localhost:8545'
  },
  sepolia: { 
    name: 'Sepolia Testnet', 
    chainId: 11155111, 
    deploymentDir: 'chain-11155111',
    rpcUrl: process.env.SEPOLIA_URL || 'https://ethereum-sepolia-rpc.publicnode.com'
  },
  polygon: { 
    name: 'Polygon Mainnet', 
    chainId: 137, 
    deploymentDir: 'chain-137',
    rpcUrl: process.env.POLYGON_URL || 'https://polygon-rpc.com'
  },
  amoy: { 
    name: 'Polygon Amoy', 
    chainId: 80002, 
    deploymentDir: 'chain-80002',
    rpcUrl: process.env.AMOY_URL || 'https://rpc-amoy.polygon.technology'
  }
}

// Contract types and their beacon status
const CONTRACT_TYPES = {
  // Direct contracts (no beacon)
  'Tips': { type: 'proxy', implementation: 'ProxyModule#Tips' },
  'BoardOfDirectors': { type: 'direct' },
  'Officer': { type: 'direct' },
  'Vesting': { type: 'proxy', implementation: 'VestingModule#Vesting' },
  
  // Beacon-based contracts
  'Bank': { type: 'beacon', beacon: 'BankBeaconModule#Beacon' },
  'CashRemunerationEIP712': { type: 'beacon', beacon: 'CashRemunerationEIP712Module#FactoryBeacon' },
  'ExpenseAccountEIP712': { type: 'beacon', beacon: 'ExpenseAccountEIP712Module#FactoryBeacon' },
  'ExpenseAccount': { type: 'beacon', beacon: 'ExpenseAccountModule#FactoryBeacon' },
  'InvestorV1': { type: 'beacon', beacon: 'InvestorsV1BeaconModule#Beacon' },
  'Voting': { type: 'beacon', beacon: 'VotingBeaconModule#Beacon' },
  'Elections': { type: 'beacon', beacon: 'ElectionsBeaconModule#Beacon' },
  'Proposals': { type: 'beacon', beacon: 'ProposalBeaconModule#Beacon' }
}

interface ContractStatus {
  name: string
  type: 'direct' | 'beacon' | 'proxy'
  deployedAddress?: string
  implementationAddress?: string
  status: 'match' | 'diverge' | 'error' | 'not_found'
  error?: string
  bytecodeLength?: { onchain: number; artifact: number }
}

class ContractStatusChecker {
  private network: string
  private deploymentDir: string
  private provider: JsonRpcProvider

  constructor(network: string) {
    this.network = network
    this.deploymentDir = NETWORKS[network as keyof typeof NETWORKS].deploymentDir
    
    // Create provider for the selected network with timeout
    const networkConfig = NETWORKS[network as keyof typeof NETWORKS]
    this.provider = new JsonRpcProvider(networkConfig.rpcUrl, undefined, {
      staticNetwork: true
    })
    
    // Set a connection timeout
    this.provider.pollingInterval = 10000 // 10 seconds
  }

  async checkAllContracts(): Promise<ContractStatus[]> {
    console.log(`\n🔍 Checking contracts on ${NETWORKS[this.network as keyof typeof NETWORKS].name}...\n`)
    
    const deployedAddresses = this.loadDeployedAddresses()
    if (!deployedAddresses) {
      console.log(`❌ No deployed addresses found for ${this.network}`)
      return []
    }

    const results: ContractStatus[] = []
    
    for (const [contractName, config] of Object.entries(CONTRACT_TYPES)) {
      console.log(`Checking ${contractName}...`)
      const status = await this.checkContract(contractName, config, deployedAddresses)
      results.push(status)
    }

    return results
  }

  private loadDeployedAddresses(): any {
    const deploymentPath = path.join(__dirname, '../ignition/deployments', this.deploymentDir, 'deployed_addresses.json')
    
    if (!fs.existsSync(deploymentPath)) {
      return null
    }

    try {
      return JSON.parse(fs.readFileSync(deploymentPath, 'utf8'))
    } catch (error) {
      console.error(`Error reading deployment file: ${error}`)
      return null
    }
  }

  private async checkContract(
    contractName: string, 
    config: any, 
    deployedAddresses: any
  ): Promise<ContractStatus> {
    const result: ContractStatus = {
      name: contractName,
      type: config.type,
      status: 'not_found'
    }

    try {
      // Get the contract's deployed address and implementation
      const addressInfo = await this.getContractAddresses(contractName, config, deployedAddresses)
      
      if (!addressInfo.implementationAddress) {
        result.status = 'not_found'
        result.error = 'Contract not found in deployments'
        return result
      }

      result.deployedAddress = addressInfo.deployedAddress
      result.implementationAddress = addressInfo.implementationAddress

      // Get bytecode from chain
      const onchainBytecode = await this.provider.getCode(addressInfo.implementationAddress)
      
      if (onchainBytecode === '0x') {
        result.status = 'error'
        result.error = 'No bytecode found at implementation address'
        return result
      }

      // Get bytecode from artifact
      const artifactBytecode = await this.getArtifactBytecode(contractName)
      
      if (!artifactBytecode) {
        result.status = 'error'
        result.error = 'Artifact bytecode not found'
        return result
      }

      // Compare bytecodes (normalize by removing metadata hash)
      const normalizedOnchain = this.normalizeBytecode(onchainBytecode)
      const normalizedArtifact = this.normalizeBytecode(artifactBytecode)

      result.bytecodeLength = {
        onchain: normalizedOnchain.length,
        artifact: normalizedArtifact.length
      }

      if (normalizedOnchain === normalizedArtifact) {
        result.status = 'match'
      } else {
        result.status = 'diverge'
      }

    } catch (error) {
      result.status = 'error'
      result.error = error instanceof Error ? error.message : 'Unknown error'
    }

    return result
  }

  private async getContractAddresses(
    contractName: string, 
    config: any, 
    deployedAddresses: any
  ): Promise<{ deployedAddress?: string; implementationAddress?: string }> {
    
    switch (config.type) {
      case 'direct':
        // For direct contracts, the deployed address is the implementation
        const directAddress = deployedAddresses[`${contractName}#${contractName}`] || 
                             deployedAddresses[`Officer#${contractName}`] ||
                             deployedAddresses[`BoardOfDirectorsModule#${contractName}`]
        return {
          deployedAddress: directAddress,
          implementationAddress: directAddress
        }

      case 'beacon':
        // For beacon contracts, get the implementation from the beacon
        const beaconAddress = deployedAddresses[config.beacon]
        if (!beaconAddress) {
          return {}
        }

        try {
          // Create a contract instance for the beacon
          const beacon = new ethers.Contract(
            beaconAddress, 
            ['function implementation() view returns (address)'],
            this.provider
          )
          const implementationAddress = await beacon.implementation()
          
          return {
            deployedAddress: beaconAddress,
            implementationAddress: implementationAddress
          }
        } catch (error) {
          console.warn(`Failed to get implementation from beacon ${beaconAddress}: ${error}`)
          return {}
        }

      case 'proxy':
        // For proxy contracts, get the implementation from the proxy
        const proxyAddress = deployedAddresses[config.implementation]
        if (!proxyAddress) {
          return {}
        }

        try {
          // Try to get implementation using EIP-1967 standard
          const implementationSlot = '0x360894a13ba1a3210667c828492db98dca3e2076cc3735a920a3ca505d382bbc'
          const implementationHex = await this.provider.getStorage(proxyAddress, implementationSlot)
          
          // Convert to address by taking last 20 bytes
          if (implementationHex && implementationHex !== '0x0000000000000000000000000000000000000000000000000000000000000000') {
            const cleanAddress = '0x' + implementationHex.slice(-40)
            
            return {
              deployedAddress: proxyAddress,
              implementationAddress: cleanAddress
            }
          }
          
          return {}
        } catch (error) {
          console.warn(`Failed to get implementation from proxy ${proxyAddress}: ${error}`)
          return {}
        }

      default:
        return {}
    }
  }

  private async getArtifactBytecode(contractName: string): Promise<string | null> {
    // Map some contract names to their actual artifact names
    const artifactMap: { [key: string]: string } = {
      'InvestorV1': 'InvestorV1',
      'ExpenseAccountEIP712': 'ExpenseAccountEIP712',
      'ExpenseAccount': 'ExpenseAccount'
    }

    const actualContractName = artifactMap[contractName] || contractName
    
    const possiblePaths = [
      `contracts/${actualContractName}.sol/${actualContractName}.json`,
      `contracts/expense-account/${actualContractName}.sol/${actualContractName}.json`,
      `contracts/Investor/${actualContractName}.sol/${actualContractName}.json`,
      `contracts/Elections/${actualContractName}.sol/${actualContractName}.json`,
      `contracts/Proposals/${actualContractName}.sol/${actualContractName}.json`,
      `contracts/Voting/${actualContractName}.sol/${actualContractName}.json`
    ]

    for (const relativePath of possiblePaths) {
      const artifactPath = path.join(__dirname, '../artifacts', relativePath)
      
      if (fs.existsSync(artifactPath)) {
        try {
          const artifact = JSON.parse(fs.readFileSync(artifactPath, 'utf8'))
          return artifact.bytecode
        } catch (error) {
          console.warn(`Error reading artifact at ${artifactPath}: ${error}`)
          continue
        }
      }
    }

    return null
  }

  private normalizeBytecode(bytecode: string): string {
    // Remove 0x prefix
    let normalized = bytecode.startsWith('0x') ? bytecode.slice(2) : bytecode
    
    // Remove metadata hash if present
    // Solidity metadata pattern: a264697066735822{32-byte-hash}64736f6c63{3-byte-version}0033
    const metadataPattern = /a264697066735822[0-9a-f]{64}64736f6c63[0-9a-f]{6}0033$/i
    if (metadataPattern.test(normalized)) {
      normalized = normalized.replace(metadataPattern, '')
    }
    
    return normalized.toLowerCase()
  }

  static printResults(results: ContractStatus[]): void {
    console.log('\n📊 Contract Status Report')
    console.log('========================\n')

    const summary = {
      match: 0,
      diverge: 0,
      error: 0,
      not_found: 0
    }

    results.forEach(result => {
      summary[result.status]++
      
      const statusIcon = {
        match: '✅',
        diverge: '⚠️ ',
        error: '❌',
        not_found: '❓'
      }[result.status]

      const statusText = {
        match: 'MATCH',
        diverge: 'DIVERGE',
        error: 'ERROR',
        not_found: 'NOT_FOUND'
      }[result.status]

      console.log(`${statusIcon} ${result.name} (${result.type})`)
      console.log(`   Status: ${statusText}`)
      
      if (result.deployedAddress) {
        console.log(`   Deployed: ${result.deployedAddress}`)
      }
      
      if (result.implementationAddress) {
        console.log(`   Implementation: ${result.implementationAddress}`)
      }
      
      if (result.bytecodeLength) {
        console.log(`   Bytecode Length - Onchain: ${result.bytecodeLength.onchain}, Artifact: ${result.bytecodeLength.artifact}`)
      }
      
      if (result.error) {
        console.log(`   Error: ${result.error}`)
      }
      
      console.log()
    })

    console.log('Summary:')
    console.log(`✅ Matches: ${summary.match}`)
    console.log(`⚠️  Divergences: ${summary.diverge}`)
    console.log(`❌ Errors: ${summary.error}`)
    console.log(`❓ Not Found: ${summary.not_found}`)
  }
}

async function selectNetwork(): Promise<string> {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  })

  console.log('🌐 Please select a network:')
  console.log('1. Hardhat Local (31337)')
  console.log('2. Sepolia Testnet (11155111)')
  console.log('3. Polygon Mainnet (137)')
  console.log('4. Polygon Amoy (80002)')
  
  return new Promise((resolve) => {
    rl.question('\nEnter your choice (1-4): ', (answer) => {
      rl.close()
      
      const networkMap = {
        '1': 'hardhat',
        '2': 'sepolia', 
        '3': 'polygon',
        '4': 'amoy'
      }

      const network = networkMap[answer as keyof typeof networkMap]
      if (!network) {
        console.log('Invalid selection. Defaulting to hardhat.')
        resolve('hardhat')
      } else {
        resolve(network)
      }
    })
  })
}

async function main() {
  console.log('🏗️  Contract Status Checker')
  console.log('===========================')
  
  try {
    const selectedNetwork = await selectNetwork()
    console.log(`\nSelected network: ${NETWORKS[selectedNetwork as keyof typeof NETWORKS].name}`)
    
    const checker = new ContractStatusChecker(selectedNetwork)
    const results = await checker.checkAllContracts()
    
    ContractStatusChecker.printResults(results)
    
  } catch (error) {
    console.error('❌ Error running contract status checker:', error)
    process.exit(1)
  }
}

// Run the script
if (require.main === module) {
  main().catch((error) => {
    console.error(error)
    process.exit(1)
  })
}

export { ContractStatusChecker }