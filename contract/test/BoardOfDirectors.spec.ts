import { ethers } from 'hardhat'
import { expect } from 'chai'

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

    const BankFactory = await ethers.getContractFactory('Bank')
    const bank = await BankFactory.deploy()
    await bank.initialize([], founder.address)
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
    ).to.be.revertedWith('Only board of directors can call this function')
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
})
