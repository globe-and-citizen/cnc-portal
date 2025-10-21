import {
  BeaconConfigured as BeaconConfiguredEvent,
  BeaconProxiesDeployed as BeaconProxiesDeployedEvent,
  ContractDeployed as ContractDeployedEvent,
  Initialized as InitializedEvent,
  OwnershipTransferred as OwnershipTransferredEvent,
  Paused as PausedEvent,
  Unpaused as UnpausedEvent,
} from "../generated/templates/Officer/Officer";
import {
  BeaconConfigured,
  BeaconProxiesDeployed,
  ContractDeployed,
  Initialized,
  OwnershipTransferred,
  Paused,
  Unpaused,
} from "../generated/schema";
import {
  ExpenseAccountEIP712,
  Bank,
  CashRemunerationEIP712,
  InvestorV1,
} from "../generated/templates";
import { Bytes, log } from "@graphprotocol/graph-ts";

export function handleBeaconConfigured(event: BeaconConfiguredEvent): void {
  let entity = new BeaconConfigured(
    event.transaction.hash.concatI32(event.logIndex.toI32())
  );
  entity.contractType = event.params.contractType;
  entity.beaconAddress = event.params.beaconAddress;

  entity.blockNumber = event.block.number;
  entity.blockTimestamp = event.block.timestamp;
  entity.transactionHash = event.transaction.hash;

  entity.save();
}

export function handleBeaconProxiesDeployed(
  event: BeaconProxiesDeployedEvent
): void {
  let entity = new BeaconProxiesDeployed(
    event.transaction.hash.concatI32(event.logIndex.toI32())
  );
  entity.beaconProxies = changetype<Bytes[]>(event.params.beaconProxies);

  entity.blockNumber = event.block.number;
  entity.blockTimestamp = event.block.timestamp;
  entity.transactionHash = event.transaction.hash;

  entity.save();
}

export function handleContractDeployed(event: ContractDeployedEvent): void {
  if (event.params.contractType == "ExpenseAccountEIP712") {
    log.info("Creating ExpenseAccountEIP712 template for address: {}", [
      event.params.deployedAddress.toHexString(),
    ]);
    ExpenseAccountEIP712.create(event.params.deployedAddress);
  } else if (event.params.contractType == "Bank") {
    log.info("Creating Bank template for address: {}", [
      event.params.deployedAddress.toHexString(),
    ]);
    Bank.create(event.params.deployedAddress);
  } else if (event.params.contractType == "CashRemunerationEIP712") {
    log.info("Creating CashRemunerationEIP712 template for address: {}", [
      event.params.deployedAddress.toHexString(),
    ]);
    CashRemunerationEIP712.create(event.params.deployedAddress);
  } else if (event.params.contractType == "InvestorV1") {
    // Add this condition
    log.info("Creating InvestorV1 template for address: {}", [
      event.params.deployedAddress.toHexString(),
    ]);
    InvestorV1.create(event.params.deployedAddress);
  } else {
    log.info(
      "Contract deployed is not 'ExpenseAccountEIP712' or 'Bank' or 'CashRemunerationEIP712' or 'InvestorV1' but, '{}'",
      [event.params.contractType]
    );
  }

  // let entity = new ContractDeployed(event.transaction.hash.concatI32(event.logIndex.toI32()))
  let entity = new ContractDeployed(event.params.deployedAddress);
  const deployedAddress = event.params.deployedAddress;
  const contractType = event.params.contractType;

  entity.contractType = contractType;
  entity.deployedAddress = deployedAddress;

  entity.blockNumber = event.block.number;
  entity.blockTimestamp = event.block.timestamp;
  entity.transactionHash = event.transaction.hash;

  entity.save();
}

export function handleInitialized(event: InitializedEvent): void {
  let entity = new Initialized(
    event.transaction.hash.concatI32(event.logIndex.toI32())
  );
  entity.version = event.params.version;

  entity.blockNumber = event.block.number;
  entity.blockTimestamp = event.block.timestamp;
  entity.transactionHash = event.transaction.hash;

  entity.save();
}

export function handleOwnershipTransferred(
  event: OwnershipTransferredEvent
): void {
  let entity = new OwnershipTransferred(
    event.transaction.hash.concatI32(event.logIndex.toI32())
  );
  entity.previousOwner = event.params.previousOwner;
  entity.newOwner = event.params.newOwner;

  entity.blockNumber = event.block.number;
  entity.blockTimestamp = event.block.timestamp;
  entity.transactionHash = event.transaction.hash;

  entity.save();
}

export function handlePaused(event: PausedEvent): void {
  let entity = new Paused(
    event.transaction.hash.concatI32(event.logIndex.toI32())
  );
  entity.account = event.params.account;

  entity.blockNumber = event.block.number;
  entity.blockTimestamp = event.block.timestamp;
  entity.transactionHash = event.transaction.hash;

  entity.save();
}

export function handleUnpaused(event: UnpausedEvent): void {
  let entity = new Unpaused(
    event.transaction.hash.concatI32(event.logIndex.toI32())
  );
  entity.account = event.params.account;

  entity.blockNumber = event.block.number;
  entity.blockTimestamp = event.block.timestamp;
  entity.transactionHash = event.transaction.hash;

  entity.save();
}
