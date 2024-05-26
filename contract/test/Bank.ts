import { ethers, upgrades } from 'hardhat'
import { expect } from 'chai'
import { Bank, Tips } from '../typechain-types'
import { SignerWithAddress } from '@nomicfoundation/hardhat-ethers/signers'

describe('Bank', () => {
  let bank: Bank
  let tips: Tips
  let owner: SignerWithAddress, other: SignerWithAddress
  beforeEach(async () => {
    ;[owner, other] = await ethers.getSigners()

    const Tips = await ethers.getContractFactory('Tips')
    tips = (await upgrades.deployProxy(Tips, [], {
      initializer: 'initialize'
    })) as unknown as Tips

    bank = await ethers.deployContract('Bank', [await tips.getAddress()])

    expect(await bank.getAddress()).to.be.string
    expect(await tips.getAddress()).to.be.string
    expect(await bank.tipsAddress()).to.eq(await tips.getAddress())
  })

  it('should be owned by the owner', async () => {
    expect(await bank.owner()).to.eq(await owner.getAddress())
  })

  describe('changeTipsAddress', () => {
    it('should be able to change the tips address', async () => {
      const address = ethers.Wallet.createRandom().address
      await bank.connect(owner).changeTipsAddress(address)
      expect(await bank.tipsAddress()).to.eq(address)
    })

    it('should not be able to change the tips address if not the owner', async () => {
      const address = ethers.Wallet.createRandom().address
      await expect(bank.connect(other).changeTipsAddress(address)).to.be.reverted
    })

    it('should emit an event when the tips address is changed', async () => {
      const oldTipsAddress = await bank.tipsAddress()
      const address = ethers.Wallet.createRandom().address
      await expect(bank.connect(owner).changeTipsAddress(address))
        .to.emit(bank, 'TipsAddressChanged')
        .withArgs(oldTipsAddress, address)
    })

    it('should not be able to change the tips address if the new address is zero', async () => {
      await expect(bank.connect(owner).changeTipsAddress(ethers.ZeroAddress)).to.be.reverted
    })
  })
})
