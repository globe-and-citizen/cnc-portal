export const CREATE_CALL_ABI = [
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: "address",
        name: "newContract",
        type: "address",
      },
    ],
    name: "ContractCreation",
    type: "event",
  },
] as const;
