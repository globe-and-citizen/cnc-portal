import { ethers, ignition } from 'hardhat'
import { expect } from "chai";

import TipsModule from "../ignition/modules/ProxyModule";
describe.only("Tips Proxy", function () {
    describe("Proxy interaction", async function () {
      it("Should be interactable via proxy", async function () {
        const [owner, otherAccount] = await ethers.getSigners();
  
        const { tips } = await ignition.deploy(TipsModule);
  
        expect(await tips.connect(otherAccount).owner()).to.equal("0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266");
      });
    });
  
  });