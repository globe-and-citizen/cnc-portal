import hre, { ethers } from "hardhat";
import { Tips } from "../typechain-types";
import { expect } from "chai"
import { SignerWithAddress } from "@nomicfoundation/hardhat-ethers/signers";

describe("Tips", function () {
  let tips: Tips
  let companyOwner: SignerWithAddress, member1: SignerWithAddress, member2: SignerWithAddress;

  beforeEach(async function () {
    // Get signers for testing accounts
    [companyOwner, member1, member2] = await hre.ethers.getSigners();

    // Deploy the Tips contract
    const TipsFactory = await hre.ethers.getContractFactory("Tips");
    tips = await TipsFactory.deploy();
  });

  describe("pushTip", function () {
    it("should emit a PushTip event when a tip is pushed", async function () {
      const tipAmount = 10;

      await expect(tips.pushTip(member1.address, { value: tipAmount }))
        .to.emit(tips, "PushTip")
        .withArgs(companyOwner.address, member1.address, tipAmount);
    });

    it("should revert if the tip amount is zero", async function () {
      await expect(tips.pushTip(member1.address)).to.be.revertedWith(
        "Must send a positive amount."
      );
    });

    it("should transfer the tip amount to the recipient", async function () {
      const tipAmount = 10;
      const member1StartingBalance = await ethers.provider.getBalance(member1.address);

      await tips.pushTip(member1.address, { value: tipAmount });

      const member1EndingBalance = await ethers.provider.getBalance(member1.address);
      ;
      expect(member1EndingBalance).to.equal(
        member1StartingBalance + ethers.parseEther(tipAmount.toString())
      );
    });
  });

  describe("sendTip", function () {
    it("should emit a SendTip event when a tip is sent", async function () {
      const tipAmount = 10;

      await expect(tips.sendTip(member1.address, { value: tipAmount }))
        .to.emit(tips, "SendTip")
        .withArgs(companyOwner.address, member1.address, tipAmount);
    });

    it("should revert if the tip amount is zero", async function () {
      await expect(tips.sendTip(member1.address)).to.be.revertedWith(
        "Must send a positive amount."
      );
    });

    it("should accumulate tips for the recipient", async function () {
      const tipAmount1 = ethers.parseEther("10");
      const tipAmount2 = ethers.parseEther("20");
      
      await tips.sendTip(member1.address, { value: tipAmount1 });
      await tips.sendTip(member1.address, { value: tipAmount2 });

      const addressToTips = await tips.getTips(member1.address);
      const expectedTotalTip = tipAmount1 + tipAmount2;
      expect(addressToTips).to.equal(expectedTotalTip);
    });
  });

  describe("withdraw", function () {
    it("should revert if no tips have been earned", async function () {
      await expect(tips.connect(member1).withdraw()).to.be.revertedWith(
        "No tips to withdraw."
      );
    });

    it("should withdraw earned tips and reset the balance", async function () {
      const tipAmount = ethers.parseEther("10");

      await tips.connect(companyOwner).sendTip(member1.address, { value: tipAmount });

      const member1StartingBalance = await ethers.provider.getBalance(member1.address);

      await tips.connect(member1).withdraw();

      const member1EndingBalance = await ethers.provider.getBalance(member1.address);
      const expectedBalance = member1StartingBalance + tipAmount;

      expect(member1EndingBalance).to.equal(expectedBalance);
      expect(await tips.getTips(member1.address)).to.equal(0); // Balance should be reset
    });

    it("should emit a WithdrawTip event on successful withdrawal", async function () {
      const tipAmount = ethers.parseEther("10");

      await tips.connect(companyOwner).sendTip(member1.address, { value: tipAmount });

      await expect(tips.connect(member1).withdraw())
        .to.emit(tips, "WithdrawTip")
        .withArgs(member1.address, tipAmount);
    });
  });
});
