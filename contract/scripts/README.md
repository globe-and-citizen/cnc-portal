# Bulk ETH Transfer Script

This script allows you to send ETH to multiple addresses for testing purposes on local Hardhat networks.

## Setup

1. Create an `addresses.json` file in the `contract/scripts/` directory:

```json
{
  "addresses": [
    "0x8ba1f109551bD432803012645Hac136c",
    "0xab7C74abC0C4d48d1bdaD5DCB26153FC"
  ],
  "amountPerAddress": "1.0"
}
```

2. Make sure you have a local Hardhat node running:

```bash
npm run node
```

## Usage

### Using npm script (recommended):

```bash
# For localhost network
npm run bulk-eth-transfer

# For hardhat network
npm run bulk-eth-transfer:hardhat
```

### Using hardhat directly:

```bash
# For localhost network
npx hardhat run scripts/bulkEthTransfer.ts --network localhost

# For hardhat network
npx hardhat run scripts/bulkEthTransfer.ts --network hardhat
```

## Configuration

- **addresses**: Array of Ethereum addresses to send ETH to
- **amountPerAddress**: Amount of ETH to send to each address (as string)

## Security Notes

- The `addresses.json` file is automatically excluded from git to prevent accidentally committing private addresses
- Use `addresses.example.json` as a template for creating your own `addresses.json`
- This script is intended for local testing only

## Requirements

- Local Hardhat network must be running
- The account used to run the script must have sufficient ETH balance
- All addresses in the JSON file must be valid Ethereum addresses