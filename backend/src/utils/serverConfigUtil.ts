export const errorMessages = {
  frontendUrl: `
        Required environment variable 'FRONTEND_URL' not set.
        e.g In your .env file add the line FRONTEND_URL=http://localhost:5173
    `,
  databaseUrl: `
        Required environment variable 'DATABASE_URL' not set.
        e.g In your .env file add the line DATABASE_URL=postgres://username:password@localhost:5432/database_name
    `,
  secretKey: `
        Required environment variable 'SECRET_KEY' not set.
        e.g In your .env file add the line SECRET_KEY=1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0a1b
    `,
  nodeEnv: `
        Required environment variable 'NODE_ENV' not set.
        e.g In your .env file add the line NODE_ENV=development
    `,
  chainId: `
        Required environment variable 'CHAIN_ID' not set.
        Please set the appropriate chain ID for your network:
        - Ethereum Mainnet: 1
        - Sepolia Testnet: 11155111
        - Hardhat: 31337
        - Polygon Mainnet: 137
        - Polygon Amoy: 80002
        e.g In your .env file add the line CHAIN_ID=1
    `,
};
