import { createConfig, factory } from "ponder";
import { parseAbiItem } from "viem";
import { FACTORY_BEACON_ABI } from "./abis/factory-beacon";
import { OFFICER_ABI } from "./abis/officer";

export default createConfig({
  chains: {
    polygon: {
      id: 137,
      rpc: process.env.PONDER_RPC_URL_137,
    },
  },
  contracts: {
    OfficerFactoryBeacon: {
      chain: "polygon",
      abi: FACTORY_BEACON_ABI,
      address: "0x0205fd32175241aA6f7398073b64bC03f910a6A0",
      startBlock: 79743826,
    },
    Officer: {
      chain: "polygon",
      abi: OFFICER_ABI,
      address: factory({
        address: "0x0205fd32175241aA6f7398073b64bC03f910a6A0",
        event: parseAbiItem(
          "event BeaconProxyCreated(address indexed proxy, address indexed deployer)"
        ),
        parameter: "proxy",
      }),
      startBlock: 79743826,
    },
  },
});
