import { HardhatUserConfig } from 'hardhat/config'
import '@nomicfoundation/hardhat-toolbox'
import '@nomicfoundation/hardhat-chai-matchers'
import  dotenv from 'dotenv'

dotenv.config()
if(process.env.ALCHEMY_API_KEY === undefined || process.env.PRIVATE_KEY === undefined) {
  console.error('\x1b[33m Please set your ALCHEMY_API_KEY and PRIVATE_KEY in a .env file\x1b[0m')
}
const config: HardhatUserConfig = {
  solidity: '0.8.24',
  defaultNetwork: 'hardhat',
  networks: {
    hardhat: {},
    sepolia:  {
      url: `https://eth-sepolia.g.alchemy.com/v2/${process.env.ALCHEMY_API_KEY? process.env.ALCHEMY_API_KEY : ""}`,
      accounts: [process.env.PRIVATE_KEY  ? process.env.PRIVATE_KEY : ""]
    }
  }
}

export default config
