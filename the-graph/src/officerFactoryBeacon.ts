import { BeaconProxyCreated as BeaconProxyCreatedEvent } from '../generated/OfficerFactoryBeacon/OfficerFactoryBeacon'
import { BeaconProxyCreated } from '../generated/schema'
import { Officer } from '../generated/templates'

export function handleBeaconProxyCreated(event: BeaconProxyCreatedEvent): void {
  Officer.create(event.params.proxy)
  let entity = new BeaconProxyCreated(event.transaction.hash.concatI32(event.logIndex.toI32()))
  entity.officerAddress = event.params.proxy
  entity.deployer = event.params.deployer

  entity.blockNumber = event.block.number
  entity.blockTimestamp = event.block.timestamp
  entity.transactionHash = event.transaction.hash

  entity.save()
}
