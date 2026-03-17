import { ponder } from "ponder:registry";
import { beaconProxy } from "ponder:schema";

ponder.on("OfficerFactoryBeacon:BeaconProxyCreated", async ({ event, context }) => {
  await context.db.insert(beaconProxy).values({
    address: event.args.proxy,
    deployer: event.args.deployer,
    blockNumber: event.block.number,
    timestamp: Number(event.block.timestamp),
  });
});
