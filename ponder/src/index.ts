import { ponder } from "ponder:registry";
import { team, teamContract } from "ponder:schema";

ponder.on("OfficerFactoryBeacon:BeaconProxyCreated", async ({ event, context }) => {
  await context.db.insert(team).values({
    address: event.args.proxy,
    deployer: event.args.deployer,
    blockNumber: event.block.number,
    timestamp: Number(event.block.timestamp),
  });
});

ponder.on("Officer:ContractDeployed", async ({ event, context }) => {
  await context.db.insert(teamContract).values({
    id: `${event.log.address}-${event.args.contractType}`,
    teamAddress: event.log.address,
    contractType: event.args.contractType,
    contractAddress: event.args.deployedAddress,
    blockNumber: event.block.number,
    timestamp: Number(event.block.timestamp),
  });
});
