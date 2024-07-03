import { buildModule } from '@nomicfoundation/hardhat-ignition/modules'

export default buildModule('Voting', (m) => {
  const voting = m.contract('Voting')

  return { voting }
})
