import { describe, expect, it } from 'vitest'
import { encodeAbiParameters, encodeEventTopics, parseEventLogs, zeroAddress } from 'viem'
import { EVENT_ABIS } from '../app/utils/contractEventsAbi'
import { contractEventsAbi as v1Events } from '../app/artifacts/abi/V1/events'
import { bankAbi, vestingAbi } from '../app/artifacts/abi/V2/generated'
import { resolveFeeCollector } from '../app/artifacts/feeCollectorRegistry'

describe('dashboard contract artifacts', () => {
  it('resolves each deployed FeeCollector version with its generated ABI', () => {
    for (const version of ['V0', 'V0.1', 'V1', 'V2'] as const) {
      const contract = resolveFeeCollector(version)
      expect(contract.address).not.toBe(zeroAddress)
      expect(contract.abi.some(item => item.type === 'function' && item.name === 'owner')).toBe(true)
    }
  })

  it('retains all V1 event signatures', () => {
    const signature = (item: { name: string, inputs: readonly { type: string }[] }) =>
      `${item.name}(${item.inputs.map(input => input.type).join(',')})`
    const signatures = new Set(EVENT_ABIS.flatMap(abi => abi.map(signature)))
    expect(v1Events.every(event => signatures.has(signature(event)))).toBe(true)
  })

  it('decodes the V2 Bank repayment funding event', () => {
    const fixedReturn = '0x1111111111111111111111111111111111111111'
    const token = '0x2222222222222222222222222222222222222222'
    const topics = encodeEventTopics({
      abi: bankAbi,
      eventName: 'FixedReturnRepaymentFunded',
      args: { fixedReturn, offerId: 3n, token }
    })
    const data = encodeAbiParameters([{ type: 'uint256' }], [42n])
    const logs = EVENT_ABIS.flatMap(abi => parseEventLogs({ abi, logs: [{ topics, data }] }))
    expect(logs.length).toBeGreaterThan(0)
    expect(logs[0]).toMatchObject({
      eventName: 'FixedReturnRepaymentFunded',
      args: { fixedReturn, offerId: 3n, token, amount: 42n }
    })
  })

  it('decodes V2 Vesting events whose indexed fields changed since V1', () => {
    const member = '0x1111111111111111111111111111111111111111'
    const topics = encodeEventTopics({ abi: vestingAbi, eventName: 'VestingStopped', args: { member } })
    const data = encodeAbiParameters([{ type: 'uint256' }], [7n])
    const logs = EVENT_ABIS.flatMap(abi => parseEventLogs({ abi, logs: [{ topics, data }] }))
    expect(logs.some(log => log.eventName === 'VestingStopped' && log.args?.index === 7n)).toBe(true)
  })
})
