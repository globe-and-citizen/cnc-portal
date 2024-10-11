import { expect } from 'chai'
import { ignition, ethers } from 'hardhat'
import { SignerWithAddress } from '@nomicfoundation/hardhat-ethers/signers'
import { ExpenseAccount, FactoryBeacon } from '../typechain-types'

import ExpenseAccountModule from '../ignition/modules/ExpenseAccountModule'

describe('ExpenseAccountModule', () => {
  describe('Deployment', async () => {
    let _expenseAccount: ExpenseAccount
    let _expenseAccountFactoryBeacon: FactoryBeacon
    let deployer: SignerWithAddress
    let founder: SignerWithAddress

    before(async () => {
      const [signer, signer2] = await ethers.getSigners()
      deployer = signer
      founder = signer2
    })

    it('Should deploy expense account `FactoryBeacon` with `ExpenseAccount` logic contract as a dependancy', async () => {
      const { expenseAccount, expenseAccountFactoryBeacon } =
        await ignition.deploy(ExpenseAccountModule)
      _expenseAccount = expenseAccount as unknown as ExpenseAccount
      _expenseAccountFactoryBeacon = expenseAccountFactoryBeacon as unknown as FactoryBeacon
      expect(await _expenseAccountFactoryBeacon.implementation()).to.equal(
        await _expenseAccount.getAddress()
      )
    })

    it('Should have the deployer as the owner of the expense account `FactoryBeacon` contract', async () => {
      expect(await _expenseAccountFactoryBeacon.owner()).to.equal(deployer.address)
    })

    it('Should deploy an expense account `BeaconProxy` contract by a function call to expense account `FactoryBeacon` contract', async () => {
      const tx = await _expenseAccountFactoryBeacon
        .connect(founder)
        .createBeaconProxy(
          _expenseAccount.interface.encodeFunctionData('initialize', [founder.address])
        )

      const receipt = await tx.wait()

      if (receipt) {
        let proxyAddress = ''
        for (const log of receipt.logs) {
          if ('fragment' in log && log.fragment.name === 'BeaconProxyCreated') {
            proxyAddress = log.args[0]
          }
        }

        await expect(tx)
          .to.emit(_expenseAccountFactoryBeacon, 'BeaconProxyCreated')
          .withArgs(proxyAddress, founder.address)
      }
    })
  })
})
