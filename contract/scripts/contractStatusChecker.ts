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
  debugInfo?: {
    rpcEndpoint?: string
    deploymentFile?: string
    artifactPath?: string
    networkLatency?: number
    bytecodePreview?: { onchain: string; artifact: string }
    normalizationDetails?: { removed: string; pattern: string }
  }
}

class ContractStatusChecker {
  private network: string
  private deploymentDir: string
  private provider: JsonRpcProvider
  private verbose: boolean
  private networkConfig: any

  constructor(network: string, verbose: boolean = false) {
    this.network = network
    this.verbose = verbose || process.env.CONTRACT_CHECKER_VERBOSE === 'true'
    this.deploymentDir = NETWORKS[network as keyof typeof NETWORKS].deploymentDir
    this.networkConfig = NETWORKS[network as keyof typeof NETWORKS]
    
    if (this.verbose) {
      console.log(`🔧 [DEBUG] Initializing ContractStatusChecker`)
      console.log(`   Network: ${this.networkConfig.name} (Chain ID: ${this.networkConfig.chainId})`)
      console.log(`   RPC URL: ${this.networkConfig.rpcUrl}`)
      console.log(`   Deployment Dir: ${this.deploymentDir}`)
    }
    
    // Create provider for the selected network with timeout
    this.provider = new JsonRpcProvider(this.networkConfig.rpcUrl, undefined, {
      staticNetwork: true
    })
    
    // Set a connection timeout
    this.provider.pollingInterval = 10000 // 10 seconds
    
    if (this.verbose) {
      console.log(`   Provider polling interval: ${this.provider.pollingInterval}ms`)
    }
  }

  async checkAllContracts(): Promise<ContractStatus[]> {
    console.log(`\n🔍 Checking contracts on ${this.networkConfig.name}...\n`)
    
    if (this.verbose) {
      console.log(`🔧 [DEBUG] Starting contract check process`)
      console.log(`   Total contracts to check: ${Object.keys(CONTRACT_TYPES).length}`)
    }
    
    // Test network connectivity first
    if (this.verbose) {
      console.log(`🌐 [DEBUG] Testing network connectivity...`)
      const startTime = Date.now()
      try {
        const blockNumber = await this.provider.getBlockNumber()
        const latency = Date.now() - startTime
        console.log(`   ✅ Network connected - Latest block: ${blockNumber} (${latency}ms)`)
      } catch (error) {
        const latency = Date.now() - startTime
        console.log(`   ❌ Network connection failed (${latency}ms): ${error}`)
      }
    }
    
    const deployedAddresses = this.loadDeployedAddresses()
    if (!deployedAddresses) {
      console.log(`❌ No deployed addresses found for ${this.network}`)
      if (this.verbose) {
        const deploymentPath = path.join(__dirname, '../ignition/deployments', this.deploymentDir, 'deployed_addresses.json')
        console.log(`🔧 [DEBUG] Expected deployment file: ${deploymentPath}`)
      }
      return []
    }

    if (this.verbose) {
      console.log(`📄 [DEBUG] Loaded deployment addresses:`)
      Object.entries(deployedAddresses).forEach(([key, address]) => {
        console.log(`   ${key}: ${address}`)
      })
      console.log(`   Total deployed contracts: ${Object.keys(deployedAddresses).length}`)
    }

    const results: ContractStatus[] = []
    
    for (const [contractName, config] of Object.entries(CONTRACT_TYPES)) {
      if (this.verbose) {
        console.log(`\n🔧 [DEBUG] === Checking ${contractName} (${config.type}) ===`)
      } else {
        console.log(`Checking ${contractName}...`)
      }
      
      const startTime = Date.now()
      const status = await this.checkContract(contractName, config, deployedAddresses)
      const checkTime = Date.now() - startTime
      
      if (this.verbose) {
        console.log(`   Check completed in ${checkTime}ms`)
      }
      
      results.push(status)
    }

    return results
  }

  private loadDeployedAddresses(): any {
    const deploymentPath = path.join(__dirname, '../ignition/deployments', this.deploymentDir, 'deployed_addresses.json')
    
    if (this.verbose) {
      console.log(`📂 [DEBUG] Looking for deployment file: ${deploymentPath}`)
    }
    
    if (!fs.existsSync(deploymentPath)) {
      if (this.verbose) {
        console.log(`   ❌ Deployment file not found`)
        // List available deployment directories
        const deploymentsRoot = path.join(__dirname, '../ignition/deployments')
        if (fs.existsSync(deploymentsRoot)) {
          const availableDirs = fs.readdirSync(deploymentsRoot).filter(dir => 
            fs.statSync(path.join(deploymentsRoot, dir)).isDirectory()
          )
          console.log(`   Available deployment directories:`)
          availableDirs.forEach(dir => console.log(`     - ${dir}`))
        }
      }
      return null
    }

    try {
      const content = fs.readFileSync(deploymentPath, 'utf8')
      const addresses = JSON.parse(content)
      
      if (this.verbose) {
        console.log(`   ✅ Deployment file loaded successfully`)
        console.log(`   File size: ${content.length} bytes`)
        console.log(`   Contract count: ${Object.keys(addresses).length}`)
      }
      
      return addresses
    } catch (error) {
      console.error(`Error reading deployment file: ${error}`)
      if (this.verbose) {
        console.log(`🔧 [DEBUG] File content preview:`)
        try {
          const content = fs.readFileSync(deploymentPath, 'utf8')
          console.log(`   First 200 chars: ${content.substring(0, 200)}...`)
        } catch (readError) {
          console.log(`   Could not read file for preview: ${readError}`)
        }
      }
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
      status: 'not_found',
      debugInfo: {
        rpcEndpoint: this.networkConfig.rpcUrl,
        deploymentFile: path.join(__dirname, '../ignition/deployments', this.deploymentDir, 'deployed_addresses.json')
      }
    }

    try {
      if (this.verbose) {
        console.log(`🔧 [DEBUG] Step 1: Resolving contract addresses...`)
      }

      // Get the contract's deployed address and implementation
      const addressStartTime = Date.now()
      const addressInfo = await this.getContractAddresses(contractName, config, deployedAddresses)
      const addressTime = Date.now() - addressStartTime
      
      if (this.verbose) {
        console.log(`   Address resolution took ${addressTime}ms`)
        console.log(`   Deployed Address: ${addressInfo.deployedAddress || 'N/A'}`)
        console.log(`   Implementation Address: ${addressInfo.implementationAddress || 'N/A'}`)
      }
      
      if (!addressInfo.implementationAddress) {
        result.status = 'not_found'
        result.error = 'Contract not found in deployments'
        if (this.verbose) {
          console.log(`   ❌ No implementation address found`)
        }
        return result
      }

      result.deployedAddress = addressInfo.deployedAddress
      result.implementationAddress = addressInfo.implementationAddress

      if (this.verbose) {
        console.log(`🔧 [DEBUG] Step 2: Fetching on-chain bytecode...`)
      }

      // Get bytecode from chain
      const chainStartTime = Date.now()
      const onchainBytecode = await this.provider.getCode(addressInfo.implementationAddress)
      const chainTime = Date.now() - chainStartTime
      
      if (this.verbose) {
        console.log(`   Chain query took ${chainTime}ms`)
        console.log(`   Raw bytecode length: ${onchainBytecode.length} chars`)
        console.log(`   Bytecode preview: ${onchainBytecode.substring(0, 100)}...`)
      }
      
      if (onchainBytecode === '0x') {
        result.status = 'error'
        result.error = 'No bytecode found at implementation address'
        if (this.verbose) {
          console.log(`   ❌ No bytecode at address (contract may not be deployed)`)
        }
        return result
      }

      if (this.verbose) {
        console.log(`🔧 [DEBUG] Step 3: Loading artifact bytecode...`)
      }

      // Get bytecode from artifact
      const artifactStartTime = Date.now()
      const artifactResult = await this.getArtifactBytecode(contractName)
      const artifactTime = Date.now() - artifactStartTime
      
      if (this.verbose) {
        console.log(`   Artifact loading took ${artifactTime}ms`)
        if (artifactResult) {
          console.log(`   Artifact path: ${artifactResult.path}`)
          console.log(`   Artifact bytecode length: ${artifactResult.bytecode.length} chars`)
          console.log(`   Artifact preview: ${artifactResult.bytecode.substring(0, 100)}...`)
        }
      }
      
      if (!artifactResult) {
        result.status = 'error'
        result.error = 'Artifact bytecode not found'
        if (this.verbose) {
          console.log(`   ❌ Could not find artifact for ${contractName}`)
        }
        return result
      }

      result.debugInfo!.artifactPath = artifactResult.path

      if (this.verbose) {
        console.log(`🔧 [DEBUG] Step 4: Normalizing and comparing bytecodes...`)
      }

      // Compare bytecodes (normalize by removing metadata hash)
      const normalizeStartTime = Date.now()
      const normalizedOnchain = this.normalizeBytecode(onchainBytecode)
      const normalizedArtifact = this.normalizeBytecode(artifactResult.bytecode)
      const normalizeTime = Date.now() - normalizeStartTime

      result.bytecodeLength = {
        onchain: normalizedOnchain.length,
        artifact: normalizedArtifact.length
      }

      if (this.verbose) {
        console.log(`   Normalization took ${normalizeTime}ms`)
        console.log(`   Normalized lengths - Onchain: ${normalizedOnchain.length}, Artifact: ${normalizedArtifact.length}`)
        
        // Show normalization details
        const originalOnchainLength = onchainBytecode.length - 2 // Remove 0x
        const originalArtifactLength = artifactResult.bytecode.length - 2
        
        if (originalOnchainLength !== normalizedOnchain.length) {
          console.log(`   Onchain metadata removed: ${originalOnchainLength - normalizedOnchain.length} chars`)
        }
        if (originalArtifactLength !== normalizedArtifact.length) {
          console.log(`   Artifact metadata removed: ${originalArtifactLength - normalizedArtifact.length} chars`)
        }
        
        // Show preview of normalized bytecode for comparison
        const previewLength = 80
        result.debugInfo!.bytecodePreview = {
          onchain: normalizedOnchain.substring(0, previewLength) + (normalizedOnchain.length > previewLength ? '...' : ''),
          artifact: normalizedArtifact.substring(0, previewLength) + (normalizedArtifact.length > previewLength ? '...' : '')
        }
        
        console.log(`   Normalized onchain preview:  ${result.debugInfo!.bytecodePreview.onchain}`)
        console.log(`   Normalized artifact preview: ${result.debugInfo!.bytecodePreview.artifact}`)
        
        if (normalizedOnchain !== normalizedArtifact) {
          // Find where they first differ
          let firstDiff = -1
          const minLength = Math.min(normalizedOnchain.length, normalizedArtifact.length)
          for (let i = 0; i < minLength; i++) {
            if (normalizedOnchain[i] !== normalizedArtifact[i]) {
              firstDiff = i
              break
            }
          }
          
          if (firstDiff >= 0) {
            console.log(`   First difference at position: ${firstDiff}`)
            const context = 20
            const start = Math.max(0, firstDiff - context)
            const end = Math.min(minLength, firstDiff + context)
            console.log(`   Onchain around diff:  ...${normalizedOnchain.substring(start, end)}...`)
            console.log(`   Artifact around diff: ...${normalizedArtifact.substring(start, end)}...`)
          } else if (normalizedOnchain.length !== normalizedArtifact.length) {
            console.log(`   Bytecodes identical up to shorter length, but different total lengths`)
          }
        }
      }

      if (normalizedOnchain === normalizedArtifact) {
        result.status = 'match'
        if (this.verbose) {
          console.log(`   ✅ Bytecodes match perfectly`)
        }
      } else {
        result.status = 'diverge'
        if (this.verbose) {
          console.log(`   ⚠️ Bytecodes differ`)
        }
      }

      result.debugInfo!.networkLatency = chainTime

    } catch (error) {
      result.status = 'error'
      result.error = error instanceof Error ? error.message : 'Unknown error'
      
      if (this.verbose) {
        console.log(`   ❌ Error during check: ${result.error}`)
        if (error instanceof Error && error.stack) {
          console.log(`   Stack trace: ${error.stack}`)
        }
      }
    }

    return result
  }

  private async getContractAddresses(
    contractName: string, 
    config: any, 
    deployedAddresses: any
  ): Promise<{ deployedAddress?: string; implementationAddress?: string }> {
    
    if (this.verbose) {
      console.log(`🔧 [DEBUG] Resolving addresses for ${contractName} (type: ${config.type})`)
    }
    
    switch (config.type) {
      case 'direct':
        if (this.verbose) {
          console.log(`   Looking for direct contract addresses...`)
        }
        
        // For direct contracts, the deployed address is the implementation
        const directKeys = [
          `${contractName}#${contractName}`,
          `Officer#${contractName}`,
          `BoardOfDirectorsModule#${contractName}`
        ]
        
        if (this.verbose) {
          console.log(`   Checking deployment keys: ${directKeys.join(', ')}`)
        }
        
        const directAddress = deployedAddresses[directKeys[0]] || 
                             deployedAddresses[directKeys[1]] ||
                             deployedAddresses[directKeys[2]]
        
        if (this.verbose) {
          if (directAddress) {
            console.log(`   ✅ Found direct address: ${directAddress}`)
          } else {
            console.log(`   ❌ No direct address found`)
            console.log(`   Available keys: ${Object.keys(deployedAddresses).join(', ')}`)
          }
        }
        
        return {
          deployedAddress: directAddress,
          implementationAddress: directAddress
        }

      case 'beacon':
        if (this.verbose) {
          console.log(`   Looking for beacon contract: ${config.beacon}`)
        }
        
        // For beacon contracts, get the implementation from the beacon
        const beaconAddress = deployedAddresses[config.beacon]
        if (!beaconAddress) {
          if (this.verbose) {
            console.log(`   ❌ Beacon address not found for key: ${config.beacon}`)
            console.log(`   Available keys: ${Object.keys(deployedAddresses).join(', ')}`)
          }
          return {}
        }

        if (this.verbose) {
          console.log(`   ✅ Beacon found at: ${beaconAddress}`)
          console.log(`   Calling beacon.implementation()...`)
        }

        try {
          // Create a contract instance for the beacon
          const beacon = new ethers.Contract(
            beaconAddress, 
            ['function implementation() view returns (address)'],
            this.provider
          )
          
          const callStartTime = Date.now()
          const implementationAddress = await beacon.implementation()
          const callTime = Date.now() - callStartTime
          
          if (this.verbose) {
            console.log(`   ✅ Implementation call took ${callTime}ms`)
            console.log(`   Implementation address: ${implementationAddress}`)
          }
          
          return {
            deployedAddress: beaconAddress,
            implementationAddress: implementationAddress
          }
        } catch (error) {
          const errorMsg = `Failed to get implementation from beacon ${beaconAddress}: ${error}`
          console.warn(errorMsg)
          
          if (this.verbose) {
            console.log(`   ❌ Beacon call failed`)
            if (error instanceof Error && error.stack) {
              console.log(`   Error stack: ${error.stack}`)
            }
          }
          
          return {}
        }

      case 'proxy':
        if (this.verbose) {
          console.log(`   Looking for proxy contract: ${config.implementation}`)
        }
        
        // For proxy contracts, get the implementation from the proxy
        const proxyAddress = deployedAddresses[config.implementation]
        if (!proxyAddress) {
          if (this.verbose) {
            console.log(`   ❌ Proxy address not found for key: ${config.implementation}`)
            console.log(`   Available keys: ${Object.keys(deployedAddresses).join(', ')}`)
          }
          return {}
        }

        if (this.verbose) {
          console.log(`   ✅ Proxy found at: ${proxyAddress}`)
          console.log(`   Reading EIP-1967 implementation slot...`)
        }

        try {
          // Try to get implementation using EIP-1967 standard
          const implementationSlot = '0x360894a13ba1a3210667c828492db98dca3e2076cc3735a920a3ca505d382bbc'
          
          const storageStartTime = Date.now()
          const implementationHex = await this.provider.getStorage(proxyAddress, implementationSlot)
          const storageTime = Date.now() - storageStartTime
          
          if (this.verbose) {
            console.log(`   Storage read took ${storageTime}ms`)
            console.log(`   Raw storage value: ${implementationHex}`)
          }
          
          // Convert to address by taking last 20 bytes
          if (implementationHex && implementationHex !== '0x0000000000000000000000000000000000000000000000000000000000000000') {
            const cleanAddress = '0x' + implementationHex.slice(-40)
            
            if (this.verbose) {
              console.log(`   ✅ Implementation address: ${cleanAddress}`)
            }
            
            return {
              deployedAddress: proxyAddress,
              implementationAddress: cleanAddress
            }
          } else {
            if (this.verbose) {
              console.log(`   ❌ Empty implementation slot`)
            }
          }
          
          return {}
        } catch (error) {
          const errorMsg = `Failed to get implementation from proxy ${proxyAddress}: ${error}`
          console.warn(errorMsg)
          
          if (this.verbose) {
            console.log(`   ❌ Proxy storage read failed`)
            if (error instanceof Error && error.stack) {
              console.log(`   Error stack: ${error.stack}`)
            }
          }
          
          return {}
        }

      default:
        if (this.verbose) {
          console.log(`   ❌ Unknown contract type: ${config.type}`)
        }
        return {}
    }
  }

  private async getArtifactBytecode(contractName: string): Promise<{ bytecode: string; path: string } | null> {
    // Map some contract names to their actual artifact names
    const artifactMap: { [key: string]: string } = {
      'InvestorV1': 'InvestorV1',
      'ExpenseAccountEIP712': 'ExpenseAccountEIP712',
      'ExpenseAccount': 'ExpenseAccount'
    }

    const actualContractName = artifactMap[contractName] || contractName
    
    if (this.verbose) {
      console.log(`   Searching for artifact: ${actualContractName}`)
      if (actualContractName !== contractName) {
        console.log(`   Mapped from: ${contractName}`)
      }
    }
    
    const possiblePaths = [
      `contracts/${actualContractName}.sol/${actualContractName}.json`,
      `contracts/expense-account/${actualContractName}.sol/${actualContractName}.json`,
      `contracts/Investor/${actualContractName}.sol/${actualContractName}.json`,
      `contracts/Elections/${actualContractName}.sol/${actualContractName}.json`,
      `contracts/Proposals/${actualContractName}.sol/${actualContractName}.json`,
      `contracts/Voting/${actualContractName}.sol/${actualContractName}.json`
    ]

    if (this.verbose) {
      console.log(`   Checking ${possiblePaths.length} possible artifact paths:`)
      possiblePaths.forEach((relativePath, index) => {
        console.log(`     ${index + 1}. ${relativePath}`)
      })
    }

    for (const relativePath of possiblePaths) {
      const artifactPath = path.join(__dirname, '../artifacts', relativePath)
      
      if (this.verbose) {
        console.log(`   Checking: ${artifactPath}`)
      }
      
      if (fs.existsSync(artifactPath)) {
        try {
          const artifactContent = fs.readFileSync(artifactPath, 'utf8')
          const artifact = JSON.parse(artifactContent)
          
          if (this.verbose) {
            console.log(`   ✅ Found artifact`)
            console.log(`   File size: ${artifactContent.length} bytes`)
            console.log(`   Contract name in artifact: ${artifact.contractName || 'N/A'}`)
            console.log(`   Bytecode length: ${artifact.bytecode ? artifact.bytecode.length : 0} chars`)
            
            if (artifact.bytecode) {
              const hasConstructor = artifact.bytecode.includes('608060405234801561001057600080fd5b5')
              console.log(`   Has constructor pattern: ${hasConstructor}`)
              
              if (artifact.linkReferences && Object.keys(artifact.linkReferences).length > 0) {
                console.log(`   Has link references: ${JSON.stringify(artifact.linkReferences)}`)
              }
            }
          }
          
          return {
            bytecode: artifact.bytecode,
            path: artifactPath
          }
        } catch (error) {
          const errorMsg = `Error reading artifact at ${artifactPath}: ${error}`
          console.warn(errorMsg)
          
          if (this.verbose) {
            console.log(`   ❌ Parse error`)
            if (error instanceof Error && error.stack) {
              console.log(`   Error stack: ${error.stack}`)
            }
            
            // Try to show file content preview
            try {
              const content = fs.readFileSync(artifactPath, 'utf8')
              console.log(`   File preview: ${content.substring(0, 200)}...`)
            } catch (readError) {
              console.log(`   Could not read file for preview: ${readError}`)
            }
          }
          continue
        }
      } else {
        if (this.verbose) {
          console.log(`   ❌ File not found`)
        }
      }
    }

    if (this.verbose) {
      console.log(`   ❌ No artifact found for ${contractName}`)
      
      // List available artifacts in contracts directory
      const contractsDir = path.join(__dirname, '../artifacts/contracts')
      if (fs.existsSync(contractsDir)) {
        console.log(`   Available contract directories:`)
        try {
          const dirs = fs.readdirSync(contractsDir, { withFileTypes: true })
            .filter(dirent => dirent.isDirectory())
            .map(dirent => dirent.name)
          dirs.forEach(dir => console.log(`     - ${dir}`))
        } catch (error) {
          console.log(`     Could not list directories: ${error}`)
        }
      }
    }

    return null
  }

  private normalizeBytecode(bytecode: string): string {
    // Remove 0x prefix
    let normalized = bytecode.startsWith('0x') ? bytecode.slice(2) : bytecode
    
    if (this.verbose) {
      console.log(`     Normalizing bytecode (original length: ${normalized.length} chars)`)
    }
    
    // Remove metadata hash if present
    // Solidity metadata pattern: a264697066735822{32-byte-hash}64736f6c63{3-byte-version}0033
    const metadataPattern = /a264697066735822[0-9a-f]{64}64736f6c63[0-9a-f]{6}0033$/i
    const metadataMatch = normalized.match(metadataPattern)
    
    if (metadataMatch) {
      normalized = normalized.replace(metadataPattern, '')
      
      if (this.verbose) {
        console.log(`     Removed metadata: ${metadataMatch[0]}`)
        console.log(`     Normalized length: ${normalized.length} chars`)
      }
    } else {
      if (this.verbose) {
        console.log(`     No Solidity metadata found to remove`)
        // Check for other common patterns
        const endPattern = normalized.slice(-200) // Last 200 chars
        console.log(`     Bytecode end pattern: ...${endPattern}`)
      }
    }
    
    return normalized.toLowerCase()
  }

  static printResults(results: ContractStatus[], verbose: boolean = false): void {
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
      
      // Verbose debug information
      if (verbose && result.debugInfo) {
        console.log(`   🔧 Debug Info:`)
        
        if (result.debugInfo.rpcEndpoint) {
          console.log(`      RPC Endpoint: ${result.debugInfo.rpcEndpoint}`)
        }
        
        if (result.debugInfo.deploymentFile) {
          console.log(`      Deployment File: ${result.debugInfo.deploymentFile}`)
        }
        
        if (result.debugInfo.artifactPath) {
          console.log(`      Artifact Path: ${result.debugInfo.artifactPath}`)
        }
        
        if (result.debugInfo.networkLatency) {
          console.log(`      Network Latency: ${result.debugInfo.networkLatency}ms`)
        }
        
        if (result.debugInfo.bytecodePreview) {
          console.log(`      Bytecode Preview:`)
          console.log(`        Onchain:  ${result.debugInfo.bytecodePreview.onchain}`)
          console.log(`        Artifact: ${result.debugInfo.bytecodePreview.artifact}`)
        }
        
        if (result.debugInfo.normalizationDetails) {
          console.log(`      Normalization: ${result.debugInfo.normalizationDetails.pattern} - ${result.debugInfo.normalizationDetails.removed}`)
        }
      }
      
      console.log()
    })

    console.log('Summary:')
    console.log(`✅ Matches: ${summary.match}`)
    console.log(`⚠️  Divergences: ${summary.diverge}`)
    console.log(`❌ Errors: ${summary.error}`)
    console.log(`❓ Not Found: ${summary.not_found}`)
    
    if (verbose) {
      console.log('\n🔧 Debug Summary:')
      const totalContracts = results.length
      const withDebugInfo = results.filter(r => r.debugInfo).length
      console.log(`   Total contracts checked: ${totalContracts}`)
      console.log(`   Debug info available: ${withDebugInfo}`)
      
      const networkLatencies = results
        .filter(r => r.debugInfo?.networkLatency)
        .map(r => r.debugInfo!.networkLatency!)
      
      if (networkLatencies.length > 0) {
        const avgLatency = networkLatencies.reduce((a, b) => a + b, 0) / networkLatencies.length
        const minLatency = Math.min(...networkLatencies)
        const maxLatency = Math.max(...networkLatencies)
        console.log(`   Network latency - Avg: ${avgLatency.toFixed(1)}ms, Min: ${minLatency}ms, Max: ${maxLatency}ms`)
      }
    }
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
  
  // Check for verbose mode
  const verbose = process.argv.includes('--verbose') || process.argv.includes('-v') || process.env.CONTRACT_CHECKER_VERBOSE === 'true'
  
  if (verbose) {
    console.log('🔧 [DEBUG] Verbose mode enabled')
    console.log('   Use --verbose or -v flag, or set CONTRACT_CHECKER_VERBOSE=true environment variable')
  }
  
  try {
    const selectedNetwork = await selectNetwork()
    console.log(`\nSelected network: ${NETWORKS[selectedNetwork as keyof typeof NETWORKS].name}`)
    
    const checker = new ContractStatusChecker(selectedNetwork, verbose)
    const results = await checker.checkAllContracts()
    
    ContractStatusChecker.printResults(results, verbose)
    
  } catch (error) {
    console.error('❌ Error running contract status checker:', error)
    
    if (verbose && error instanceof Error && error.stack) {
      console.error('Stack trace:', error.stack)
    }
    
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