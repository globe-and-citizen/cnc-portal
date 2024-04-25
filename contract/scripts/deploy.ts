import { ethers, upgrades } from 'hardhat'

async function main() {
  const Tips = await ethers.getContractFactory('Tips')
  const tips = await upgrades.deployProxy(Tips)
  const contract = await tips.waitForDeployment()

  console.log('Tips deployed to:', await contract.getAddress())
}

main()
