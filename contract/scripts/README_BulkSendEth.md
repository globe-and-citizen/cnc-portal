# Bulk ETH Transfer Script

This script allows you to send ETH to multiple addresses at once.

## Configuration

### 1. Set up recipients file

The recipients are now loaded from a JSON file that is not version controlled for security.

1. Copy the example file:

   ```bash
   cp recipients.json.example recipients.json
   ```

2. Edit `recipients.json` to add your recipient addresses:

   ```json
   {
     "recipients": [
       "0xYourAddress1Here",
       "0xYourAddress2Here",
       "0xYourAddress3Here"
     ],
     "customAmounts": {
       "0xSpecialAddress": "2.0"
     }
   }
   ```

### 2. Configure transfer settings

Edit `bulkTransferConfig.ts` to adjust:

- **amountPerRecipient**: Default amount of ETH to send to each address
- **delayBetweenTx**: Delay between transactions (milliseconds)
- **gasLimit**: Optional gas limit override

## Usage

### 1. Install dependencies (if not already done)

```bash
npm install
```

### 2. Set up environment variables

Create a `.env` file with your private key and network URLs:

```
PRIVATE_KEY=your_private_key_here
SEPOLIA_URL=https://sepolia.infura.io/v3/your_infura_key
POLYGON_URL=https://polygon-rpc.com
AMOY_URL=https://rpc-amoy.polygon.technology
```

### 3. Set up recipients

Copy and customize the recipients file:

```bash
cp recipients.json.example recipients.json
# Edit recipients.json with your addresses
```

### 4. Run the script

#### On localhost/hardhat network

```bash
npx hardhat run scripts/bulkSendEth.ts --network localhost
```

#### On Sepolia testnet

```bash
npx hardhat run scripts/bulkSendEth.ts --network sepolia
```

#### On Polygon mainnet

```bash
npx hardhat run scripts/bulkSendEth.ts --network polygon
```

#### On Amoy testnet

```bash
npx hardhat run scripts/bulkSendEth.ts --network amoy
```

## Features

- ✅ Validates addresses before sending
- ✅ Checks sender balance before starting
- ✅ Shows progress for each transaction
- ✅ Handles errors gracefully
- ✅ Provides detailed summary report
- ✅ Adds delays between transactions to avoid nonce issues
- ✅ Shows gas usage and balance changes

## Safety Features

- The script will abort if you don't have enough ETH
- Invalid addresses are skipped with error messages
- Each transaction is confirmed before proceeding to the next
- Comprehensive error handling and reporting

## Example Output

```
🚀 Starting bulk ETH transfer...
📝 Sender address: 0x1234...5678
💰 Sender balance: 10.5 ETH
📊 Total amount needed: 3.0 ETH
📋 Sending 1.0 ETH to 3 addresses...

🔄 [1/3] Sending to 0x1111...2222...
📝 Transaction hash: 0xabcd...efgh
⏳ Waiting for confirmation...
✅ Success! Gas used: 21000
💰 Recipient balance: 0.0 ETH → 1.0 ETH

...

📋 TRANSFER SUMMARY
==================
✅ Successful transfers: 3
❌ Failed transfers: 0
💰 Total ETH sent: 3.0 ETH

🎉 Bulk transfer completed!
```
