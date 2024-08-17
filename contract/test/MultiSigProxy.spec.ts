import { ethers } from 'hardhat'
import { expect } from 'chai'

describe('MultiSigProxy', async () => {
  async function deployFixture() {
    const [founder, boD1, boD2, boD3, mockTipsAddress] = await ethers.getSigners()
    const VotingFactory = await ethers.getContractFactory('Voting')
    const voting = await VotingFactory.connect(founder).deploy()
    await voting.initialize()

    const MultiSigProxyImplFactory = await ethers.getContractFactory('MultiSigProxy')
    const multiSigProxyImpl = await MultiSigProxyImplFactory.deploy()

    const MultiSigBeacon = await ethers.getContractFactory('Beacon')
    const multiSigBeacon = await MultiSigBeacon.connect(founder).deploy(
      await multiSigProxyImpl.getAddress()
    )

    const encodedInitialize = multiSigProxyImpl.interface.encodeFunctionData('initialize', [
      await voting.getAddress()
    ])

    const MultiSigProxyFactory = await ethers.getContractFactory('UserBeaconProxy')
    const multiSigProxyDeployment = await MultiSigProxyFactory.connect(founder).deploy(
      await multiSigBeacon.getAddress(),
      encodedInitialize
    )
    const multiSigProxy = await ethers.getContractAt(
      'MultiSigProxy',
      await multiSigProxyDeployment.getAddress()
    )
    // set multiSigProxy address in voting contract
    await voting.setMultiSigProxyAddress(await multiSigProxy.getAddress())

    const BankFactory = await ethers.getContractFactory('Bank')
    const bank = await BankFactory.connect(founder).deploy()
    await bank.initialize(mockTipsAddress)

    // transfer ownership of bank to multiSigProxy
    // so that only multiSigProxy can call bank functions
    await bank.transferOwnership(await multiSigProxy.getAddress())

    // deposit to the bank
    await founder.sendTransaction({
      to: await bank.getAddress(),
      value: ethers.parseEther('10')
    })

    return {
      founder,
      boD1,
      boD2,
      boD3,
      voting,
      multiSigProxy,
      bank
    }
  }

  async function setBoardOfDirectors() {
    const { founder, boD1, boD2, boD3, voting, multiSigProxy, bank } = await deployFixture()
    await voting.connect(founder).setBoardOfDirectors([boD1.address, boD2.address, boD3.address])

    return {
      founder,
      boD1,
      boD2,
      boD3,
      voting,
      multiSigProxy,
      bank
    }
  }

  async function addAction() {
    const { boD1, boD2, boD3, multiSigProxy, bank, founder } = await setBoardOfDirectors()

    // add action to transfer 5 ETH from bank contract to founder
    await multiSigProxy
      .connect(boD1)
      .addAction(
        await bank.getAddress(),
        'deposit',
        bank.interface.encodeFunctionData('transfer', [founder.address, ethers.parseEther('5')])
      )

    return {
      boD1,
      boD2,
      boD3,
      multiSigProxy,
      bank,
      founder
    }
  }

  context('initialize', () => {
    it('should set votingAddress correctly', async () => {
      const { voting, multiSigProxy } = await deployFixture()
      expect(await multiSigProxy.votingAddress()).to.eq(await voting.getAddress())
    })
  })

  context('setBoardOfDirectors', async () => {
    it('should set BoDs correctly from voting contract', async () => {
      const { founder, boD1, boD2, boD3, voting, multiSigProxy } = await deployFixture()

      // voting contract calls setBoardOfDirectors to set BoDs
      await voting.connect(founder).setBoardOfDirectors([boD1.address, boD2.address, boD3.address])

      const boardOfDirectors = await multiSigProxy.getBoardOfDirectors()
      expect(boardOfDirectors).to.have.lengthOf(3)
      expect(boardOfDirectors).to.include.members([boD1.address, boD2.address, boD3.address])
    })

    it('should emits BoardOfDirectorsChanged', async () => {
      const { founder, boD1, boD2, boD3, voting, multiSigProxy } = await deployFixture()

      // voting contract calls setBoardOfDirectors to set BoDs
      await expect(
        voting.connect(founder).setBoardOfDirectors([boD1.address, boD2.address, boD3.address])
      )
        .to.emit(multiSigProxy, 'BoardOfDirectorsChanged')
        .withArgs([boD1.address, boD2.address, boD3.address])
    })

    it('should revert if not voting contract calls setBoardOfDirectors', async () => {
      const { founder, boD1, boD2, boD3, multiSigProxy } = await deployFixture()

      await expect(
        multiSigProxy
          .connect(founder)
          .setBoardOfDirectors([boD1.address, boD2.address, boD3.address])
      ).to.be.revertedWith('Only voting contract can call this function')
    })
  })

  context('addAction', async () => {
    it('should add action correctly', async () => {
      const { boD1, multiSigProxy, bank, founder } = await setBoardOfDirectors()

      // add action to transfer 5 ETH from bank contract to founder
      await multiSigProxy
        .connect(boD1)
        .addAction(
          await bank.getAddress(),
          'deposit',
          bank.interface.encodeFunctionData('transfer', [founder.address, ethers.parseEther('5')])
        )

      const action = await multiSigProxy.actions(0)
      expect(action.target).to.eq(await bank.getAddress())
      expect(action.description).to.eq('deposit')
      expect(action.data).to.eq(
        bank.interface.encodeFunctionData('transfer', [founder.address, ethers.parseEther('5')])
      )
      expect(action.approvalCount).to.eq(1) // boD1 automatically approves the action
      expect(action.isExecuted).to.be.false
      expect(await multiSigProxy.actionCount()).to.eq(1)
    })

    it('should emits ActionAdded', async () => {
      const { boD1, multiSigProxy, bank, founder } = await setBoardOfDirectors()
      const actionData = bank.interface.encodeFunctionData('transfer', [
        founder.address,
        ethers.parseEther('5')
      ])

      // add action to transfer 5 ETH from bank contract to founder
      await expect(
        multiSigProxy.connect(boD1).addAction(await bank.getAddress(), 'deposit', actionData)
      )
        .to.emit(multiSigProxy, 'ActionAdded')
        .withArgs(0, await bank.getAddress(), 'deposit', actionData)
    })

    it('should revert if not BoD calls addAction', async () => {
      const { multiSigProxy, founder, bank } = await setBoardOfDirectors()

      await expect(
        multiSigProxy.connect(founder).addAction(await bank.getAddress(), 'deposit', '0x')
      ).to.be.revertedWith('Only board of directors can call this function')
    })

    it('should revert if target is zero address', async () => {
      const { boD1, multiSigProxy } = await setBoardOfDirectors()

      await expect(
        multiSigProxy.connect(boD1).addAction(ethers.ZeroAddress, 'deposit', '0x')
      ).to.be.revertedWith('Invalid target address')
    })
  })

  context('getActions', async () => {
    it('should paginate actions', async () => {
      const { boD1, multiSigProxy, bank, founder } = await addAction()
      const actionData = bank.interface.encodeFunctionData('transfer', [
        founder.address,
        ethers.parseEther('5')
      ])
      // add another action
      await multiSigProxy.connect(boD1).addAction(await bank.getAddress(), 'deposit', actionData)

      const actions = await multiSigProxy.getActions(0, 1) // get first action limit 1
      expect(actions).to.have.lengthOf(1)
      expect(actions[0].target).to.eq(await bank.getAddress())
      expect(actions[0].description).to.eq('deposit')
      expect(actions[0].data).to.eq(actionData)
      expect(actions[0].approvalCount).to.eq(1) // boD1 automatically approves the action
      expect(actions[0].isExecuted).to.be.false
      expect(await multiSigProxy.actionCount()).to.eq(2)
    })

    it('should return all actions if limit is greater than actionCount', async () => {
      const { multiSigProxy, bank, founder } = await addAction()
      const actionData = bank.interface.encodeFunctionData('transfer', [
        founder.address,
        ethers.parseEther('5')
      ])

      const actions = await multiSigProxy.getActions(0, 2) // get all actions
      expect(actions).to.have.lengthOf(1)
      expect(actions[0].target).to.eq(await bank.getAddress())
      expect(actions[0].description).to.eq('deposit')
      expect(actions[0].data).to.eq(actionData)
      expect(actions[0].approvalCount).to.eq(1) // boD1 automatically approves the action
      expect(actions[0].isExecuted).to.be.false
      expect(await multiSigProxy.actionCount()).to.eq(1)
    })
  })

  context('approve', async () => {
    it('should approve action correctly', async () => {
      const { boD2, multiSigProxy } = await addAction()

      // approve action
      await multiSigProxy.connect(boD2).approve(0)

      const action = await multiSigProxy.actions(0)
      expect(action.approvalCount).to.eq(2) // boD1 and boD2 approve the action
      expect(await multiSigProxy.actionApprovals(0, boD2.address)).to.be.true
      expect(await multiSigProxy.actionApprovers(0, 1)).to.eq(boD2.address)
    })

    it('should emits Approval', async () => {
      const { boD2, multiSigProxy } = await addAction()

      // approve action
      await expect(multiSigProxy.connect(boD2).approve(0))
        .to.emit(multiSigProxy, 'Approval')
        .withArgs(0, boD2.address)
    })

    it('should do an action if 50% of BoDs approved', async () => {
      const { boD2, multiSigProxy, bank, founder } = await addAction()

      const founderBalanceBefore = await ethers.provider.getBalance(founder)
      const bankBalanceBefore = await ethers.provider.getBalance(await bank.getAddress())

      // approve action by boD2 it will be executed because 50% of BoDs approved
      await multiSigProxy.connect(boD2).approve(0)

      // check if action is executed
      expect((await multiSigProxy.actions(0)).isExecuted).to.be.true
      // check if 5 ETH is transferred from bank to founder
      expect(await ethers.provider.getBalance(founder)).to.eq(
        founderBalanceBefore + ethers.parseEther('5')
      )
      expect(await ethers.provider.getBalance(await bank.getAddress())).to.eq(
        bankBalanceBefore - ethers.parseEther('5')
      )
    })

    it('should emit ActionExecuted if 50% of BoDs approved', async () => {
      const { boD2, multiSigProxy } = await addAction()
      const action = await multiSigProxy.actions(0)

      // approve action by boD2 it will be executed because 50% of BoDs approved
      await expect(multiSigProxy.connect(boD2).approve(0))
        .to.emit(multiSigProxy, 'ActionExecuted')
        .withArgs(0, action.target, action.description, action.data)
    })

    it('should revert if not BoD calls approve', async () => {
      const { founder, multiSigProxy } = await addAction()

      await expect(multiSigProxy.connect(founder).approve(0)).to.be.revertedWith(
        'Only board of directors can call this function'
      )
    })

    it('should revert if action is already executed', async () => {
      const { boD2, boD3, multiSigProxy } = await addAction()

      // approve action by boD2 it will be executed because 50% of BoDs approved
      await multiSigProxy.connect(boD2).approve(0)

      // check if action is executed
      expect((await multiSigProxy.actions(0)).isExecuted).to.be.true

      // try to approve action again
      await expect(multiSigProxy.connect(boD3).approve(0)).to.be.revertedWith(
        'Action already executed'
      )
    })

    it('should revert if BoD tries to approve action twice', async () => {
      const { boD1, multiSigProxy } = await addAction()

      // try to approve action twice
      await expect(multiSigProxy.connect(boD1).approve(0)).to.be.revertedWith('Already approved')
    })
  })

  context('isActionExecuted', async () => {
    it('should return true if action is executed', async () => {
      const { boD2, multiSigProxy } = await addAction()

      // approve action by boD2 it will be executed because 50% of BoDs approved
      await multiSigProxy.connect(boD2).approve(0)

      expect(await multiSigProxy.isActionExecuted(0)).to.be.true
    })

    it('should return false if action is not executed', async () => {
      const { multiSigProxy } = await addAction()

      expect(await multiSigProxy.isActionExecuted(0)).to.be.false
    })
  })

  context('approvalCount', async () => {
    it('should return true if action is approved by BoD', async () => {
      const { multiSigProxy } = await addAction()

      // approve action by boD1
      expect(await multiSigProxy.approvalCount(0)).to.be.eq(1)
    })
  })

  context('getAllBoardOfDirectors', async () => {
    it('should return all BoDs', async () => {
      const { boD1, boD2, boD3, multiSigProxy } = await setBoardOfDirectors()

      const boardOfDirectors = await multiSigProxy.getBoardOfDirectors()
      expect(boardOfDirectors).to.have.lengthOf(3)
      expect(boardOfDirectors).to.include.members([boD1.address, boD2.address, boD3.address])
    })
  })

  context('getActionApprovers', async () => {
    it('should return all BoDs who approved the action', async () => {
      const { boD1, multiSigProxy } = await addAction()

      const actionApprovers = await multiSigProxy.getActionApprovers(0)
      expect(actionApprovers).to.have.lengthOf(1)
      expect(actionApprovers).to.include.members([boD1.address])
    })
  })
})
