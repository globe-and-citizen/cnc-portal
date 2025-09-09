// Configuration file for bulk ETH transfer
// Recipients are loaded from recipients.json (not versioned)
// Copy recipients.json.example to recipients.json and customize as needed

import { readFileSync, existsSync } from 'fs'
import { join } from 'path'

// Interface for recipients data structure
interface RecipientsData {
  recipients: string[]
  customAmounts?: Record<string, string>
}

// Function to load recipients from JSON file
function loadRecipients(): RecipientsData {
  const recipientsPath = join(__dirname, 'recipients.json')

  if (!existsSync(recipientsPath)) {
    console.error('❌ Recipients file not found!')
    console.error('📝 Please copy recipients.json.example to recipients.json and customize it.')
    console.error(`Expected path: ${recipientsPath}`)
    process.exit(1)
  }

  try {
    const fileContent = readFileSync(recipientsPath, 'utf8')
    const data: RecipientsData = JSON.parse(fileContent)

    // Validate data structure
    if (!data.recipients || !Array.isArray(data.recipients)) {
      throw new Error('Invalid recipients.json: "recipients" must be an array')
    }

    if (data.recipients.length === 0) {
      throw new Error('Invalid recipients.json: "recipients" array cannot be empty')
    }

    console.log(`✅ Loaded ${data.recipients.length} recipient(s) from recipients.json`)
    if (data.customAmounts && Object.keys(data.customAmounts).length > 0) {
      const customCount = Object.keys(data.customAmounts).filter(
        (key) => !key.startsWith('_')
      ).length
      if (customCount > 0) {
        console.log(`📝 Found ${customCount} custom amount(s)`)
      }
    }

    return data
  } catch (error) {
    console.error('❌ Error loading recipients.json:', error)
    process.exit(1)
  }
}

// Load recipients data
const recipientsData = loadRecipients()

export const BULK_TRANSFER_CONFIG = {
  // Amount to send to each address (in ETH)
  amountPerRecipient: '10.0',

  // Recipients loaded from recipients.json
  recipients: recipientsData.recipients,

  // Custom amounts loaded from recipients.json
  customAmounts: recipientsData.customAmounts || ({} as Record<string, string>),

  // Delay between transactions (in milliseconds)
  delayBetweenTx: 1000,

  // Gas limit for each transaction (optional, will use estimate if not provided)
  gasLimit: undefined // or specify like 21000
}
