// import { ethers } from 'hardhat'
// import { expect } from 'chai'
// import { Bank, FactoryBeacon } from '../typechain-types'

describe('Bank Upgrade Test', function () {
  it('Should verify the implementation address after upgrade', async function () {
    // 1. Get the Beacon contract instance
    // const beaconAddress = '<network_beacon_address>' //use correct address for the network
    // const Beacon = (await ethers.getContractFactory('Beacon')) as unknown as FactoryBeacon
    // const beacon = Beacon.attach(beaconAddress) as unknown as FactoryBeacon
    // 2. Get the implementation address from the beacon
    // const implementationAddress = await beacon.implementation()
    // 3. Verify the implementation address is correct
    // console.log('Current Bank implementation address:', implementationAddress)
    // Optional: Verify the implementation is the expected contract
    // const Implementation = await ethers.getContractFactory('Bank')
    // const implementation = Implementation.attach(
    //   implementationAddress
    // ) as unknown as Bank
    // Test some function to verify it's the right contract
    // Replace with an actual function from your implementation
    // const version = await implementation.getVersion();
    // expect(version).to.exist;
    // expect(version).to.equal("2.0.0");
  })
})
