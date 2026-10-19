import hre from 'hardhat'

export async function assertImplementationVersion(
  connection: Awaited<ReturnType<typeof hre.network.getOrCreate>>,
  contractName: string,
  expectedVersion: string,
  constructorArgs: readonly unknown[] = []
): Promise<void> {
  if (connection.networkConfig.type !== 'edr-simulated') {
    throw new Error('Candidate version checks require a simulated network')
  }
  const factory = await connection.ethers.getContractFactory(contractName)
  const implementation = await factory.deploy(...constructorArgs)
  await implementation.waitForDeployment()
  const version = (await implementation.getFunction('version')()) as string
  if (version !== expectedVersion) {
    throw new Error(
      `${contractName} candidate reports ${version}; release requires ${expectedVersion}`
    )
  }
}
