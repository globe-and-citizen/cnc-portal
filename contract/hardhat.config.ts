import { HardhatUserConfig } from 'hardhat/config'
import '@nomicfoundation/hardhat-toolbox'
import '@nomicfoundation/hardhat-chai-matchers'
import '@openzeppelin/hardhat-upgrades'
import dotenv from 'dotenv'
import { NetworksUserConfig } from 'hardhat/types'

dotenv.config()
let networks: NetworksUserConfig = {
  hardhat: {},
  localhost: { url: 'http://localhost:8545' }
}
if (process.env.SEPOLIA_URL === undefined || process.env.PRIVATE_KEY === undefined) {
  console.error('\x1b[33m Please set your SEPOLIA_URL and PRIVATE_KEY in a .env file\x1b[0m')
} else {
  networks = {
    sepolia: {
      url: process.env.SEPOLIA_URL,
      accounts: [process.env.PRIVATE_KEY]
    }
    // mainnet: {
    //   url: process.env.MAINNET_URL,
    //   accounts: [process.env.MAINNET_KEY!],
    //   gasPrice: 1000000000
    // },
    // polygon: {
    //   url: process.env.POLYGON_URL,
    //   accounts: [process.env.MAINNET_KEY!],
    //   gasPrice: 'auto'
    // }
  }
}

const config: HardhatUserConfig = {
  solidity: {
    version: '0.8.24',
    settings: {
      optimizer: {
        // Toggles whether the optimizer is on or off.
        // It's good to keep it off for development
        // and turn on for when getting ready to launch.
        enabled: true,
        // The number of runs specifies roughly how often
        // the deployed code will be executed across the
        // life-time of the contract.
        runs: 200
      }
    }
  },
  defaultNetwork: 'hardhat',
  networks: networks,
  etherscan: {
    apiKey: process.env.POLYGONSCAN_API_KEY
  },
  sourcify: {
    enabled: true
  },
  gasReporter: {
    enabled: true,
    currency: 'USD',
    coinmarketcap: process.env.COINMARKETCAP_KEY,
    token: 'MATIC'
  }
}

export default config
