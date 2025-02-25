import {
  assert,
  describe,
  test,
  clearStore,
  beforeAll,
  afterAll
} from 'matchstick-as/assembly/index'
import { Address, BigInt } from '@graphprotocol/graph-ts'
import { BeaconConfigured } from '../generated/schema'
import { BeaconConfigured as BeaconConfiguredEvent } from '../generated/Officer/Officer'
import { handleBeaconConfigured } from '../src/officer'
import { createBeaconConfiguredEvent } from './officer-utils'

// Tests structure (matchstick-as >=0.5.0)
// https://thegraph.com/docs/en/developer/matchstick/#tests-structure-0-5-0

describe('Describe entity assertions', () => {
  beforeAll(() => {
    let contractType = 'Example string value'
    let beaconAddress = Address.fromString('0x0000000000000000000000000000000000000001')
    let newBeaconConfiguredEvent = createBeaconConfiguredEvent(contractType, beaconAddress)
    handleBeaconConfigured(newBeaconConfiguredEvent)
  })

  afterAll(() => {
    clearStore()
  })

  // For more test scenarios, see:
  // https://thegraph.com/docs/en/developer/matchstick/#write-a-unit-test

  test('BeaconConfigured created and stored', () => {
    assert.entityCount('BeaconConfigured', 1)

    // 0xa16081f360e3847006db660bae1c6d1b2e17ec2a is the default address used in newMockEvent() function
    assert.fieldEquals(
      'BeaconConfigured',
      '0xa16081f360e3847006db660bae1c6d1b2e17ec2a-1',
      'contractType',
      'Example string value'
    )
    assert.fieldEquals(
      'BeaconConfigured',
      '0xa16081f360e3847006db660bae1c6d1b2e17ec2a-1',
      'beaconAddress',
      '0x0000000000000000000000000000000000000001'
    )

    // More assert options:
    // https://thegraph.com/docs/en/developer/matchstick/#asserts
  })
})
