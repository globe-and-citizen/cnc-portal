import { expect } from 'chai'
import hre from 'hardhat'
import { assertImplementationVersion } from '../scripts/lib/implementation-version.js'

describe('Compiled release version gate', () => {
  it('rejects mismatched candidate versions before a production connection is opened', async () => {
    const connection = await hre.network.create('hardhat')
    try {
      await assertImplementationVersion(connection, 'ExpenseAccountEIP712', '2.0.2')
      await expect(
        assertImplementationVersion(connection, 'ExpenseAccountEIP712', '2.0.1')
      ).to.be.rejectedWith('release requires 2.0.1')
      const live = { networkConfig: { type: 'http' } } as unknown as typeof connection
      await expect(
        assertImplementationVersion(live, 'ExpenseAccountEIP712', '2.0.2')
      ).to.be.rejectedWith('require a simulated network')
    } finally {
      await connection.close()
    }
  })
})
