import { buildModule } from '@nomicfoundation/hardhat-ignition/modules'

export default buildModule('CashRemunerationEIP712Module', (m) => {
  const beaconOwner = m.getAccount(0)

  const cashRemunerationEip712 = m.contract('CashRemunerationEIP712')

  const cashRemunerationEip712FactoryBeacon = m.contract(
    'FactoryBeacon', 
    [cashRemunerationEip712],
    {from: beaconOwner}
  )

  return { cashRemunerationEip712, cashRemunerationEip712FactoryBeacon }
})