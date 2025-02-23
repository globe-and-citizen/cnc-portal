import {
  BeaconConfigured as BeaconConfiguredEvent,
  BeaconProxiesDeployed as BeaconProxiesDeployedEvent,
  BeaconProxyDeployed as BeaconProxyDeployedEvent,
  ContractDeployed as ContractDeployedEvent,
  Initialized as InitializedEvent,
  OwnershipTransferred as OwnershipTransferredEvent,
  Paused as PausedEvent,
  Unpaused as UnpausedEvent
} from "../generated/Officer/Officer"
import {
  BeaconConfigured,
  BeaconProxiesDeployed,
  BeaconProxyDeployed,
  ContractDeployed,
  Initialized,
  OwnershipTransferred,
  Paused,
  Unpaused
} from "../generated/schema"
import { ExpenseAccountEIP712 } from "../generated/templates"
import { Bytes } from "@graphprotocol/graph-ts"

export function handleBeaconConfigured(event: BeaconConfiguredEvent): void {
  let entity = new BeaconConfigured(
    event.transaction.hash.concatI32(event.logIndex.toI32())
  )
  entity.contractType = event.params.contractType
  entity.beaconAddress = event.params.beaconAddress

  entity.blockNumber = event.block.number
  entity.blockTimestamp = event.block.timestamp
  entity.transactionHash = event.transaction.hash

  entity.save()
}

export function handleBeaconProxiesDeployed(
  event: BeaconProxiesDeployedEvent
): void {
  let entity = new BeaconProxiesDeployed(
    event.transaction.hash.concatI32(event.logIndex.toI32())
  )
  entity.beaconProxies = changetype<Bytes[]>(event.params.beaconProxies)

  entity.blockNumber = event.block.number
  entity.blockTimestamp = event.block.timestamp
  entity.transactionHash = event.transaction.hash

  entity.save()
}

export function handleBeaconProxyDeployed(
  event: BeaconProxyDeployedEvent
): void {
  let entity = new BeaconProxyDeployed(
    event.transaction.hash.concatI32(event.logIndex.toI32())
  )
  entity.proxyAddress = event.params.proxyAddress
  entity.contractType = event.params.contractType.toString()

  entity.blockNumber = event.block.number
  entity.blockTimestamp = event.block.timestamp
  entity.transactionHash = event.transaction.hash

  entity.save()
}

export function handleContractDeployed(event: ContractDeployedEvent): void {
  let entity = new ContractDeployed(
    event.transaction.hash.concatI32(event.logIndex.toI32())
  )
  const deployedAddress = event.params.deployedAddress
  const contractType = event.params.contractType

  entity.contractType = contractType
  entity.deployedAddress = deployedAddress

  entity.blockNumber = event.block.number
  entity.blockTimestamp = event.block.timestamp
  entity.transactionHash = event.transaction.hash

  entity.save()

  //Create Expense Account template dynamically when new contract is deployed
  if (contractType === "ExpenseAccountEIP712")
    ExpenseAccountEIP712.create(deployedAddress)

  // switch (contractType) {
  //   case "ExpenseAccountEIP712":
  //     ExpenseAccountEIP712.create(proxyAddress)
  //     break;
  
  //   default:
  //     break;
  // }
}

export function handleInitialized(event: InitializedEvent): void {
  let entity = new Initialized(
    event.transaction.hash.concatI32(event.logIndex.toI32())
  )
  entity.version = event.params.version

  entity.blockNumber = event.block.number
  entity.blockTimestamp = event.block.timestamp
  entity.transactionHash = event.transaction.hash

  entity.save()
}

export function handleOwnershipTransferred(
  event: OwnershipTransferredEvent
): void {
  let entity = new OwnershipTransferred(
    event.transaction.hash.concatI32(event.logIndex.toI32())
  )
  entity.previousOwner = event.params.previousOwner
  entity.newOwner = event.params.newOwner

  entity.blockNumber = event.block.number
  entity.blockTimestamp = event.block.timestamp
  entity.transactionHash = event.transaction.hash

  entity.save()
}

export function handlePaused(event: PausedEvent): void {
  let entity = new Paused(
    event.transaction.hash.concatI32(event.logIndex.toI32())
  )
  entity.account = event.params.account

  entity.blockNumber = event.block.number
  entity.blockTimestamp = event.block.timestamp
  entity.transactionHash = event.transaction.hash

  entity.save()
}

export function handleUnpaused(event: UnpausedEvent): void {
  let entity = new Unpaused(
    event.transaction.hash.concatI32(event.logIndex.toI32())
  )
  entity.account = event.params.account

  entity.blockNumber = event.block.number
  entity.blockTimestamp = event.block.timestamp
  entity.transactionHash = event.transaction.hash

  entity.save()
}
