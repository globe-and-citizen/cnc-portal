export const OFFICER_ABI = [
  {
    anonymous: false,
    inputs: [
      {
        indexed: false,
        internalType: "string",
        name: "contractType",
        type: "string",
      },
      {
        indexed: false,
        internalType: "address",
        name: "beaconAddress",
        type: "address",
      },
    ],
    name: "BeaconConfigured",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: false,
        internalType: "address[]",
        name: "beaconProxies",
        type: "address[]",
      },
    ],
    name: "BeaconProxiesDeployed",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: false,
        internalType: "string",
        name: "contractType",
        type: "string",
      },
      {
        indexed: false,
        internalType: "address",
        name: "deployedAddress",
        type: "address",
      },
    ],
    name: "ContractDeployed",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: false,
        internalType: "uint64",
        name: "version",
        type: "uint64",
      },
    ],
    name: "Initialized",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: "address",
        name: "previousOwner",
        type: "address",
      },
      {
        indexed: true,
        internalType: "address",
        name: "newOwner",
        type: "address",
      },
    ],
    name: "OwnershipTransferred",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: false,
        internalType: "address",
        name: "account",
        type: "address",
      },
    ],
    name: "Paused",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: false,
        internalType: "address",
        name: "account",
        type: "address",
      },
    ],
    name: "Unpaused",
    type: "event",
  },
] as const
