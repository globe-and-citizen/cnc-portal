import { Address } from "@graphprotocol/graph-ts";
import {
  SendTip,
  SendTokenTip,
  TipsAddressChanged,
  TokenAddressChanged,
  Transaction,
} from "../generated/schema";
import {
  Transfer as TransferEvent,
  Deposited as DepositedEvent,
  TokenTransfer as TokenTransferEvent,
  TokenDeposited as TokenDepositedEvent,
  PushTip as PushTipEvent,
  SendTip as SendTipEvent,
  SendTokenTip as SendTokenTipEvent,
  TipsAddressChanged as TipsAddressChangedEvent,
  TokenAddressChanged as TokenAddressChangedEvent,
} from "../generated/templates/Bank/Bank";

export function handleTransfer(event: TransferEvent): void {
  let entity = new Transaction(
    event.transaction.hash.concatI32(event.logIndex.toI32())
  );
  entity.from = event.params.sender;
  entity.to = event.params.to;
  entity.amount = event.params.amount;

  entity.contractType = "Bank";
  entity.contractAddress = event.address;
  entity.transactionType = "transfer";
  entity.tokenAddress = Address.zero();

  entity.blockNumber = event.block.number;
  entity.blockTimestamp = event.block.timestamp;
  entity.transactionHash = event.transaction.hash;

  entity.save();
}

export function handleDeposited(event: DepositedEvent): void {
  let entity = new Transaction(
    event.transaction.hash.concatI32(event.logIndex.toI32())
  );
  entity.from = event.params.depositor;
  entity.to = event.address;
  entity.amount = event.params.amount;

  entity.contractType = "Bank";
  entity.contractAddress = event.address;
  entity.transactionType = "deposit";
  entity.tokenAddress = Address.zero();

  entity.blockNumber = event.block.number;
  entity.blockTimestamp = event.block.timestamp;
  entity.transactionHash = event.transaction.hash;

  entity.save();
}

export function handlePushTip(event: PushTipEvent): void {
  let entity = new Transaction(
    event.transaction.hash.concatI32(event.logIndex.toI32())
  );
  entity.from = event.params.addressWhoPushes;
  entity.to = event.address;
  entity.amount = event.params.totalAmount;

  entity.contractType = "Bank";
  entity.contractAddress = event.address;
  entity.transactionType = "pushTip";
  entity.tokenAddress = Address.zero();
}

export function handleTokenTransfer(event: TokenTransferEvent): void {
  let entity = new Transaction(
    event.transaction.hash.concatI32(event.logIndex.toI32())
  );
  entity.from = event.params.sender;
  entity.to = event.params.to;
  entity.amount = event.params.amount;

  entity.contractType = "Bank";
  entity.contractAddress = event.address;
  entity.transactionType = "transfer";
  entity.tokenAddress = event.params.token;

  entity.blockNumber = event.block.number;
  entity.blockTimestamp = event.block.timestamp;
  entity.transactionHash = event.transaction.hash;

  entity.save();
}

export function handleTokenDeposited(event: TokenDepositedEvent): void {
  let entity = new Transaction(
    event.transaction.hash.concatI32(event.logIndex.toI32())
  );
  entity.from = event.params.depositor;
  entity.to = event.address;
  entity.amount = event.params.amount;

  entity.contractType = "Bank";
  entity.contractAddress = event.address;
  entity.transactionType = "deposit";
  entity.tokenAddress = event.params.token;

  entity.blockNumber = event.block.number;
  entity.blockTimestamp = event.block.timestamp;
  entity.transactionHash = event.transaction.hash;

  entity.save();
}

export function handleTipsAddressChanged(event: TipsAddressChangedEvent): void {
  let id = event.transaction.hash.concatI32(event.logIndex.toI32());
  let tipsAddressChanged = new TipsAddressChanged(id);
  tipsAddressChanged.addressWhoChanged = event.params.addressWhoChanged;
  tipsAddressChanged.oldAddress = event.params.oldAddress;
  tipsAddressChanged.newAddress = event.params.newAddress;
  tipsAddressChanged.contractAddress = event.address;
  tipsAddressChanged.blockNumber = event.block.number;
  tipsAddressChanged.blockTimestamp = event.block.timestamp;
  tipsAddressChanged.transactionHash = event.transaction.hash;
  tipsAddressChanged.save();
}

export function handleTokenAddressChanged(
  event: TokenAddressChangedEvent
): void {
  let id = event.transaction.hash.concatI32(event.logIndex.toI32());
  let tokenAddressChanged = new TokenAddressChanged(id);
  tokenAddressChanged.addressWhoChanged = event.params.addressWhoChanged;
  tokenAddressChanged.tokenSymbol = event.params.tokenSymbol;
  tokenAddressChanged.oldAddress = event.params.oldAddress;
  tokenAddressChanged.newAddress = event.params.newAddress;
  tokenAddressChanged.contractAddress = event.address;
  tokenAddressChanged.blockNumber = event.block.number;
  tokenAddressChanged.blockTimestamp = event.block.timestamp;
  tokenAddressChanged.transactionHash = event.transaction.hash;
  tokenAddressChanged.save();
}
