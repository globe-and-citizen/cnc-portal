export const SAFE_PROXY_FACTORY_ABI = [
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: "contract SafeProxy",
        name: "proxy",
        type: "address",
      },
      {
        indexed: false,
        internalType: "address",
        name: "singleton",
        type: "address",
      },
    ],
    name: "ProxyCreation",
    type: "event",
  },
] as const;
