import { ethers, upgrades } from 'hardhat'
import { expect } from 'chai'
import { Tips } from '../typechain-types/contracts'

describe('Tips Proxy', function () {
  describe('Proxy interaction', async function () {
    it('Should be interactable via proxy', async function () {
      const [owner, otherAccount] = await ethers.getSigners()
      console.log('owner.address()', owner.address)

      const Tips = await ethers.getContractFactory('Tips')
      const tips = await upgrades.deployProxy(Tips, [], {
        initializer: 'initialize'
      }) as unknown as Tips

      expect(await tips.connect(otherAccount).owner()).to.equal(
        '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266'
      )
    })
  })
})
