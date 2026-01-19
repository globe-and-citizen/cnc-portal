#!/bin/bash

# Bulk ETH Transfer Script Runner
# This script provides easy commands to run the bulk ETH transfer

echo "🚀 Bulk ETH Transfer Script"
echo "=========================="
echo
echo "Available networks:"
echo "1. localhost (Hardhat local network)"
echo "2. sepolia (Sepolia testnet)" 
echo "3. amoy (Polygon Amoy testnet)"
echo "4. polygon (Polygon mainnet)"
echo

# Check if .env file exists
if [ ! -f .env ]; then
    echo "⚠️  Warning: .env file not found!"
    echo "Please create a .env file with:"
    echo "PRIVATE_KEY=your_private_key_here"
    echo "SEPOLIA_URL=https://sepolia.infura.io/v3/your_infura_key"
    echo "POLYGON_URL=https://polygon-rpc.com"
    echo "AMOY_URL=https://rpc-amoy.polygon.technology"
    echo
fi

# Get network choice
read -p "Enter network choice (1-4): " choice

case $choice in
    1)
        echo "🔗 Running on localhost/hardhat network..."
        npx hardhat run ./bulkSendEth.ts --network localhost
        ;;
    2)
        echo "🔗 Running on Sepolia testnet..."
        npx hardhat run ./bulkSendEth.ts --network sepolia
        ;;
    3)
        echo "🔗 Running on Amoy testnet..."
        npx hardhat run ./bulkSendEth.ts --network amoy
        ;;
    4)
        echo "🔗 Running on Polygon mainnet..."
        echo "⚠️  WARNING: This will use real ETH on mainnet!"
        read -p "Are you sure? (y/N): " confirm
        if [[ $confirm == [yY] || $confirm == [yY][eE][sS] ]]; then
            npx hardhat run scripts/bulkSendEth.ts --network polygon
        else
            echo "❌ Cancelled"
        fi
        ;;
    *)
        echo "❌ Invalid choice"
        exit 1
        ;;
esac
