import { defineWalletSetup } from '@synthetixio/synpress'
import { MetaMask } from '@synthetixio/synpress/playwright'

const SEED_PHRASE = 'test test test test test test test test test test test junk'
const PASSWORD = 'Password123'

export default defineWalletSetup(PASSWORD, async (context, walletPage) => {
  const metamask = new MetaMask(context, walletPage, PASSWORD)

  await metamask.importWallet(SEED_PHRASE)
  await metamask.addNetwork({
    chainId: 31337,
    name: 'hardhat',
    rpcUrl: 'http://localhost:8545',
    symbol: 'GO'
  })
  await metamask.switchNetwork('hardhat', true)
})
