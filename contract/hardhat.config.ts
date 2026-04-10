import { HardhatUserConfig } from 'hardhat/config'
import '@nomicfoundation/hardhat-toolbox'
import '@nomicfoundation/hardhat-chai-matchers'
import '@openzeppelin/hardhat-upgrades'
import 'hardhat-abi-exporter'
import dotenv from 'dotenv'
import { NetworksUserConfig } from 'hardhat/types'

dotenv.config()
let networks: NetworksUserConfig = {
  // hardhat: { chainId: 31337 },
  // NOTE: `gas` (per-transaction default limit) is intentionally omitted here.
  // Hardhat's EDR provider caps per-tx gas at 16_777_216 (2^24), so setting
  // `gas: 30_000_000` caused every `npx hardhat test` run to fail at deploy
  // time with "Transaction gas limit exceeds transaction gas cap". The
  // `blockGasLimit` is a separate, block-level cap and can stay at 30M.
  hardhat: {
    chainId: 31337,
    blockGasLimit: 30_000_000,
    allowUnlimitedContractSize: true
  },
  localhost: {
    chainId: 31337,
    url: 'http://localhost:8545',
    blockGasLimit: 30_000_000,
    allowUnlimitedContractSize: true
  }
}
if (process.env.SEPOLIA_URL === undefined || process.env.PRIVATE_KEY === undefined) {
  console.error('\x1b[33m Please set your SEPOLIA_URL and PRIVATE_KEY in a .env file\x1b[0m')
} else {
  networks = {
    // sepolia: {
    //   url: process.env.SEPOLIA_URL,
    //   accounts: [process.env.PRIVATE_KEY],
    //   chainId: 11155111
    // },
    // mainnet: {
    //   url: process.env.MAINNET_URL,
    //   accounts: [process.env.MAINNET_KEY!],
    //   gasPrice: 1000000000
    // }
    polygon: {
      url: process.env.POLYGON_URL,
      accounts: [process.env.PRIVATE_KEY!],
      gasPrice: 'auto',
      chainId: 137
    }
    // amoy: {
    //   url: process.env.AMOY_URL,
    //   accounts: [process.env.PRIVATE_KEY!],
    //   chainId: 80002
    // }
  }
}

const config: HardhatUserConfig = {
  solidity: {
    version: '0.8.24',
    settings: {
      // modelChecker: {
      //   engine: 'chc',
      //   solvers: ['z3'],
      //   timeout: 10000,
      //   targets: ['assert', 'overflow', 'divByZero', 'outOfBounds', 'balance'],
      //   contracts: {
      //     'contracts/Bank.sol': ['Bank'],
      //     'contracts/Officer.sol': ['Officer'],
      //     'contracts/Vesting.sol': ['Vesting'],
      //     'contracts/Tips.sol': ['Tips'],
      //     'contracts/FeeCollector.sol': ['FeeCollector'],
      //     'contracts/BoardOfDirectors.sol': ['BoardOfDirectors'],
      //     'contracts/CashRemunerationEIP712.sol': ['CashRemunerationEIP712'],
      //     'contracts/AdCampaignManager.sol': ['AdCampaignManager'],
      //     'contracts/SafeDepositRouter.sol': ['SafeDepositRouter']
      //   }
      // },
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
    token: 'POL'
  },
  abiExporter: [
    {
      path: '../app/src/artifacts/abi/json',
      runOnCompile: true,
      clear: true,
      flat: true,
      spacing: 2,
      format: 'json',
      except: [
        ':I[A-Z].*' // Exclude interfaces like IERC20, IOfficer
      ]
    },
    {
      path: '../dashboard/app/artifacts/abi/json',
      runOnCompile: true,
      clear: true,
      flat: true,
      spacing: 2,
      format: 'json',
      except: [
        ':I[A-Z].*' // Exclude interfaces like IERC20, IOfficer
      ]
    },
    {
      path: '../ponder/abis/json',
      runOnCompile: true,
      clear: true,
      flat: true,
      spacing: 2,
      format: 'json',
      except: [
        ':I[A-Z].*' // Exclude interfaces like IERC20, IOfficer
      ]
    }
  ]
}

export default config
