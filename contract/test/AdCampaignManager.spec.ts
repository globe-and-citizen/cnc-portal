import { ethers } from 'hardhat'
import { expect } from 'chai'
import { ContractTransactionReceipt, LogDescription } from 'ethers'
import { AdCampaignManager } from '../typechain-types'
import { SignerWithAddress } from '@nomicfoundation/hardhat-ethers/signers'

describe('AdCampaignManager', () => {
  let adCampaignManager: AdCampaignManager

  let owner: SignerWithAddress
  let admin: SignerWithAddress
  let advertiser: SignerWithAddress
  let unauthorizedUser: SignerWithAddress
  let campaignCode: string

  before(async () => {
    ;[owner, admin, advertiser, unauthorizedUser] = await ethers.getSigners()
    const AdCampaignManagerFactory = await ethers.getContractFactory('AdCampaignManager')
    adCampaignManager = (await AdCampaignManagerFactory.deploy(
      ethers.parseEther('0.01'), // costPerClick
      ethers.parseEther('0.001'), // costPerImpression
      owner.address // bankContractAddress
    )) as AdCampaignManager
    await adCampaignManager.waitForDeployment()
  })

  describe('Deployment', () => {
    it('Should deploy the contract with correct initial values', async () => {
      expect(await adCampaignManager.costPerClick()).to.equal(ethers.parseEther('0.01'))
      expect(await adCampaignManager.costPerImpression()).to.equal(ethers.parseEther('0.001'))
      expect(await adCampaignManager.bankContractAddress()).to.equal(owner.address)
    })
  })

  describe('Ad Campaigns', () => {
    it('Should allow an advertiser to create an ad campaign', async () => {
      // Execute the transaction to create an ad campaign
      const tx = await adCampaignManager.connect(advertiser).createAdCampaign({
        value: ethers.parseEther('10')
      })

      // Wait for the transaction to be mined
      const receipt = (await tx.wait()) as ContractTransactionReceipt
      // Find the log that matches the `AdCampaignCreated` event
      const adCampaignManagerAddress = (await adCampaignManager.getAddress()) as string
      const eventLog = receipt.logs.find((log) => log.address === adCampaignManagerAddress)

      if (!eventLog) {
        throw new Error('AdCampaignCreated event log not found')
      }

      // Extract the event args (campaignCode and budget)
      // Decode the log using the contract interface to extract event data
      if (!eventLog) {
        throw new Error('AdCampaignCreated event log not found')
      }

      const parsedLog: LogDescription = adCampaignManager.interface.parseLog({
        topics: eventLog.topics,
        data: eventLog.data
      }) as LogDescription
      campaignCode = parsedLog.args.campaignCode
      const campaignBudget = parsedLog.args.budget

      // Verify that the event was emitted with the correct campaign budget
      expect(parsedLog.name).to.equal('AdCampaignCreated')
      expect(campaignBudget).to.equal(ethers.parseEther('10'))

      // Check the campaign data in the contract by using the campaignCode
      const campaignId = await adCampaignManager.campaignCodesToId(campaignCode)
      const campaign = await adCampaignManager.adCampaigns(campaignId)

      // Assert that the advertiser and budget are correctly set
      expect(campaign.advertiser).to.equal(advertiser.address)
      expect(campaign.budget).to.equal(ethers.parseEther('10'))
    })

    it('Should not allow creating an ad campaign with zero budget', async () => {
      await expect(
        adCampaignManager.connect(advertiser).createAdCampaign({
          value: ethers.parseEther('0')
        })
      ).to.be.revertedWith('the budget should be greater than zero')
    })

    it('Should not allow unauthorized users to request withdrawal', async () => {
      // Ensure the campaign is active before attempting the withdrawal
      const campaignId = await adCampaignManager.campaignCodesToId(campaignCode)
      const campaign = await adCampaignManager.adCampaigns(campaignId)

      expect(campaign.status).to.equal(0) // 0 = Active, 1 = Completed

      // Now try to request a withdrawal as an unauthorized user
      await expect(
        adCampaignManager
          .connect(unauthorizedUser)
          .requestAndApproveWithdrawal(campaignCode, ethers.parseEther('3'))
      ).to.be.revertedWith('Only the advertiser,admin, or owner can request withdrawal')
    })

    it('Should not allow creating an ad campaign with invalid budget', async () => {
      await expect(
        adCampaignManager.connect(advertiser).createAdCampaign({
          value: ethers.parseEther('0') // Negative budget
        })
      ).to.be.revertedWith('the budget should be greater than zero')
    })

    it('Should fail to withdraw by a non-advertiser', async () => {
      // Ensure the campaign is active before attempting the withdrawal
      const campaignId = await adCampaignManager.campaignCodesToId(campaignCode)
      const campaign = await adCampaignManager.adCampaigns(campaignId)

      expect(campaign.status).to.equal(0) // 0 = Active, 1 = Completed

      // Now try to request a withdrawal as a non-advertiser (admin in this case)
      await expect(
        adCampaignManager
          .connect(admin)
          .requestAndApproveWithdrawal(campaignCode, ethers.parseEther('3'))
      ).to.be.revertedWith('Only the advertiser,admin, or owner can request withdrawal')
    })

    it('Should allow the owner or admin to claim payment', async () => {
      // Simulate the owner claiming the payment
      // Use the campaign ID as the campaign code
      const currentAmountSpent = ethers.parseEther('3')
      const tx = await adCampaignManager
        .connect(owner)
        .claimPayment(campaignCode, currentAmountSpent)

      await expect(tx)
        .to.emit(adCampaignManager, 'PaymentReleased')
        .withArgs(campaignCode, ethers.parseEther('3'))
    })

    it('Should not allow claiming payment with invalid amount', async () => {
      const invalidAmountSpent = ethers.parseEther('0') // Negative amount

      await expect(
        adCampaignManager.connect(owner).claimPayment(campaignCode, invalidAmountSpent)
      ).to.be.revertedWith('the current amount spent should be greater than zero')
    })

    it('Should allow the owner to update cost per click and cost per impression', async () => {
      await adCampaignManager.connect(owner).setCostPerClick(ethers.parseEther('0.02'))
      await adCampaignManager.connect(owner).setCostPerImpression(ethers.parseEther('0.01'))
      expect(await adCampaignManager.costPerClick()).to.equal(ethers.parseEther('0.02'))
      expect(await adCampaignManager.costPerImpression()).to.equal(10000000000000000n)
    })

    it('Should not allow unauthorized users to set the cost per click', async () => {
      await expect(
        adCampaignManager.connect(unauthorizedUser).setCostPerClick(ethers.parseEther('0.02'))
      ).to.be.revertedWith('Caller is not an admin or the owner')
    })

    it('Should allow the owner to update cost per click and cost per impression', async () => {
      await adCampaignManager.connect(owner).setCostPerClick(ethers.parseEther('0.02'))
      await adCampaignManager.connect(owner).setCostPerImpression(ethers.parseEther('0.01'))
      expect(await adCampaignManager.costPerClick()).to.equal(ethers.parseEther('0.02'))
      expect(await adCampaignManager.costPerImpression()).to.equal(10000000000000000n)
    })

    it('should revert if bankContractAddress is set to address(0)', async () => {
      await expect(
        adCampaignManager
          .connect(owner)
          .setBankContractAddress('0x0000000000000000000000000000000000000000')
      ).to.be.revertedWith('Invalid bank contract address')
    })

    it('Should not allow non-owners to update cost per click', async () => {
      await expect(
        adCampaignManager.connect(advertiser).setCostPerClick(ethers.parseEther('0.02'))
      ).to.be.revertedWith('Caller is not an admin or the owner')
    })

    it('Should not allow non-owners to update cost per impression', async () => {
      await expect(
        adCampaignManager.connect(advertiser).setCostPerImpression(ethers.parseEther('0.02'))
      ).to.be.revertedWith('Caller is not an admin or the owner')
    })

    it('Should fail to claim payment with an invalid campaign code', async () => {
      const invalidCode = 'INVALID_CODE'
      await expect(
        adCampaignManager.connect(owner).claimPayment(invalidCode, ethers.parseEther('3'))
      ).to.be.revertedWith('Invalid campaign code')
    })

    it('Should allow the advertiser to request and approve withdrawal', async () => {
      // Campaign created in the first test
      const currentAmountSpent = ethers.parseEther('6')

      const tx = await adCampaignManager
        .connect(advertiser)
        .requestAndApproveWithdrawal(campaignCode, currentAmountSpent)

      await expect(tx)
        .to.emit(adCampaignManager, 'BudgetWithdrawn')
        .withArgs(campaignCode, advertiser.address, ethers.parseEther('4')) // Remaining budget

      await expect(tx)
        .to.emit(adCampaignManager, 'PaymentReleasedOnWithdrawApproval')
        .withArgs(campaignCode, ethers.parseEther('3'))
    })

    it('Should mark the campaign as completed when the entire budget is claimed', async () => {
      const campaignId = await adCampaignManager.campaignCodesToId(campaignCode)
      const campaign = await adCampaignManager.adCampaigns(campaignId)

      expect(campaign.status).to.equal(1) // 1 = Completed
    })

    it('Should mark the campaign as completed when the amount spent equals or exceeds the budget', async () => {
      // Create a new campaign with a fixed budget
      const tx = await adCampaignManager.connect(advertiser).createAdCampaign({
        value: ethers.parseEther('5') // Budget is 5 ETH
      })

      const receipt = (await tx.wait()) as ContractTransactionReceipt
      const adCampaignManagerAddress = await adCampaignManager.getAddress()
      const eventLog = receipt.logs.find((log) => log.address === adCampaignManagerAddress)

      const parsedLog: LogDescription = adCampaignManager.interface.parseLog({
        topics: eventLog!.topics,
        data: eventLog!.data
      }) as LogDescription
      const newCampaignCode = parsedLog.args.campaignCode
      const campaignId = await adCampaignManager.campaignCodesToId(newCampaignCode)

      // Now simulate spending that equals the budget
      const amountSpent = ethers.parseEther('5')
      await adCampaignManager.connect(owner).claimPayment(newCampaignCode, amountSpent)

      // Fetch the updated campaign data
      const updatedCampaign = await adCampaignManager.adCampaigns(campaignId)

      // Check that the campaign status is now marked as 'Completed'
      expect(updatedCampaign.status).to.equal(1) // 1 = Completed
    })

    it('Should generate a unique campaign code for each ad campaign', async () => {
      // Create the first ad campaign
      const tx1 = await adCampaignManager.connect(advertiser).createAdCampaign({
        value: ethers.parseEther('5')
      })

      const receipt1 = await tx1.wait()

      // Check if the receipt is null
      if (!receipt1) {
        throw new Error('Transaction receipt for the first ad campaign not found')
      }

      const adCampaignManagerAddress = await adCampaignManager.getAddress()

      const event1 = receipt1.logs.find((log) => log.address === adCampaignManagerAddress)

      if (!event1) {
        throw new Error('AdCampaignCreated event log not found for tx1')
      }

      // Create the second ad campaign
      const tx2 = await adCampaignManager.connect(advertiser).createAdCampaign({
        value: ethers.parseEther('5')
      })

      const receipt2 = await tx2.wait()

      // Check if the receipt is null
      if (!receipt2) {
        throw new Error('Transaction receipt for the second ad campaign not found')
      }

      const event2 = receipt2.logs.find((log) => log.address === adCampaignManagerAddress)

      if (!event2) {
        throw new Error('AdCampaignCreated event log not found for tx2')
      }

      // Parse the logs
      const parsedLog1 = adCampaignManager.interface.parseLog(event1)
      const parsedLog2 = adCampaignManager.interface.parseLog(event2)

      // Ensure that the campaign codes are unique
      expect(parsedLog1?.args.campaignCode).to.not.equal(parsedLog2?.args.campaignCode)
    })
  })

  describe('Admin Management', () => {
    it('Should allow only owner to add and remove admins', async () => {
      const tx = await adCampaignManager.connect(owner).addAdmin(admin.address)
      await expect(tx).to.emit(adCampaignManager, 'AdminAdded').withArgs(admin.address)

      const isAdmin = await adCampaignManager.admins(admin.address)
      expect(isAdmin).to.be.true

      const removeTx = await adCampaignManager.connect(owner).removeAdmin(admin.address)
      await expect(removeTx).to.emit(adCampaignManager, 'AdminRemoved').withArgs(admin.address)

      const isAdminAfterRemoval = await adCampaignManager.admins(admin.address)
      expect(isAdminAfterRemoval).to.be.false
    })
    it('Should allow only admins or the owner to set the bankContractAddress', async () => {
      await adCampaignManager.connect(owner).setBankContractAddress(admin.address)
      expect(await adCampaignManager.bankContractAddress()).to.equal(admin.address)

      // Test unauthorized user trying to set the bank address
      await expect(
        adCampaignManager.connect(advertiser).setBankContractAddress(advertiser.address)
      ).to.be.revertedWith('Caller is not an admin or the owner')
    })

    it('Should not allow unauthorized users to set the cost per click', async () => {
      await expect(
        adCampaignManager.connect(unauthorizedUser).setCostPerClick(ethers.parseEther('0.02'))
      ).to.be.revertedWith('Caller is not an admin or the owner')
    })

    it('Should not allow unauthorized users to set the cost per impression', async () => {
      await expect(
        adCampaignManager.connect(unauthorizedUser).setCostPerImpression(ethers.parseEther('0.02'))
      ).to.be.revertedWith('Caller is not an admin or the owner')
    })

    it('Should allow only admins or the owner to set the cost per click', async () => {
      await adCampaignManager.connect(owner).setCostPerClick(ethers.parseEther('0.02'))
      expect(await adCampaignManager.costPerClick()).to.equal(ethers.parseEther('0.02'))

      // Test unauthorized user trying to set the cost
      await expect(
        adCampaignManager.connect(advertiser).setCostPerClick(ethers.parseEther('0.02'))
      ).to.be.revertedWith('Caller is not an admin or the owner')
    })

    it('Should allow only admins or the owner to set the cost per impression', async () => {
      await adCampaignManager.connect(owner).setCostPerImpression(ethers.parseEther('0.002'))
      expect(await adCampaignManager.costPerImpression()).to.equal(ethers.parseEther('0.002'))

      // Test unauthorized user trying to set the cost
      await expect(
        adCampaignManager.connect(advertiser).setCostPerImpression(ethers.parseEther('0.002'))
      ).to.be.revertedWith('Caller is not an admin or the owner')
    })
  })

  describe('Pausable', () => {
    it('Should allow the owner to pause and unpause the contract', async () => {
      await adCampaignManager.connect(owner).pause()
      expect(await adCampaignManager.paused()).to.be.true

      await adCampaignManager.connect(owner).unpause()
      expect(await adCampaignManager.paused()).to.be.false
    })

    it('Should allow the owner to pause and unpause the contract', async () => {
      await adCampaignManager.connect(owner).pause()
      expect(await adCampaignManager.paused()).to.equal(true)

      await expect(
        adCampaignManager.connect(advertiser).createAdCampaign({
          value: ethers.parseEther('10')
        })
      ).to.be.revertedWithCustomError

      await adCampaignManager.connect(owner).unpause()
      expect(await adCampaignManager.paused()).to.equal(false)
    })

    it('Should generate a unique campaign code', async () => {
      const tx1 = await adCampaignManager.connect(advertiser).createAdCampaign({
        value: ethers.parseEther('5')
      })
      const tx2 = await adCampaignManager.connect(advertiser).createAdCampaign({
        value: ethers.parseEther('5')
      })

      const receipt1 = await tx1.wait()
      const receipt2 = await tx2.wait()

      if (!receipt1) {
        throw new Error('Transaction receipt for the first ad campaign not found')
      }
      const log1 = receipt1.logs[0]
      if (!log1) {
        throw new Error('Log not found in receipt1')
      }
      const parsedLog1 = adCampaignManager.interface.parseLog(log1)
      if (!parsedLog1) {
        throw new Error('Parsed log is null')
      }
      const campaignCode1 = parsedLog1.args.campaignCode
      if (!receipt2) {
        throw new Error('Transaction receipt for the second ad campaign not found')
      }
      const log2 = receipt2.logs[0]
      if (!log2) {
        throw new Error('Log not found in receipt2')
      }
      const parsedLog2 = adCampaignManager.interface.parseLog(log2)
      if (!parsedLog2) {
        throw new Error('Parsed log is null')
      }
      const campaignCode2 = parsedLog2.args.campaignCode

      expect(campaignCode1).to.not.equal(campaignCode2)
    })

    it('Should revert when trying to claim payment for a non-existent campaign code', async () => {
      // Try to claim payment for an invalid campaign code
      const invalidCampaignCode = 'invalid_campaign'
      await expect(
        adCampaignManager.connect(owner).claimPayment(invalidCampaignCode, ethers.parseEther('1'))
      ).to.be.revertedWith('Invalid campaign code')
    })

    it('Should return the correct ad campaign for a valid campaign code', async () => {
      // Create a new campaign
      const tx = await adCampaignManager.connect(advertiser).createAdCampaign({
        value: ethers.parseEther('5') // Budget of 5 ETH
      })

      const receipt = (await tx.wait()) as ContractTransactionReceipt
      const adCampaignManagerAddress = await adCampaignManager.getAddress()
      const eventLog = receipt.logs.find((log) => log.address === adCampaignManagerAddress)

      if (!eventLog) {
        throw new Error('Event log not found')
      }
      const parsedLog: LogDescription = adCampaignManager.interface.parseLog(
        eventLog
      ) as LogDescription
      const newCampaignCode = parsedLog.args.campaignCode

      // Fetch the campaign using the campaign code
      const fetchedCampaign = await adCampaignManager.getAdCampaignByCode(newCampaignCode)

      // Check that the fetched campaign data matches the expected values
      expect(fetchedCampaign.advertiser).to.equal(advertiser.address)
      expect(fetchedCampaign.budget).to.equal(ethers.parseEther('5'))
    })
  })
})
