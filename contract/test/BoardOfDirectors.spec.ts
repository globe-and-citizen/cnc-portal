import { ethers } from 'hardhat'
import { expect } from 'chai'

describe('BoardOfDirectors', async () => {
  async function deployFixture() {
    const [founder, boD1, boD2, boD3, mockTipsAddress] = await ethers.getSigners()
    const VotingFactory = await ethers.getContractFactory('Voting')
    const voting = await VotingFactory.connect(founder).deploy()
    await voting.initialize()

    const BoardOfDirectorsImplFactory = await ethers.getContractFactory('BoardOfDirectors')
    const boardOfDirectorsImpl = await BoardOfDirectorsImplFactory.deploy()

    const BoardOfDirectorsBeacon = await ethers.getContractFactory('Beacon')
    const boardOfDirectorsBeacon = await BoardOfDirectorsBeacon.connect(founder).deploy(
      await boardOfDirectorsImpl.getAddress()
    )

    const ProxyFactory = await ethers.getContractFactory('UserBeaconProxy')
    const initialize = boardOfDirectorsImpl.interface.encodeFunctionData('initialize', [
      [founder.address, await voting.getAddress()]
    ])
    const boardOfDirectorsProxyDeployment = await ProxyFactory.connect(founder).deploy(
      await boardOfDirectorsBeacon.getAddress(),
      initialize
    )
    const boardOfDirectorsProxy = await ethers.getContractAt(
      'BoardOfDirectors',
      await boardOfDirectorsProxyDeployment.getAddress()
    )
    // set boardOfDirectors address in voting contract
    await voting.setBoardOfDirectorsContractAddress(await boardOfDirectorsProxy.getAddress())

    const BankFactory = await ethers.getContractFactory('Bank')
    const bank = await BankFactory.connect(founder).deploy()
    await bank.initialize(mockTipsAddress)

    // transfer ownership of bank to boardOfDirectors
    // so that only boardOfDirectors can call bank functions
    await bank.transferOwnership(await boardOfDirectorsProxy.getAddress())

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
      boardOfDirectorsProxy,
      bank
    }
  }

  async function setBoardOfDirectorsFixture() {
    const { founder, boD1, boD2, boD3, voting, boardOfDirectorsProxy, bank } = await deployFixture()
    await voting.connect(founder).setBoardOfDirectors([boD1.address, boD2.address, boD3.address])

    return {
      founder,
      boD1,
      boD2,
      boD3,
      voting,
      boardOfDirectorsProxy,
      bank
    }
  }

  async function addActionFixture() {
    const { boD1, boD2, boD3, boardOfDirectorsProxy, bank, founder } =
      await setBoardOfDirectorsFixture()

    // add action to transfer 5 ETH from bank contract to founder
    await boardOfDirectorsProxy
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
      boardOfDirectorsProxy,
      bank,
      founder
    }
  }

  async function setOwnersFixture(
    options: { includeZeroAddress?: boolean; emptyOwners?: boolean } = {}
  ) {
    const { founder, voting, boD1, boD2, boD3, boardOfDirectorsProxy } =
      await setBoardOfDirectorsFixture()

    let owners = [boD1.address, founder.address, await voting.getAddress()]
    if (options.includeZeroAddress) {
      owners.push(ethers.ZeroAddress)
    }
    if (options.emptyOwners) {
      owners = []
    }
    await boardOfDirectorsProxy
      .connect(boD1)
      .addAction(
        await boardOfDirectorsProxy.getAddress(),
        'setOwners',
        boardOfDirectorsProxy.interface.encodeFunctionData('setOwners', [owners])
      )

    return {
      founder,
      boD1,
      boD2,
      boD3,
      voting,
      boardOfDirectorsProxy
    }
  }

  async function addOwnerFixture(
    options: { includeZeroAddress?: boolean; ownerAlreadyExists?: boolean } = {}
  ) {
    const { founder, boD1, boardOfDirectorsProxy, boD2 } = await setBoardOfDirectorsFixture()
    let newOwnerAddress
    if (options.ownerAlreadyExists) {
      newOwnerAddress = founder.address
    }
    if (options.includeZeroAddress) {
      newOwnerAddress = ethers.ZeroAddress
    }
    if (!newOwnerAddress) {
      newOwnerAddress = (await ethers.getSigners())[6].address
    }
    // add owner by action
    await boardOfDirectorsProxy
      .connect(boD1)
      .addAction(
        await boardOfDirectorsProxy.getAddress(),
        'addOwner',
        boardOfDirectorsProxy.interface.encodeFunctionData('addOwner', [newOwnerAddress])
      )

    return {
      founder,
      boD1,
      boD2,
      boardOfDirectorsProxy
    }
  }

  async function removeOwnerFixture(options: { removeNotOwner?: boolean } = {}) {
    const { boD1, boD2, founder, boardOfDirectorsProxy } = await setOwnersFixture()

    let ownerToRemove = founder.address
    if (options.removeNotOwner) {
      ownerToRemove = (await ethers.getSigners())[6].address
    }

    // remove owner by action
    await boardOfDirectorsProxy
      .connect(boD1)
      .addAction(
        await boardOfDirectorsProxy.getAddress(),
        'removeOwner',
        boardOfDirectorsProxy.interface.encodeFunctionData('removeOwner', [ownerToRemove])
      )

    return {
      boD1,
      boD2,
      founder,
      boardOfDirectorsProxy
    }
  }

  context('initialize', () => {
    it('should set owners correctly', async () => {
      const { voting, founder, boardOfDirectorsProxy } = await deployFixture()

      expect(await boardOfDirectorsProxy.getOwners()).to.include.members([
        await voting.getAddress(),
        founder.address
      ])
    })

    it('should revert if owners include zero address', async () => {
      const [founder] = await ethers.getSigners()
      const BoardOfDirectorsImplFactory = await ethers.getContractFactory('BoardOfDirectors')
      const boardOfDirectorsImpl = await BoardOfDirectorsImplFactory.deploy()

      const BoardOfDirectorsBeacon = await ethers.getContractFactory('Beacon')
      const boardOfDirectorsBeacon = await BoardOfDirectorsBeacon.deploy(
        await boardOfDirectorsImpl.getAddress()
      )

      const ProxyFactory = await ethers.getContractFactory('UserBeaconProxy')
      const initialize = boardOfDirectorsImpl.interface.encodeFunctionData('initialize', [
        [founder.address, ethers.ZeroAddress]
      ])

      await expect(
        ProxyFactory.deploy(await boardOfDirectorsBeacon.getAddress(), initialize)
      ).to.be.revertedWith('Invalid owner address')
    })
  })

  context('setBoardOfDirectors', async () => {
    it('should set BoDs correctly from voting contract', async () => {
      const { founder, boD1, boD2, boD3, voting, boardOfDirectorsProxy } = await deployFixture()

      // voting contract calls setBoardOfDirectors to set BoDs
      await voting.connect(founder).setBoardOfDirectors([boD1.address, boD2.address, boD3.address])

      const boardOfDirectors = await boardOfDirectorsProxy.getBoardOfDirectors()
      expect(boardOfDirectors).to.have.lengthOf(3)
      expect(boardOfDirectors).to.include.members([boD1.address, boD2.address, boD3.address])
    })

    it('should emits BoardOfDirectorsChanged', async () => {
      const { founder, boD1, boD2, boD3, voting, boardOfDirectorsProxy } = await deployFixture()

      // voting contract calls setBoardOfDirectors to set BoDs
      await expect(
        voting.connect(founder).setBoardOfDirectors([boD1.address, boD2.address, boD3.address])
      )
        .to.emit(boardOfDirectorsProxy, 'BoardOfDirectorsChanged')
        .withArgs([boD1.address, boD2.address, boD3.address])
    })

    it('should revert if not owner calls setBoardOfDirectors', async () => {
      const { boD1, boD2, boD3, boardOfDirectorsProxy } = await deployFixture()

      await expect(
        boardOfDirectorsProxy
          .connect(boD1)
          .setBoardOfDirectors([boD1.address, boD2.address, boD3.address])
      ).to.be.revertedWith('Only owner can call this function')
    })
  })

  context('addAction', async () => {
    it('should add action correctly', async () => {
      const { boD1, boardOfDirectorsProxy, bank, founder } = await setBoardOfDirectorsFixture()

      // add action to transfer 5 ETH from bank contract to founder
      await boardOfDirectorsProxy
        .connect(boD1)
        .addAction(
          await bank.getAddress(),
          'deposit',
          bank.interface.encodeFunctionData('transfer', [founder.address, ethers.parseEther('5')])
        )

      const action = await boardOfDirectorsProxy.actions(0)
      expect(action.target).to.eq(await bank.getAddress())
      expect(action.description).to.eq('deposit')
      expect(action.data).to.eq(
        bank.interface.encodeFunctionData('transfer', [founder.address, ethers.parseEther('5')])
      )
      expect(action.approvalCount).to.eq(1) // boD1 automatically approves the action
      expect(action.isExecuted).to.be.false
      expect(await boardOfDirectorsProxy.actionCount()).to.eq(1)
    })

    it('should emits ActionAdded', async () => {
      const { boD1, boardOfDirectorsProxy, bank, founder } = await setBoardOfDirectorsFixture()
      const actionData = bank.interface.encodeFunctionData('transfer', [
        founder.address,
        ethers.parseEther('5')
      ])

      // add action to transfer 5 ETH from bank contract to founder
      await expect(
        boardOfDirectorsProxy
          .connect(boD1)
          .addAction(await bank.getAddress(), 'deposit', actionData)
      )
        .to.emit(boardOfDirectorsProxy, 'ActionAdded')
        .withArgs(0, await bank.getAddress(), 'deposit', actionData)
    })

    it('should revert if not BoD calls addAction', async () => {
      const { boardOfDirectorsProxy, founder, bank } = await setBoardOfDirectorsFixture()

      await expect(
        boardOfDirectorsProxy.connect(founder).addAction(await bank.getAddress(), 'deposit', '0x')
      ).to.be.revertedWith('Only board of directors can call this function')
    })

    it('should revert if target is zero address', async () => {
      const { boD1, boardOfDirectorsProxy } = await setBoardOfDirectorsFixture()

      await expect(
        boardOfDirectorsProxy.connect(boD1).addAction(ethers.ZeroAddress, 'deposit', '0x')
      ).to.be.revertedWith('Invalid target address')
    })
  })

  context('getPendingActions', async () => {
    it('should paginate actions', async () => {
      const { boD1, boardOfDirectorsProxy, bank, founder } = await addActionFixture()
      const actionData = bank.interface.encodeFunctionData('transfer', [
        founder.address,
        ethers.parseEther('5')
      ])
      // add another action
      await boardOfDirectorsProxy
        .connect(boD1)
        .addAction(await bank.getAddress(), 'deposit', actionData)

      const actions = await boardOfDirectorsProxy.getPendingActions(0, 1) // get first action limit 1
      expect(actions).to.have.lengthOf(1)
      expect(actions[0].target).to.eq(await bank.getAddress())
      expect(actions[0].description).to.eq('deposit')
      expect(actions[0].data).to.eq(actionData)
      expect(actions[0].approvalCount).to.eq(1) // boD1 automatically approves the action
      expect(actions[0].isExecuted).to.be.false
      expect(await boardOfDirectorsProxy.actionCount()).to.eq(2)
    })

    it('should return all pending actions if limit is greater than pendingActionCount', async () => {
      const { boardOfDirectorsProxy, bank, founder } = await addActionFixture()
      const actionData = bank.interface.encodeFunctionData('transfer', [
        founder.address,
        ethers.parseEther('5')
      ])

      const actions = await boardOfDirectorsProxy.getPendingActions(0, 2) // get all pending actions
      expect(actions).to.have.lengthOf(1)
      expect(actions[0].target).to.eq(await bank.getAddress())
      expect(actions[0].description).to.eq('deposit')
      expect(actions[0].data).to.eq(actionData)
      expect(actions[0].approvalCount).to.eq(1) // boD1 automatically approves the action
      expect(actions[0].isExecuted).to.be.false
      expect(await boardOfDirectorsProxy.pendingActionCount()).to.eq(1)
      expect(await boardOfDirectorsProxy.executedActionCount()).to.eq(0)
    })
  })

  context('getExecutedActions', async () => {
    it('should paginate executed actions', async () => {
      const { boD2, boardOfDirectorsProxy } = await addActionFixture()

      // approve action by boD2 it will be executed because 50% of BoDs approved
      await boardOfDirectorsProxy.connect(boD2).approve(0)

      const actions = await boardOfDirectorsProxy.getExecutedActions(0, 1) // get first action limit 1
      expect(actions).to.have.lengthOf(1)
      expect(actions[0].isExecuted).to.be.true
      expect(await boardOfDirectorsProxy.pendingActionCount()).to.eq(0)
      expect(await boardOfDirectorsProxy.executedActionCount()).to.eq(1)
    })

    it('should return all executed actions if limit is greater than executedActionCount', async () => {
      const { boD2, boardOfDirectorsProxy } = await addActionFixture()

      // approve action by boD2 it will be executed because 50% of BoDs approved
      await boardOfDirectorsProxy.connect(boD2).approve(0)

      const actions = await boardOfDirectorsProxy.getExecutedActions(0, 2) // get all executed actions
      expect(actions).to.have.lengthOf(1)
      expect(actions[0].isExecuted).to.be.true
    })
  })

  context('approve', async () => {
    it('should approve action correctly', async () => {
      const { boD2, boardOfDirectorsProxy } = await addActionFixture()

      // approve action
      await boardOfDirectorsProxy.connect(boD2).approve(0)

      const action = await boardOfDirectorsProxy.actions(0)
      expect(action.approvalCount).to.eq(2) // boD1 and boD2 approve the action
      expect(await boardOfDirectorsProxy.actionApprovals(0, boD2.address)).to.be.true
      expect(await boardOfDirectorsProxy.actionApprovers(0, 1)).to.eq(boD2.address)
    })

    it('should emits Approval', async () => {
      const { boD2, boardOfDirectorsProxy } = await addActionFixture()

      // approve action
      await expect(boardOfDirectorsProxy.connect(boD2).approve(0))
        .to.emit(boardOfDirectorsProxy, 'Approval')
        .withArgs(0, boD2.address)
    })

    it('should do an action if 50% of BoDs approved', async () => {
      const { boD2, boardOfDirectorsProxy, bank, founder } = await addActionFixture()

      const founderBalanceBefore = await ethers.provider.getBalance(founder)
      const bankBalanceBefore = await ethers.provider.getBalance(await bank.getAddress())

      // approve action by boD2 it will be executed because 50% of BoDs approved
      await boardOfDirectorsProxy.connect(boD2).approve(0)

      // check if action is executed
      expect((await boardOfDirectorsProxy.actions(0)).isExecuted).to.be.true
      // check if 5 ETH is transferred from bank to founder
      expect(await ethers.provider.getBalance(founder)).to.eq(
        founderBalanceBefore + ethers.parseEther('5')
      )
      expect(await ethers.provider.getBalance(await bank.getAddress())).to.eq(
        bankBalanceBefore - ethers.parseEther('5')
      )
    })

    it('should emit ActionExecuted if 50% of BoDs approved', async () => {
      const { boD2, boardOfDirectorsProxy } = await addActionFixture()
      const action = await boardOfDirectorsProxy.actions(0)

      // approve action by boD2 it will be executed because 50% of BoDs approved
      await expect(boardOfDirectorsProxy.connect(boD2).approve(0))
        .to.emit(boardOfDirectorsProxy, 'ActionExecuted')
        .withArgs(0, action.target, action.description, action.data)
    })

    it('should revert if not BoD calls approve', async () => {
      const { founder, boardOfDirectorsProxy } = await addActionFixture()

      await expect(boardOfDirectorsProxy.connect(founder).approve(0)).to.be.revertedWith(
        'Only board of directors can call this function'
      )
    })

    it('should revert if action is already executed', async () => {
      const { boD2, boD3, boardOfDirectorsProxy } = await addActionFixture()

      // approve action by boD2 it will be executed because 50% of BoDs approved
      await boardOfDirectorsProxy.connect(boD2).approve(0)

      // check if action is executed
      expect((await boardOfDirectorsProxy.actions(0)).isExecuted).to.be.true

      // try to approve action again
      await expect(boardOfDirectorsProxy.connect(boD3).approve(0)).to.be.revertedWith(
        'Action already executed'
      )
    })

    it('should revert if BoD tries to approve action twice', async () => {
      const { boD1, boardOfDirectorsProxy } = await addActionFixture()

      // try to approve action twice
      await expect(boardOfDirectorsProxy.connect(boD1).approve(0)).to.be.revertedWith(
        'Already approved'
      )
    })
  })

  context('revoke', async () => {
    it('should revoke approval correctly', async () => {
      const { boD1, boardOfDirectorsProxy } = await addActionFixture()

      // revoke approval
      await boardOfDirectorsProxy.connect(boD1).revoke(0)

      const action = await boardOfDirectorsProxy.actions(0)
      expect(action.approvalCount).to.eq(0) // boD1 revoke the action
      expect(await boardOfDirectorsProxy.actionApprovals(0, boD1.address)).to.be.false
      expect(await boardOfDirectorsProxy.actionApprovers(0, 0)).to.eq(boD1.address)
    })

    it('should emits Revocation', async () => {
      const { boD1, boardOfDirectorsProxy } = await addActionFixture()

      // revoke approval
      await expect(boardOfDirectorsProxy.connect(boD1).revoke(0))
        .to.emit(boardOfDirectorsProxy, 'Revocation')
        .withArgs(0, boD1.address)
    })

    it('should revert if not BoD calls revoke', async () => {
      const { founder, boardOfDirectorsProxy } = await addActionFixture()

      await expect(boardOfDirectorsProxy.connect(founder).revoke(0)).to.be.revertedWith(
        'Only board of directors can call this function'
      )
    })

    it('should revert if action is already executed', async () => {
      const { boD2, boardOfDirectorsProxy } = await addActionFixture()

      // approve action by boD2 and it will executed because 50% of BoDs approved
      await boardOfDirectorsProxy.connect(boD2).approve(0)

      // check if action is executed
      expect((await boardOfDirectorsProxy.actions(0)).isExecuted).to.be.true

      // try to revoke approval
      await expect(boardOfDirectorsProxy.connect(boD2).revoke(0)).to.be.revertedWith(
        'Action already executed'
      )
    })

    it('should revert if BoD tries to revoke if action not approved yet', async () => {
      const { boD2, boardOfDirectorsProxy } = await addActionFixture()

      // try to revoke approval twice
      await expect(boardOfDirectorsProxy.connect(boD2).revoke(0)).to.be.revertedWith('Not approved')
    })
  })

  context('isActionExecuted', async () => {
    it('should return true if action is executed', async () => {
      const { boD2, boardOfDirectorsProxy } = await addActionFixture()

      // approve action by boD2 it will be executed because 50% of BoDs approved
      await boardOfDirectorsProxy.connect(boD2).approve(0)

      expect(await boardOfDirectorsProxy.isActionExecuted(0)).to.be.true
    })

    it('should return false if action is not executed', async () => {
      const { boardOfDirectorsProxy } = await addActionFixture()

      expect(await boardOfDirectorsProxy.isActionExecuted(0)).to.be.false
    })
  })

  context('approvalCount', async () => {
    it('should return true if action is approved by BoD', async () => {
      const { boardOfDirectorsProxy } = await addActionFixture()

      // approve action by boD1
      expect(await boardOfDirectorsProxy.approvalCount(0)).to.be.eq(1)
    })
  })

  context('getAllBoardOfDirectors', async () => {
    it('should return all BoDs', async () => {
      const { boD1, boD2, boD3, boardOfDirectorsProxy } = await setBoardOfDirectorsFixture()

      const boardOfDirectors = await boardOfDirectorsProxy.getBoardOfDirectors()
      expect(boardOfDirectors).to.have.lengthOf(3)
      expect(boardOfDirectors).to.include.members([boD1.address, boD2.address, boD3.address])
    })
  })

  context('getActionApprovers', async () => {
    it('should return all BoDs who approved the action', async () => {
      const { boD1, boardOfDirectorsProxy } = await addActionFixture()

      const actionApprovers = await boardOfDirectorsProxy.getActionApprovers(0)
      expect(actionApprovers).to.have.lengthOf(1)
      expect(actionApprovers).to.include.members([boD1.address])
    })
  })

  context('setOwners', async () => {
    it('should set owners by action correctly', async () => {
      const { founder, voting, boD1, boD2, boardOfDirectorsProxy } = await setOwnersFixture()

      // approve to set owners
      await boardOfDirectorsProxy.connect(boD2).approve(0)

      expect(await boardOfDirectorsProxy.getOwners()).to.include.members([
        boD1.address,
        founder.address,
        await voting.getAddress()
      ])
    })

    it('should emit OwnersChanged', async () => {
      const { founder, boD1, boD2, voting, boardOfDirectorsProxy } = await setOwnersFixture()

      // approve to set owners
      await expect(boardOfDirectorsProxy.connect(boD2).approve(0))
        .to.emit(boardOfDirectorsProxy, 'OwnersChanged')
        .withArgs([boD1.address, founder.address, await voting.getAddress()])
    })

    it('should revert if owners include zero address', async () => {
      const { boD2, boardOfDirectorsProxy } = await setOwnersFixture({ includeZeroAddress: true })

      // approve to set owners
      await expect(boardOfDirectorsProxy.connect(boD2).approve(0)).to.be.revertedWith('Call failed')
    })

    it('should revert if owners is empty', async () => {
      const { boD2, boardOfDirectorsProxy } = await setOwnersFixture({ emptyOwners: true })

      // approve to set owners
      await expect(boardOfDirectorsProxy.connect(boD2).approve(0)).to.be.revertedWith('Call failed')
    })
  })

  context('addOwner', async () => {
    it('should add owner by action correctly', async () => {
      const { founder, boD2, boardOfDirectorsProxy } = await addOwnerFixture()

      // add owner by action
      await boardOfDirectorsProxy.connect(boD2).approve(0)

      expect(await boardOfDirectorsProxy.getOwners()).to.include.members([founder.address])
    })

    it('should emit OwnersChanged', async () => {
      const { boD2, boardOfDirectorsProxy } = await addOwnerFixture()
      const randomSigner = (await ethers.getSigners())[6]
      const oldOwners = await boardOfDirectorsProxy.getOwners()
      // add owner by action
      await expect(boardOfDirectorsProxy.connect(boD2).approve(0))
        .to.emit(boardOfDirectorsProxy, 'OwnersChanged')
        .withArgs(oldOwners.concat(randomSigner.address))
    })

    it('should revert if owner already exists', async () => {
      const { boD2, boardOfDirectorsProxy } = await addOwnerFixture({ ownerAlreadyExists: true })

      // try to add owner again
      await expect(boardOfDirectorsProxy.connect(boD2).approve(0)).to.be.revertedWith('Call failed')
    })

    it('should revert if owner is zero address', async () => {
      const { boD2, boardOfDirectorsProxy } = await addOwnerFixture({ includeZeroAddress: true })

      // try to add owner again
      await expect(boardOfDirectorsProxy.connect(boD2).approve(0)).to.be.revertedWith('Call failed')
    })

    it('should revert if called by other address', async () => {
      const { founder, boD1, boardOfDirectorsProxy } = await addOwnerFixture()

      await expect(boardOfDirectorsProxy.connect(founder).addOwner(boD1)).to.be.revertedWith(
        'Only self can call this function'
      )
    })
  })

  context('removeOwner', async () => {
    it('should remove owner by action correctly', async () => {
      const { founder, boD2, boardOfDirectorsProxy } = await removeOwnerFixture()

      // approve to remove owner
      await boardOfDirectorsProxy.connect(boD2).approve(1)

      expect(await boardOfDirectorsProxy.getOwners()).to.not.include.members([founder.address])
    })

    it('should emit OwnersChanged', async () => {
      const { founder, boD2, boardOfDirectorsProxy } = await removeOwnerFixture()

      const oldOwners = await boardOfDirectorsProxy.getOwners()

      // approve to remove owner
      await expect(boardOfDirectorsProxy.connect(boD2).approve(1))
        .to.emit(boardOfDirectorsProxy, 'OwnersChanged')
        .withArgs(oldOwners.filter((owner) => owner !== founder.address))
    })

    it('should revert if owner not found', async () => {
      const { boD2, boardOfDirectorsProxy } = await removeOwnerFixture({ removeNotOwner: true })

      // try to remove not owner
      await expect(boardOfDirectorsProxy.connect(boD2).approve(1)).to.be.revertedWith('Call failed')
    })

    it('should revert if called by other address', async () => {
      const { founder, boardOfDirectorsProxy } = await removeOwnerFixture()

      await expect(boardOfDirectorsProxy.connect(founder).removeOwner(founder)).to.be.revertedWith(
        'Only self can call this function'
      )
    })
  })
})
