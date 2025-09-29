import { buildModule } from '@nomicfoundation/hardhat-ignition/modules'

const DividendSplitterBeaconModule = buildModule('DividendSplitterBeaconModule', (m) => {
  const beaconAdmin = m.getAccount(0)
  const DividendSplitterImplementation = m.contract('DividendSplitter')

  const beacon = m.contract('Beacon', [DividendSplitterImplementation], {
    from: beaconAdmin
  })

  return { beacon, DividendSplitterImplementation }
})

export default DividendSplitterBeaconModule
