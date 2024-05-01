import { HardhatUserConfig } from 'hardhat/config'
import '@nomicfoundation/hardhat-toolbox'
import '@nomicfoundation/hardhat-chai-matchers'
import '@openzeppelin/hardhat-upgrades'
import dotenv from 'dotenv'
import { NetworksUserConfig } from 'hardhat/types'

import { vars } from "hardhat/config";

const ETHERSCAN_API_KEY = vars.get("ETHERSCAN_API_KEY");

dotenv.config()
let networks: NetworksUserConfig = {
  hardhat: {}
}
if (process.env.SEPOLIA_URL === undefined || process.env.PRIVATE_KEY === undefined) {
  console.error('\x1b[33m Please set your SEPOLIA_URL and PRIVATE_KEY in a .env file\x1b[0m')
} else {
  networks = {
    sepolia: {
      url: process.env.SEPOLIA_URL!,
      accounts: [process.env.PRIVATE_KEY]
    }
  }
}

const config: HardhatUserConfig = {
  solidity: '0.8.24',
  defaultNetwork: 'hardhat',
  networks: networks,
  etherscan: {
    apiKey: ETHERSCAN_API_KEY
  }
}

export default config
