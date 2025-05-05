import { newMockEvent } from 'matchstick-as'
import { ethereum, Address, BigInt } from '@graphprotocol/graph-ts'
import {
  BeaconConfigured,
  BeaconProxiesDeployed,
  BeaconProxyDeployed,
  ContractDeployed,
  Initialized,
  OwnershipTransferred,
  Paused,
  Unpaused
} from '../generated/Officer/Officer'

export function createBeaconConfiguredEvent(
  contractType: string,
  beaconAddress: Address
): BeaconConfigured {
  let beaconConfiguredEvent = changetype<BeaconConfigured>(newMockEvent())

  beaconConfiguredEvent.parameters = new Array()

  beaconConfiguredEvent.parameters.push(
    new ethereum.EventParam('contractType', ethereum.Value.fromString(contractType))
  )
  beaconConfiguredEvent.parameters.push(
    new ethereum.EventParam('beaconAddress', ethereum.Value.fromAddress(beaconAddress))
  )

  return beaconConfiguredEvent
}

export function createBeaconProxiesDeployedEvent(
  beaconProxies: Array<Address>
): BeaconProxiesDeployed {
  let beaconProxiesDeployedEvent = changetype<BeaconProxiesDeployed>(newMockEvent())

  beaconProxiesDeployedEvent.parameters = new Array()

  beaconProxiesDeployedEvent.parameters.push(
    new ethereum.EventParam('beaconProxies', ethereum.Value.fromAddressArray(beaconProxies))
  )

  return beaconProxiesDeployedEvent
}

export function createBeaconProxyDeployedEvent(
  proxyAddress: Address,
  contractType: string
): BeaconProxyDeployed {
  let beaconProxyDeployedEvent = changetype<BeaconProxyDeployed>(newMockEvent())

  beaconProxyDeployedEvent.parameters = new Array()

  beaconProxyDeployedEvent.parameters.push(
    new ethereum.EventParam('proxyAddress', ethereum.Value.fromAddress(proxyAddress))
  )
  beaconProxyDeployedEvent.parameters.push(
    new ethereum.EventParam('contractType', ethereum.Value.fromString(contractType))
  )

  return beaconProxyDeployedEvent
}

export function createContractDeployedEvent(
  contractType: string,
  deployedAddress: Address
): ContractDeployed {
  let contractDeployedEvent = changetype<ContractDeployed>(newMockEvent())

  contractDeployedEvent.parameters = new Array()

  contractDeployedEvent.parameters.push(
    new ethereum.EventParam('contractType', ethereum.Value.fromString(contractType))
  )
  contractDeployedEvent.parameters.push(
    new ethereum.EventParam('deployedAddress', ethereum.Value.fromAddress(deployedAddress))
  )

  return contractDeployedEvent
}

export function createInitializedEvent(version: BigInt): Initialized {
  let initializedEvent = changetype<Initialized>(newMockEvent())

  initializedEvent.parameters = new Array()

  initializedEvent.parameters.push(
    new ethereum.EventParam('version', ethereum.Value.fromUnsignedBigInt(version))
  )

  return initializedEvent
}

export function createOwnershipTransferredEvent(
  previousOwner: Address,
  newOwner: Address
): OwnershipTransferred {
  let ownershipTransferredEvent = changetype<OwnershipTransferred>(newMockEvent())

  ownershipTransferredEvent.parameters = new Array()

  ownershipTransferredEvent.parameters.push(
    new ethereum.EventParam('previousOwner', ethereum.Value.fromAddress(previousOwner))
  )
  ownershipTransferredEvent.parameters.push(
    new ethereum.EventParam('newOwner', ethereum.Value.fromAddress(newOwner))
  )

  return ownershipTransferredEvent
}

export function createPausedEvent(account: Address): Paused {
  let pausedEvent = changetype<Paused>(newMockEvent())

  pausedEvent.parameters = new Array()

  pausedEvent.parameters.push(
    new ethereum.EventParam('account', ethereum.Value.fromAddress(account))
  )

  return pausedEvent
}

export function createUnpausedEvent(account: Address): Unpaused {
  let unpausedEvent = changetype<Unpaused>(newMockEvent())

  unpausedEvent.parameters = new Array()

  unpausedEvent.parameters.push(
    new ethereum.EventParam('account', ethereum.Value.fromAddress(account))
  )

  return unpausedEvent
}
