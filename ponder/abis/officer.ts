export const OFFICER_ABI = [
  {
    inputs: [{ internalType: "address", name: "_feeCollector", type: "address" }],
    stateMutability: "nonpayable",
    type: "constructor",
  },
  {
    anonymous: false,
    inputs: [
      { indexed: false, internalType: "string", name: "contractType", type: "string" },
      { indexed: false, internalType: "address", name: "beaconAddress", type: "address" },
    ],
    name: "BeaconConfigured",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      { indexed: false, internalType: "address[]", name: "beaconProxies", type: "address[]" },
    ],
    name: "BeaconProxiesDeployed",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      { indexed: false, internalType: "string", name: "contractType", type: "string" },
      { indexed: false, internalType: "address", name: "deployedAddress", type: "address" },
    ],
    name: "ContractDeployed",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      { indexed: true, internalType: "address", name: "previousOwner", type: "address" },
      { indexed: true, internalType: "address", name: "newOwner", type: "address" },
    ],
    name: "OwnershipTransferred",
    type: "event",
  },
  {
    inputs: [
      { internalType: "string", name: "contractType", type: "string" },
      { internalType: "address", name: "beaconAddress", type: "address" },
    ],
    name: "configureBeacon",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      { internalType: "string", name: "contractType", type: "string" },
      { internalType: "bytes", name: "initializerData", type: "bytes" },
    ],
    name: "deployBeaconProxy",
    outputs: [{ internalType: "address", name: "", type: "address" }],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [],
    name: "getDeployedContracts",
    outputs: [
      {
        components: [
          { internalType: "string", name: "contractType", type: "string" },
          { internalType: "address", name: "contractAddress", type: "address" },
        ],
        internalType: "struct Officer.DeployedContract[]",
        name: "",
        type: "tuple[]",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "getTeam",
    outputs: [
      {
        components: [
          { internalType: "string", name: "contractType", type: "string" },
          { internalType: "address", name: "contractAddress", type: "address" },
        ],
        internalType: "struct Officer.DeployedContract[]",
        name: "",
        type: "tuple[]",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "owner",
    outputs: [{ internalType: "address", name: "", type: "address" }],
    stateMutability: "view",
    type: "function",
  },
] as const
