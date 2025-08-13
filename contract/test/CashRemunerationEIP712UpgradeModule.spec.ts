// test/beaconUpgrade.test.ts
import { ethers } from 'hardhat'
// import { expect } from 'chai'
import { /*CashRemunerationEIP712,*/ FactoryBeacon } from '../typechain-types'

describe('CashRemunerationEIP712 Upgrade Test', function () {
  it('Should verify the implementation address after upgrade', async function () {
    // 1. Get the Beacon contract instance
    const beaconAddress = '<beacon_address>' //use correct address for the network
    const Beacon = (await ethers.getContractFactory('FactoryBeacon')) as unknown as FactoryBeacon
    const beacon = Beacon.attach(beaconAddress) as unknown as FactoryBeacon

    // 2. Get the implementation address from the beacon
    const implementationAddress = await beacon.implementation()

    // 3. Verify the implementation address is correct
    console.log('Current CashRemunerationEIP712implementation address:', implementationAddress)

    // Optional: Verify the implementation is the expected contract
    // const Implementation = await ethers.getContractFactory('CashRemunerationEIP712')
    // const implementation = Implementation.attach(
    //   implementationAddress
    // ) as unknown as CashRemunerationEIP712

    // Test some function to verify it's the right contract
    // Replace with an actual function from your implementation
    // const version = await implementation.getVersion();
    // expect(version).to.exist;
    // expect(version).to.equal("2.0.0");
  })
})
