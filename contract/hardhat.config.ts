import { HardhatUserConfig } from 'hardhat/config'
import '@nomicfoundation/hardhat-toolbox'
import '@nomicfoundation/hardhat-chai-matchers'
import dotenv from 'dotenv'
import { NetworksUserConfig } from 'hardhat/types'

dotenv.config()
let networks: NetworksUserConfig = {
  hardhat: {}
}
if (process.env.ALCHEMY_API_KEY === undefined || process.env.PRIVATE_KEY === undefined) {
  console.error('\x1b[33m Please set your ALCHEMY_API_KEY and PRIVATE_KEY in a .env file\x1b[0m')
} else {
  networks = {
    sepolia: {
      url: `https://eth-mainnet.alchemyapi.io/v2/${process.env.ALCHEMY_API_KEY}`,
      accounts: [process.env.PRIVATE_KEY]
    }
  }
}

const config: HardhatUserConfig = {
  solidity: '0.8.24',
  defaultNetwork: 'hardhat',
  networks: networks
}

export default config
