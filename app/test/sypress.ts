import { testWithSynpress } from '@synthetixio/synpress'
import { metaMaskFixtures } from '@synthetixio/synpress'
import basicSetup from './wallet-setup/basic.setup'

export default testWithSynpress(metaMaskFixtures(basicSetup))
