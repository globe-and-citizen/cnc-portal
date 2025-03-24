import { BigInt, Bytes, Address } from "@graphprotocol/graph-ts";
import {
  Transfer,
  Deposited,
  TokenTransfer,
  TokenDeposited,
  PushTip,
  PushTokenTip,
  SendTip,
  SendTokenTip,
  TipsAddressChanged,
  TokenAddressChanged,
} from "../generated/schema";
import {
  Transfer as TransferEvent,
  Deposited as DepositedEvent,
  TokenTransfer as TokenTransferEvent,
  TokenDeposited as TokenDepositedEvent,
  PushTip as PushTipEvent,
  PushTokenTip as PushTokenTipEvent,
  SendTip as SendTipEvent,
  SendTokenTip as SendTokenTipEvent,
  TipsAddressChanged as TipsAddressChangedEvent,
  TokenAddressChanged as TokenAddressChangedEvent,
} from "../generated/templates/Bank/Bank";
import { getOrCreateTransaction } from "./utils";

export function handleTransfer(event: TransferEvent): void {
  let id = event.transaction.hash.concatI32(event.logIndex.toI32());
  let transfer = new Transfer(id);
  transfer.from = event.params.sender;
  transfer.to = event.params.to;
  transfer.contractType = "Bank";
  transfer.tokenAddress = Bytes.fromHexString(
    "0x0000000000000000000000000000000000000000"
  ); // ETH
  transfer.amount = event.params.amount;
  transfer.contractAddress = event.address;
  transfer.blockNumber = event.block.number;
  transfer.blockTimestamp = event.block.timestamp;
  transfer.transactionHash = event.transaction.hash;
  transfer.save();

  getOrCreateTransaction(
    event.transaction.hash,
    event.logIndex,
    event.params.sender,
    event.params.to,
    "Bank",
    Bytes.fromHexString("0x0000000000000000000000000000000000000000"),
    event.params.amount,
    event.address,
    "transfer"
  );
}

export function handleDeposited(event: DepositedEvent): void {
  let id = event.transaction.hash.concatI32(event.logIndex.toI32());
  let deposited = new Deposited(id);
  deposited.from = event.params.depositor;
  deposited.to = event.address;
  deposited.contractType = "Bank";
  deposited.amount = event.params.amount;
  deposited.contractAddress = event.address;
  deposited.blockNumber = event.block.number;
  deposited.blockTimestamp = event.block.timestamp;
  deposited.transactionHash = event.transaction.hash;
  deposited.save();

  getOrCreateTransaction(
    event.transaction.hash,
    event.logIndex,
    event.params.depositor,
    event.address,
    "Bank",
    Bytes.fromHexString("0x0000000000000000000000000000000000000000"),
    event.params.amount,
    event.address,
    "deposit"
  );
}

export function handleTokenTransfer(event: TokenTransferEvent): void {
  let id = event.transaction.hash.concatI32(event.logIndex.toI32());
  let transfer = new TokenTransfer(id);
  transfer.from = event.params.sender;
  transfer.to = event.params.to;
  transfer.token = event.params.token;
  transfer.amount = event.params.amount;
  transfer.contractAddress = event.address;
  transfer.blockNumber = event.block.number;
  transfer.blockTimestamp = event.block.timestamp;
  transfer.transactionHash = event.transaction.hash;
  transfer.save();

  getOrCreateTransaction(
    event.transaction.hash,
    event.logIndex,
    event.params.sender,
    event.params.to,
    "Bank",
    event.params.token,
    event.params.amount,
    event.address,
    "transfer"
  );
}

export function handleTokenDeposited(event: TokenDepositedEvent): void {
  let id = event.transaction.hash.concatI32(event.logIndex.toI32());
  let deposited = new TokenDeposited(id);
  deposited.depositor = event.params.depositor;
  deposited.token = event.params.token;
  deposited.amount = event.params.amount;
  deposited.contractAddress = event.address;
  deposited.blockNumber = event.block.number;
  deposited.blockTimestamp = event.block.timestamp;
  deposited.transactionHash = event.transaction.hash;
  deposited.save();

  getOrCreateTransaction(
    event.transaction.hash,
    event.logIndex,
    event.params.depositor,
    event.address,
    "Bank",
    event.params.token,
    event.params.amount,
    event.address,
    "deposit"
  );
}

export function handlePushTip(event: PushTipEvent): void {
  let id = event.transaction.hash.concatI32(event.logIndex.toI32());
  let pushTip = new PushTip(id);
  pushTip.addressWhoPushes = event.params.addressWhoPushes;
  pushTip.teamMembers = event.params.teamMembers;
  pushTip.totalAmount = event.params.totalAmount;
  pushTip.contractAddress = event.address;
  pushTip.blockNumber = event.block.number;
  pushTip.blockTimestamp = event.block.timestamp;
  pushTip.transactionHash = event.transaction.hash;
  pushTip.save();
}

export function handlePushTokenTip(event: PushTokenTipEvent): void {
  let id = event.transaction.hash.concatI32(event.logIndex.toI32());
  let pushTokenTip = new PushTokenTip(id);
  pushTokenTip.addressWhoPushes = event.params.addressWhoPushes;
  pushTokenTip.teamMembers = event.params.teamMembers;
  pushTokenTip.token = event.params.token;
  pushTokenTip.totalAmount = event.params.totalAmount;
  pushTokenTip.contractAddress = event.address;
  pushTokenTip.blockNumber = event.block.number;
  pushTokenTip.blockTimestamp = event.block.timestamp;
  pushTokenTip.transactionHash = event.transaction.hash;
  pushTokenTip.save();
}

export function handleSendTip(event: SendTipEvent): void {
  let id = event.transaction.hash.concatI32(event.logIndex.toI32());
  let sendTip = new SendTip(id);
  sendTip.addressWhoSends = event.params.addressWhoSends;
  sendTip.teamMembers = event.params.teamMembers;
  sendTip.totalAmount = event.params.totalAmount;
  sendTip.contractAddress = event.address;
  sendTip.blockNumber = event.block.number;
  sendTip.blockTimestamp = event.block.timestamp;
  sendTip.transactionHash = event.transaction.hash;
  sendTip.save();
}

export function handleSendTokenTip(event: SendTokenTipEvent): void {
  let id = event.transaction.hash.concatI32(event.logIndex.toI32());
  let sendTokenTip = new SendTokenTip(id);
  sendTokenTip.addressWhoSends = event.params.addressWhoSends;
  sendTokenTip.teamMembers = event.params.teamMembers;
  sendTokenTip.token = event.params.token;
  sendTokenTip.totalAmount = event.params.totalAmount;
  sendTokenTip.contractAddress = event.address;
  sendTokenTip.blockNumber = event.block.number;
  sendTokenTip.blockTimestamp = event.block.timestamp;
  sendTokenTip.transactionHash = event.transaction.hash;
  sendTokenTip.save();
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
