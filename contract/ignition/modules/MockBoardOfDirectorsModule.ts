import { buildModule } from '@nomicfoundation/hardhat-ignition/modules'

export default buildModule('MockBoardOfDirectorsModule', (m) => {
  const boardMember1 = m.getAccount(0)
  const boardMember2 = m.getAccount(1)
  const boardMember3 = m.getAccount(2)

  const mockBoardOfDirectors = m.contract('MockBoardOfDirectors')

  // deploy the mock board of directors contract
  m.call(mockBoardOfDirectors, 'setBoardOfDirectors', [[boardMember1, boardMember2, boardMember3]])

  return { mockBoardOfDirectors }
})
