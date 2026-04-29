import { ethers } from 'hardhat'
import { parseEther, formatEther } from 'ethers'
import { BULK_TRANSFER_CONFIG } from './bulkTransferConfig'

// Extract configuration
const { recipients, amountPerRecipient, customAmounts, delayBetweenTx, gasLimit } =
  BULK_TRANSFER_CONFIG

// Default amount to send (can be overridden by customAmounts)
const DEFAULT_AMOUNT = parseEther(amountPerRecipient)

async function bulkSendEth() {
  console.log('🚀 Starting bulk ETH transfer...')

  // Get the signer (deployer account)
  const [signer] = await ethers.getSigners()
  const signerAddress = await signer.getAddress()

  console.log(`📝 Sender address: ${signerAddress}`)

  // Check sender balance
  const signerBalance = await ethers.provider.getBalance(signerAddress)
  console.log(`💰 Sender balance: ${formatEther(signerBalance)} ETH`)

  // Calculate total amount needed
  let totalAmount = BigInt(0)
  const transferPlan: Array<{ address: string; amount: bigint }> = []

  for (const recipient of recipients) {
    const customAmount = customAmounts[recipient]
    const amount = customAmount ? parseEther(customAmount) : DEFAULT_AMOUNT
    transferPlan.push({ address: recipient, amount })
    totalAmount += amount
  }

  console.log(`📊 Total amount needed: ${formatEther(totalAmount)} ETH`)
  console.log(`📋 Sending to ${recipients.length} addresses...\n`)

  // Check if sender has enough balance
  if (signerBalance < totalAmount) {
    console.error(
      `❌ Insufficient balance! Need ${formatEther(totalAmount)} ETH but have ${formatEther(signerBalance)} ETH`
    )
    return
  }

  const transactions = []
  const results = []

  // Send ETH to each address
  for (let i = 0; i < transferPlan.length; i++) {
    const { address: recipient, amount } = transferPlan[i]

    try {
      console.log(
        `🔄 [${i + 1}/${transferPlan.length}] Sending ${formatEther(amount)} ETH to ${recipient}...`
      )

      // Check if address is valid
      if (!ethers.isAddress(recipient)) {
        console.error(`❌ Invalid address: ${recipient}`)
        results.push({ address: recipient, status: 'failed', error: 'Invalid address' })
        continue
      }

      // Get recipient balance before transfer
      const balanceBefore = await ethers.provider.getBalance(recipient)

      // Prepare transaction
      const txParams = {
        to: recipient,
        value: amount,
        ...(gasLimit ? { gasLimit } : { gasLimit: 21000n })
      }

      // Send transaction
      const tx = await signer.sendTransaction(txParams)

      transactions.push(tx)

      console.log(`📝 Transaction hash: ${tx.hash}`)
      console.log(`⏳ Waiting for confirmation...`)

      // Wait for transaction confirmation
      const receipt = await tx.wait()

      if (receipt?.status === 1) {
        // Get recipient balance after transfer
        const balanceAfter = await ethers.provider.getBalance(recipient)

        console.log(`✅ Success! Gas used: ${receipt.gasUsed.toString()}`)
        console.log(
          `💰 Recipient balance: ${formatEther(balanceBefore)} ETH → ${formatEther(balanceAfter)} ETH\n`
        )

        results.push({
          address: recipient,
          status: 'success',
          txHash: tx.hash,
          gasUsed: receipt.gasUsed.toString(),
          amount: formatEther(amount)
        })
      } else {
        console.error(`❌ Transaction failed for ${recipient}`)
        results.push({ address: recipient, status: 'failed', error: 'Transaction failed' })
      }
    } catch (error) {
      console.error(`❌ Error sending to ${recipient}:`, error)
      results.push({
        address: recipient,
        status: 'failed',
        error: error instanceof Error ? error.message : 'Unknown error'
      })
    }

    // Add delay between transactions to avoid nonce issues
    if (i < transferPlan.length - 1 && delayBetweenTx > 0) {
      await new Promise((resolve) => setTimeout(resolve, delayBetweenTx))
    }
  }

  // Print summary
  console.log('\n📋 TRANSFER SUMMARY')
  console.log('==================')

  const successful = results.filter((r) => r.status === 'success')
  const failed = results.filter((r) => r.status === 'failed')

  // Calculate total ETH sent
  const totalEthSent = successful.reduce((total, result) => {
    return total + parseEther(result.amount || '0')
  }, BigInt(0))

  console.log(`✅ Successful transfers: ${successful.length}`)
  console.log(`❌ Failed transfers: ${failed.length}`)
  console.log(`💰 Total ETH sent: ${formatEther(totalEthSent)} ETH`)

  if (failed.length > 0) {
    console.log('\n❌ FAILED TRANSFERS:')
    failed.forEach((result) => {
      console.log(`   ${result.address}: ${result.error}`)
    })
  }

  if (successful.length > 0) {
    console.log('\n✅ SUCCESSFUL TRANSFERS:')
    successful.forEach((result) => {
      console.log(`   ${result.address}: ${result.txHash}`)
    })
  }

  // Final balance check
  const finalBalance = await ethers.provider.getBalance(signerAddress)
  console.log(`\n💰 Final sender balance: ${formatEther(finalBalance)} ETH`)

  console.log('\n🎉 Bulk transfer completed!')
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
bulkSendEth().catch((error) => {
  console.error('💥 Script failed:', error)
  process.exitCode = 1
})
