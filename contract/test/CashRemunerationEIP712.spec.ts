import { ethers, upgrades } from 'hardhat'
import { expect } from 'chai'
import { SignerWithAddress } from '@nomicfoundation/hardhat-ethers/signers'
import { CashRemunerationEIP712 } from '../typechain-types'
import { MockERC20 } from '../typechain-types'

describe('CashRemuneration*** (EIP712)', () => {
  let cashRemunerationProxy: CashRemunerationEIP712
  let mockUSDC: MockERC20
  let mockUSDT: MockERC20

  const deployContract = async (employer: SignerWithAddress) => {
    // Deploy mock tokens first
    const MockToken = await ethers.getContractFactory('MockERC20')
    mockUSDC = await MockToken.deploy('USDC', 'USDC')
    mockUSDT = await MockToken.deploy('USDT', 'USDT')

    const CashRemunerationImplementation = await ethers.getContractFactory('CashRemunerationEIP712')
    cashRemunerationProxy = (await upgrades.deployProxy(
      CashRemunerationImplementation,
      [employer.address, await mockUSDC.getAddress()],
      { initializer: 'initialize' }
    )) as unknown as CashRemunerationEIP712
  }

  describe('Initialization', () => {
    let employer: SignerWithAddress

    before(async () => {
      ;[employer] = await ethers.getSigners()
      await deployContract(employer)
    })

    it('should initialize with correct owner', async () => {
      expect(await cashRemunerationProxy.owner()).to.equal(employer.address)
    })

    it('should initialize with USDC as supported token', async () => {
      const usdcAddress = await mockUSDC.getAddress()
      expect(await cashRemunerationProxy.supportedTokens(usdcAddress)).to.be.true
    })

    it('should reject zero address for owner', async () => {
      const CashRemunerationImplementation =
        await ethers.getContractFactory('CashRemunerationEIP712')
      await expect(
        upgrades.deployProxy(
          CashRemunerationImplementation,
          [ethers.ZeroAddress, await mockUSDC.getAddress()],
          { initializer: 'initialize' }
        )
      ).to.be.revertedWith('Owner address cannot be zero')
    })

    it('should reject zero address for USDC', async () => {
      const CashRemunerationImplementation =
        await ethers.getContractFactory('CashRemunerationEIP712')
      await expect(
        upgrades.deployProxy(
          CashRemunerationImplementation,
          [employer.address, ethers.ZeroAddress],
          { initializer: 'initialize' }
        )
      ).to.be.revertedWith('USDC address cannot be zero')
    })

    it('should prevent reinitialization', async () => {
      await expect(
        cashRemunerationProxy.initialize(employer.address, await mockUSDC.getAddress())
      ).to.be.revertedWithCustomError(cashRemunerationProxy, 'InvalidInitialization')
    })
  })

  describe('As CNC Company Founder', () => {
    let employer: SignerWithAddress
    let employee: SignerWithAddress
    let imposter: SignerWithAddress
    const DOMAIN_NAME = 'CashRemuneration'
    const DOMAIN_VERSION = '1'
    let chainId: bigint
    let verifyingContract: string
    let domain: {
      name: string
      version: string
      chainId: bigint
      verifyingContract: string
    }
    let types: {
      [key: string]: Array<{ name: string; type: string }>
    }

    context('I want to deploy my Cash Remuneration Smart Contract', () => {
      before(async () => {
        ;[employer, employee, imposter] = await ethers.getSigners()
        await deployContract(employer)
        chainId = (await ethers.provider.getNetwork()).chainId
        verifyingContract = await cashRemunerationProxy.getAddress()

        domain = {
          name: DOMAIN_NAME,
          version: DOMAIN_VERSION,
          chainId,
          verifyingContract
        }

        types = {
          Wage: [
            { name: 'hourlyRate', type: 'uint256' },
            { name: 'tokenAddress', type: 'address' }
          ],
          WageClaim: [
            { name: 'employeeAddress', type: 'address' },
            { name: 'hoursWorked', type: 'uint8' },
            { name: 'wages', type: 'Wage[]' },
            { name: 'date', type: 'uint256' }
          ]
        }

        mockUSDC.mint(verifyingContract, ethers.parseUnits('1000000', 6))
      })

      it('Then I become the employer of the contract', async () => {
        expect(await cashRemunerationProxy.owner()).to.eq(await employer.getAddress())
      })

      it('Then I can deposit into the cash remuneration contract', async () => {
        const amount = ethers.parseEther('5000')
        const tx = await employer.sendTransaction({
          to: await cashRemunerationProxy.getAddress(),
          value: amount
        })

        await expect(tx).to.changeEtherBalance(cashRemunerationProxy, amount)
        await expect(tx)
          .to.emit(cashRemunerationProxy, 'Deposited')
          .withArgs(employer.address, amount)
      })

      it('Then I can get the contract balance', async () => {
        const balance = await cashRemunerationProxy.getBalance()
        expect(balance).to.be.equal(ethers.parseEther('5000'))
      })

      it('Then I can add and remove supported tokens', async () => {
        await expect(cashRemunerationProxy.addTokenSupport(await mockUSDT.getAddress()))
          .to.emit(cashRemunerationProxy, 'TokenSupportAdded')
          .withArgs(await mockUSDT.getAddress())
        expect(
          await cashRemunerationProxy.supportedTokens(await mockUSDT.getAddress())
        ).to.be.equal(true)
        await expect(cashRemunerationProxy.removeTokenSupport(await mockUSDT.getAddress()))
          .to.emit(cashRemunerationProxy, 'TokenSupportRemoved')
          .withArgs(await mockUSDT.getAddress())
        expect(
          await cashRemunerationProxy.supportedTokens(await mockUSDT.getAddress())
        ).to.be.equal(false)
      })

      it('Then I can authorise an employee to withdraw their wage', async () => {
        const wageClaim = {
          employeeAddress: employee.address,
          hoursWorked: 5,
          wages: [
            {
              hourlyRate: ethers.parseEther('10'),
              tokenAddress: ethers.ZeroAddress
            },
            {
              hourlyRate: BigInt(20 * 1e6),
              tokenAddress: await mockUSDC.getAddress()
            }
          ],
          date: Math.floor(Date.now() / 1000)
        }

        const signature = await employer.signTypedData(domain, types, wageClaim)
        const sigHash = ethers.keccak256(signature)
        const tx = await cashRemunerationProxy.connect(employee).withdraw(wageClaim, signature)
        const receipt = await tx.wait()

        console.log(`\t    Gas used: ${receipt?.gasUsed.toString()}`)

        const amount = BigInt(wageClaim.hoursWorked) * wageClaim.wages[0].hourlyRate
        const amountUSDC = BigInt(wageClaim.hoursWorked) * wageClaim.wages[1].hourlyRate

        await expect(tx).to.changeEtherBalance(employee, amount)
        await expect(tx)
          .to.emit(cashRemunerationProxy, 'Withdraw')
          .withArgs(employee.address, amount)
        await expect(tx)
          .to.emit(cashRemunerationProxy, 'WithdrawToken')
          .withArgs(employee.address, await mockUSDC.getAddress(), amountUSDC)
        const paidWageClaim = await cashRemunerationProxy.paidWageClaims(sigHash)
        expect(paidWageClaim).to.be.equal(true)
      })

      describe("Then a user can't transfer if;", () => {
        it('the signer is not the contract employer', async () => {
          const wageClaim = {
            employeeAddress: employee.address,
            hoursWorked: 5,
            wages: [
              {
                hourlyRate: ethers.parseEther('10'),
                tokenAddress: ethers.ZeroAddress
              },
              {
                hourlyRate: BigInt(20 * 1e6),
                tokenAddress: await mockUSDC.getAddress()
              }
            ],
            date: Math.floor(Date.now() / 1000)
          }

          const signature = await imposter.signTypedData(domain, types, wageClaim)

          await expect(
            cashRemunerationProxy.connect(employee).withdraw(wageClaim, signature)
          ).to.be.revertedWithCustomError(cashRemunerationProxy, 'UnauthorizedAccess')
        })
        it('the withdrawer is not the approved user', async () => {
          const wageClaim = {
            employeeAddress: employee.address,
            hoursWorked: 5,
            wages: [
              {
                hourlyRate: ethers.parseEther('10'),
                tokenAddress: ethers.ZeroAddress
              },
              {
                hourlyRate: BigInt(20 * 1e6),
                tokenAddress: await mockUSDC.getAddress()
              }
            ],
            date: Math.floor(Date.now() / 1000)
          }

          const signature = await employer.signTypedData(domain, types, wageClaim)

          await expect(
            cashRemunerationProxy.connect(imposter).withdraw(wageClaim, signature)
          ).to.be.revertedWith('Withdrawer not approved')
        })
        it('the wage has already been paid', async () => {
          const wageClaim = {
            employeeAddress: employee.address,
            hoursWorked: 8,
            wages: [
              {
                hourlyRate: ethers.parseEther('10'),
                tokenAddress: ethers.ZeroAddress
              },
              {
                hourlyRate: BigInt(20 * 1e6),
                tokenAddress: await mockUSDC.getAddress()
              }
            ],
            date: Math.floor(Date.now() / 1000)
          }

          const signature = await employer.signTypedData(domain, types, wageClaim)
          const sigHash = ethers.keccak256(signature)
          const tx = await cashRemunerationProxy.connect(employee).withdraw(wageClaim, signature)
          const amount = BigInt(wageClaim.hoursWorked) * wageClaim.wages[0].hourlyRate

          await expect(tx).to.changeEtherBalance(employee, amount)
          await expect(tx)
            .to.emit(cashRemunerationProxy, 'Withdraw')
            .withArgs(employee.address, amount)
          const paidWageClaim = await cashRemunerationProxy.paidWageClaims(sigHash)
          expect(paidWageClaim).to.be.equal(true)

          expect(
            cashRemunerationProxy.connect(employee).withdraw(wageClaim, signature)
          ).to.be.revertedWith('Wage already paid')
        })
        it('the wage amount exceeds the contract balance', async () => {
          const wageClaim = {
            employeeAddress: employee.address,
            hoursWorked: 5,
            wages: [
              {
                hourlyRate: ethers.parseEther('1000'),
                tokenAddress: ethers.ZeroAddress
              },
              {
                hourlyRate: BigInt(20 * 1e6),
                tokenAddress: await mockUSDC.getAddress()
              }
            ],
            date: Math.floor(Date.now() / 1000) + 2
          }

          const signature = await employer.signTypedData(domain, types, wageClaim)

          await expect(cashRemunerationProxy.connect(employee).withdraw(wageClaim, signature)).to.be
            .reverted
        })
        it('the contract is paused', async () => {
          await expect(cashRemunerationProxy.pause())
            .to.emit(cashRemunerationProxy, 'Paused')
            .withArgs(employer.address)

          const wageClaim = {
            employeeAddress: employee.address,
            hoursWorked: 5,
            wages: [
              {
                hourlyRate: ethers.parseEther('10'),
                tokenAddress: ethers.ZeroAddress
              },
              {
                hourlyRate: BigInt(20 * 1e6),
                tokenAddress: await mockUSDC.getAddress()
              }
            ],
            date: Math.floor(Date.now() / 1000) + 3
          }

          const signature = await employer.signTypedData(domain, types, wageClaim)

          await expect(
            cashRemunerationProxy.connect(employee).withdraw(wageClaim, signature)
          ).to.be.revertedWithCustomError(cashRemunerationProxy, 'EnforcedPause')
        })
        it('Then I can unpause the account', async () => {
          await expect(cashRemunerationProxy.unpause())
            .to.emit(cashRemunerationProxy, 'Unpaused')
            .withArgs(employer.address)
        })
      })
    })
  })
})
