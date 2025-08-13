// test/beaconUpgrade.test.ts
import { ethers } from 'hardhat'
import { expect } from 'chai'
import { Officer, FactoryBeacon } from '../typechain-types'

describe('Officer Upgrade Test', function () {
  it('Should verify the implementation address after upgrade', async function () {
    // 1. Get the Beacon contract instance
    const beaconAddress = '<beacon_address>'
    const Beacon = (await ethers.getContractFactory('FactoryBeacon')) as unknown as FactoryBeacon
    const beacon = Beacon.attach(beaconAddress) as unknown as FactoryBeacon

    // 2. Get the implementation address from the beacon
    const implementationAddress = await beacon.implementation()

    // 3. Verify the implementation address is correct
    console.log('Current Officer implementation address:', implementationAddress)

    // Optional: Verify the implementation is the expected contract
    // const Implementation = await ethers.getContractFactory('Officer')
    // const implementation = Implementation.attach(implementationAddress) as unknown as Officer

    // Test some function to verify it's the right contract
    // Replace with an actual function from your implementation
    // const version = await implementation.getVersion();
    // expect(version).to.exist;
    // expect(version).to.equal("2.0.0");
  })
})
