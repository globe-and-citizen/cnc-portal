import { createConfig } from "ponder";
import { FACTORY_BEACON_ABI } from "./abis/factory-beacon";

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
      // endBlock: 0x4c0d7ca
    },
  },
});
