import { ethers, upgrades } from 'hardhat'
import { expect } from 'chai'
import type { Bank } from '../typechain-types'

describe('BoardOfDirectors', () => {
  async function deployFixture() {
    const [founder, member1, member2, member3, recipient, outsider] = await ethers.getSigners()

    const BoardImplFactory = await ethers.getContractFactory('BoardOfDirectors')
    const boardImpl = await BoardImplFactory.deploy()

    const BeaconFactory = await ethers.getContractFactory('Beacon')
    const beacon = await BeaconFactory.deploy(await boardImpl.getAddress())

    const initData = boardImpl.interface.encodeFunctionData('initialize', [[founder.address]])
    const ProxyFactory = await ethers.getContractFactory('UserBeaconProxy')
    const proxy = await ProxyFactory.deploy(await beacon.getAddress(), initData)
    const board = await ethers.getContractAt('BoardOfDirectors', await proxy.getAddress())

    await board
      .connect(founder)
      .setBoardOfDirectors([member1.address, member2.address, member3.address])

    // Deploy Bank through a proxy; the implementation's constructor now calls
    // `_disableInitializers()`, so `initialize` can only be invoked on a proxy.
    const BankFactory = await ethers.getContractFactory('Bank')
    const bank = (await upgrades.deployProxy(BankFactory, [[], founder.address], {
      initializer: 'initialize'
    })) as unknown as Bank
    await bank.transferOwnership(await board.getAddress())

    await founder.sendTransaction({ to: await bank.getAddress(), value: ethers.parseEther('5') })

    return { founder, member1, member2, member3, recipient, outsider, board, bank }
  }

  it('sets board members and membership checks', async () => {
    const { board, member1, member2, member3 } = await deployFixture()

    const members = await board.getBoardOfDirectors()
    expect(members).to.deep.equal([member1.address, member2.address, member3.address])
    expect(await board.isMember(member1.address)).to.equal(true)
    expect(await board.isMember(member2.address)).to.equal(true)
    expect(await board.isMember(member3.address)).to.equal(true)
  })

  it('allows board members to add actions', async () => {
    const { board, bank, member1, recipient } = await deployFixture()

    await expect(
      board
        .connect(member1)
        .addAction(
          await bank.getAddress(),
          'bank transfer',
          bank.interface.encodeFunctionData('transfer', [recipient.address, ethers.parseEther('1')])
        )
    ).to.emit(board, 'ActionAdded')

    expect(await board.actionCount()).to.equal(1)
    expect(await board.isApproved(0, member1.address)).to.equal(true)
  })

  it('executes action after majority approvals', async () => {
    const { board, bank, member1, member2 } = await deployFixture()

    await board
      .connect(member1)
      .addAction(
        await bank.getAddress(),
        'pause bank',
        bank.interface.encodeFunctionData('pause', [])
      )

    await expect(board.connect(member2).approve(0)).to.emit(board, 'ActionExecuted')

    expect(await board.isActionExecuted(0)).to.equal(true)
    expect(await bank.paused()).to.equal(true)
  })

  it('rejects action creation from non-board addresses', async () => {
    const { board, bank, outsider, recipient } = await deployFixture()

    await expect(
      board
        .connect(outsider)
        .addAction(
          await bank.getAddress(),
          'bank transfer',
          bank.interface.encodeFunctionData('transfer', [recipient.address, ethers.parseEther('1')])
        )
    ).to.be.revertedWithCustomError(board, 'NotBoardMember')
  })

  it('supports revoking approvals', async () => {
    const { board, bank, member1, recipient } = await deployFixture()

    await board
      .connect(member1)
      .addAction(
        await bank.getAddress(),
        'bank transfer',
        bank.interface.encodeFunctionData('transfer', [recipient.address, ethers.parseEther('1')])
      )

    await expect(board.connect(member1).revoke(0)).to.emit(board, 'Revocation')
    expect(await board.isApproved(0, member1.address)).to.equal(false)
  })

  it('returns approvalCount for an action', async () => {
    const { board, bank, member1, recipient } = await deployFixture()

    await board
      .connect(member1)
      .addAction(
        await bank.getAddress(),
        'bank transfer',
        bank.interface.encodeFunctionData('transfer', [recipient.address, ethers.parseEther('1')])
      )

    expect(await board.approvalCount(0)).to.equal(1)
  })

  it('returns owners list', async () => {
    const { board, founder } = await deployFixture()

    const owners = await board.getOwners()
    expect(owners).to.include(founder.address)
  })

  it('rejects approve on already executed action', async () => {
    const { board, bank, member1, member2 } = await deployFixture()

    await board
      .connect(member1)
      .addAction(
        await bank.getAddress(),
        'pause bank',
        bank.interface.encodeFunctionData('pause', [])
      )

    await board.connect(member2).approve(0) // executes the action (majority reached)

    await expect(board.connect(member2).approve(0)).to.be.revertedWithCustomError(
      board,
      'ActionAlreadyExecuted'
    )
  })

  it('rejects revoke when not approved', async () => {
    const { board, bank, member1, member2, recipient } = await deployFixture()

    await board
      .connect(member1)
      .addAction(
        await bank.getAddress(),
        'bank transfer',
        bank.interface.encodeFunctionData('transfer', [recipient.address, ethers.parseEther('1')])
      )

    // member2 has not approved, so revoke should fail
    await expect(board.connect(member2).revoke(0)).to.be.revertedWithCustomError(
      board,
      'NotApproved'
    )
  })

  it('rejects revoke on already executed action', async () => {
    const { board, bank, member1, member2 } = await deployFixture()

    await board
      .connect(member1)
      .addAction(
        await bank.getAddress(),
        'pause bank',
        bank.interface.encodeFunctionData('pause', [])
      )

    await board.connect(member2).approve(0) // executes the action

    await expect(board.connect(member1).revoke(0)).to.be.revertedWithCustomError(
      board,
      'ActionAlreadyExecuted'
    )
  })

  it('rejects setBoardOfDirectors with empty array', async () => {
    const { board, founder } = await deployFixture()

    await expect(board.connect(founder).setBoardOfDirectors([])).to.be.revertedWithCustomError(
      board,
      'EmptyList'
    )
  })

  it('rejects addAction with zero target address', async () => {
    const { board, member1 } = await deployFixture()

    await expect(
      board.connect(member1).addAction(ethers.ZeroAddress, 'invalid', '0x')
    ).to.be.revertedWithCustomError(board, 'ZeroAddress')
  })

  it('calls setOwners via self-referential board action', async () => {
    const { board, member1, member2 } = await deployFixture()

    const newOwners = [member1.address, member2.address]
    const setOwnersCalldata = board.interface.encodeFunctionData('setOwners', [newOwners])

    await board
      .connect(member1)
      .addAction(await board.getAddress(), 'set owners', setOwnersCalldata)

    await board.connect(member2).approve(0)
    // After execution, the owners should be updated
    const owners = await board.getOwners()
    expect(owners).to.include(member1.address)
    expect(owners).to.include(member2.address)
  })

  it('calls addOwner via self-referential board action', async () => {
    const { board, member1, member2, outsider } = await deployFixture()

    const addOwnerCalldata = board.interface.encodeFunctionData('addOwner', [outsider.address])

    await board.connect(member1).addAction(await board.getAddress(), 'add owner', addOwnerCalldata)

    await board.connect(member2).approve(0)

    const owners = await board.getOwners()
    expect(owners).to.include(outsider.address)
  })

  it('calls removeOwner via self-referential board action', async () => {
    const { board, founder, member1, member2 } = await deployFixture()

    const removeOwnerCalldata = board.interface.encodeFunctionData('removeOwner', [founder.address])

    await board
      .connect(member1)
      .addAction(await board.getAddress(), 'remove owner', removeOwnerCalldata)

    await board.connect(member2).approve(0)

    const owners = await board.getOwners()
    expect(owners).to.not.include(founder.address)
  })

  it('rejects addOwner with zero address via self-call', async () => {
    const { board, member1, member2 } = await deployFixture()

    const addOwnerCalldata = board.interface.encodeFunctionData('addOwner', [ethers.ZeroAddress])

    await board.connect(member1).addAction(await board.getAddress(), 'add owner', addOwnerCalldata)

    await expect(board.connect(member2).approve(0)).to.be.revertedWithCustomError(
      board,
      'CallFailed'
    )
  })
})
