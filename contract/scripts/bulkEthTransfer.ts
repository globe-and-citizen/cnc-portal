import { ethers } from 'hardhat'
import * as fs from 'fs'
import * as path from 'path'

interface AddressConfig {
  addresses: string[]
  amountPerAddress: string // ETH amount as string (e.g., "1.0")
}

async function main() {
  console.log('🚀 Starting bulk ETH transfer script...')
  
  // Path to the addresses JSON file
  const addressesFilePath = path.join(__dirname, 'addresses.json')
  
  // Check if addresses file exists
  if (!fs.existsSync(addressesFilePath)) {
    console.error('❌ addresses.json file not found!')
    console.log('📝 Please create an addresses.json file in the scripts directory with the following format:')
    console.log(JSON.stringify({
      addresses: [
        "0x...", // Replace with actual addresses
        "0x..."
      ],
      amountPerAddress: "1.0" // ETH amount to send to each address
    }, null, 2))
    process.exit(1)
  }

  try {
    // Read and parse the addresses file
    const configData = fs.readFileSync(addressesFilePath, 'utf-8')
    const config: AddressConfig = JSON.parse(configData)
    
    if (!config.addresses || !Array.isArray(config.addresses)) {
      throw new Error('Invalid addresses array in config file')
    }
    
    if (!config.amountPerAddress) {
      throw new Error('amountPerAddress is required in config file')
    }

    const { addresses, amountPerAddress } = config
    
    // Get the signer (should be a funded account)
    const [signer] = await ethers.getSigners()
    console.log(`📝 Using signer: ${signer.address}`)
    
    // Check signer balance
    const signerBalance = await ethers.provider.getBalance(signer.address)
    const totalRequired = ethers.parseEther(amountPerAddress) * BigInt(addresses.length)
    
    console.log(`💰 Signer balance: ${ethers.formatEther(signerBalance)} ETH`)
    console.log(`💸 Total required: ${ethers.formatEther(totalRequired)} ETH`)
    
    if (signerBalance < totalRequired) {
      console.error('❌ Insufficient balance for bulk transfer!')
      process.exit(1)
    }

    console.log(`📊 Preparing to send ${amountPerAddress} ETH to ${addresses.length} addresses`)
    
    // Validate addresses
    for (let i = 0; i < addresses.length; i++) {
      if (!ethers.isAddress(addresses[i])) {
        throw new Error(`Invalid address at index ${i}: ${addresses[i]}`)
      }
    }
    
    // Send ETH to each address
    const transferPromises = addresses.map(async (address, index) => {
      try {
        console.log(`📤 [${index + 1}/${addresses.length}] Sending ${amountPerAddress} ETH to ${address}...`)
        
        const tx = await signer.sendTransaction({
          to: address,
          value: ethers.parseEther(amountPerAddress)
        })
        
        await tx.wait()
        console.log(`✅ [${index + 1}/${addresses.length}] Transfer successful! TX: ${tx.hash}`)
        
        return { address, success: true, txHash: tx.hash }
      } catch (error) {
        console.error(`❌ [${index + 1}/${addresses.length}] Transfer failed for ${address}:`, error)
        return { address, success: false, error: error instanceof Error ? error.message : 'Unknown error' }
      }
    })

    // Wait for all transfers to complete
    console.log('⏳ Waiting for all transfers to complete...')
    const results = await Promise.all(transferPromises)
    
    // Summary
    const successful = results.filter(r => r.success)
    const failed = results.filter(r => !r.success)
    
    console.log('\n📋 Transfer Summary:')
    console.log(`✅ Successful: ${successful.length}`)
    console.log(`❌ Failed: ${failed.length}`)
    console.log(`💰 Total ETH sent: ${ethers.formatEther(ethers.parseEther(amountPerAddress) * BigInt(successful.length))} ETH`)
    
    if (failed.length > 0) {
      console.log('\n❌ Failed transfers:')
      failed.forEach(f => {
        console.log(`  - ${f.address}: ${'error' in f ? f.error : 'Unknown error'}`)
      })
    }
    
    console.log('\n🎉 Bulk ETH transfer completed!')
    
  } catch (error) {
    console.error('❌ Script failed:', error)
    process.exit(1)
  }
}

// Execute the script
main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})