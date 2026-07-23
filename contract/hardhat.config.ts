import { configVariable, defineConfig } from 'hardhat/config'
import hardhatToolboxMochaEthers from '@nomicfoundation/hardhat-toolbox-mocha-ethers'
import openzeppelinUpgrades from '@openzeppelin/hardhat-upgrades'

const localNetwork = {
  type: 'edr-simulated' as const,
  chainId: 31337,
  blockGasLimit: 30_000_000,
  allowUnlimitedContractSize: true
}

export default defineConfig({
  plugins: [hardhatToolboxMochaEthers, openzeppelinUpgrades],

  networks: {
    default: localNetwork,
    // Keep the explicit name available for existing `--network hardhat` usage.
    hardhat: localNetwork,
    localhost: {
      type: 'http',
      chainId: 31337,
      url: 'http://localhost:8545'
    },
    polygon: {
      type: 'http',
      chainId: 137,
      url: configVariable('POLYGON_URL'),
      accounts: [configVariable('PRIVATE_KEY')],
      gasPrice: 'auto'
    }
  },

  solidity: {
    version: '0.8.24',
    settings: {
      optimizer: {
        enabled: true,
        runs: 200
      }
    }
  },

  verify: {
    etherscan: {
      apiKey: configVariable('POLYGONSCAN_API_KEY')
    },
    sourcify: {
      enabled: true
    }
  },

  typechain: {
    outDir: './typechain-types'
  },

  test: {
    solidity: {
      fuzz: {
        runs: 4
      },
      invariant: {
        runs: 4,
        depth: 4,
        failOnRevert: true
      }
    }
  }
})
