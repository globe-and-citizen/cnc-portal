import type { Abi } from 'viem'

export const VESTING_ABI = [
  {
    inputs: [
      {
        internalType: 'address',
        name: 'target',
        type: 'address'
      }
    ],
    name: 'AddressEmptyCode',
    type: 'error'
  },
  {
    inputs: [
      {
        internalType: 'address',
        name: 'account',
        type: 'address'
      }
    ],
    name: 'AddressInsufficientBalance',
    type: 'error'
  },
  {
    inputs: [],
    name: 'EnforcedPause',
    type: 'error'
  },
  {
    inputs: [],
    name: 'ExpectedPause',
    type: 'error'
  },
  {
    inputs: [],
    name: 'FailedInnerCall',
    type: 'error'
  },
  {
    inputs: [],
    name: 'InvalidInitialization',
    type: 'error'
  },
  {
    inputs: [],
    name: 'NotInitializing',
    type: 'error'
  },
  {
    inputs: [
      {
        internalType: 'address',
        name: 'owner',
        type: 'address'
      }
    ],
    name: 'OwnableInvalidOwner',
    type: 'error'
  },
  {
    inputs: [
      {
        internalType: 'address',
        name: 'account',
        type: 'address'
      }
    ],
    name: 'OwnableUnauthorizedAccount',
    type: 'error'
  },
  {
    inputs: [],
    name: 'ReentrancyGuardReentrantCall',
    type: 'error'
  },
  {
    inputs: [
      {
        internalType: 'address',
        name: 'token',
        type: 'address'
      }
    ],
    name: 'SafeERC20FailedOperation',
    type: 'error'
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: false,
        internalType: 'uint64',
        name: 'version',
        type: 'uint64'
      }
    ],
    name: 'Initialized',
    type: 'event'
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: 'address',
        name: 'previousOwner',
        type: 'address'
      },
      {
        indexed: true,
        internalType: 'address',
        name: 'newOwner',
        type: 'address'
      }
    ],
    name: 'OwnershipTransferred',
    type: 'event'
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: false,
        internalType: 'address',
        name: 'account',
        type: 'address'
      }
    ],
    name: 'Paused',
    type: 'event'
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: 'address',
        name: 'member',
        type: 'address'
      },
      {
        indexed: true,
        internalType: 'uint256',
        name: 'teamId',
        type: 'uint256'
      },
      {
        indexed: false,
        internalType: 'uint256',
        name: 'amount',
        type: 'uint256'
      }
    ],
    name: 'TokensReleased',
    type: 'event'
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: false,
        internalType: 'address',
        name: 'account',
        type: 'address'
      }
    ],
    name: 'Unpaused',
    type: 'event'
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: 'address',
        name: 'member',
        type: 'address'
      },
      {
        indexed: true,
        internalType: 'uint256',
        name: 'teamId',
        type: 'uint256'
      },
      {
        indexed: false,
        internalType: 'uint256',
        name: 'amount',
        type: 'uint256'
      }
    ],
    name: 'UnvestedWithdrawn',
    type: 'event'
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: 'address',
        name: 'member',
        type: 'address'
      },
      {
        indexed: true,
        internalType: 'uint256',
        name: 'teamId',
        type: 'uint256'
      },
      {
        indexed: false,
        internalType: 'uint256',
        name: 'amount',
        type: 'uint256'
      }
    ],
    name: 'VestingCreated',
    type: 'event'
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: 'address',
        name: 'member',
        type: 'address'
      },
      {
        indexed: true,
        internalType: 'uint256',
        name: 'teamId',
        type: 'uint256'
      }
    ],
    name: 'VestingStopped',
    type: 'event'
  },
  {
    inputs: [
      {
        internalType: 'uint256',
        name: 'teamId',
        type: 'uint256'
      },
      {
        internalType: 'address',
        name: 'member',
        type: 'address'
      },
      {
        internalType: 'uint64',
        name: 'start',
        type: 'uint64'
      },
      {
        internalType: 'uint64',
        name: 'duration',
        type: 'uint64'
      },
      {
        internalType: 'uint64',
        name: 'cliff',
        type: 'uint64'
      },
      {
        internalType: 'uint256',
        name: 'totalAmount',
        type: 'uint256'
      },
      {
        internalType: 'address',
        name: 'tokenAddress',
        type: 'address'
      }
    ],
    name: 'addVesting',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function'
  },
  {
    inputs: [
      {
        internalType: 'address',
        name: '',
        type: 'address'
      },
      {
        internalType: 'uint256',
        name: '',
        type: 'uint256'
      },
      {
        internalType: 'uint256',
        name: '',
        type: 'uint256'
      }
    ],
    name: 'archivedVestings',
    outputs: [
      {
        internalType: 'uint64',
        name: 'start',
        type: 'uint64'
      },
      {
        internalType: 'uint64',
        name: 'duration',
        type: 'uint64'
      },
      {
        internalType: 'uint64',
        name: 'cliff',
        type: 'uint64'
      },
      {
        internalType: 'uint256',
        name: 'totalAmount',
        type: 'uint256'
      },
      {
        internalType: 'uint256',
        name: 'released',
        type: 'uint256'
      },
      {
        internalType: 'bool',
        name: 'active',
        type: 'bool'
      }
    ],
    stateMutability: 'view',
    type: 'function'
  },
  {
    inputs: [
      {
        internalType: 'uint256',
        name: 'teamId',
        type: 'uint256'
      },
      {
        internalType: 'address',
        name: 'teamOwner',
        type: 'address'
      },
      {
        internalType: 'address',
        name: 'tokenAddress',
        type: 'address'
      }
    ],
    name: 'createTeam',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function'
  },
  {
    inputs: [],
    name: 'getCurrentTimestamp',
    outputs: [
      {
        internalType: 'uint256',
        name: '',
        type: 'uint256'
      }
    ],
    stateMutability: 'view',
    type: 'function'
  },
  {
    inputs: [
      {
        internalType: 'uint256',
        name: 'teamId',
        type: 'uint256'
      }
    ],
    name: 'getTeamAllArchivedVestingsFlat',
    outputs: [
      {
        internalType: 'address[]',
        name: 'members',
        type: 'address[]'
      },
      {
        components: [
          {
            internalType: 'uint64',
            name: 'start',
            type: 'uint64'
          },
          {
            internalType: 'uint64',
            name: 'duration',
            type: 'uint64'
          },
          {
            internalType: 'uint64',
            name: 'cliff',
            type: 'uint64'
          },
          {
            internalType: 'uint256',
            name: 'totalAmount',
            type: 'uint256'
          },
          {
            internalType: 'uint256',
            name: 'released',
            type: 'uint256'
          },
          {
            internalType: 'bool',
            name: 'active',
            type: 'bool'
          }
        ],
        internalType: 'struct Vesting.VestingInfo[]',
        name: 'archivedInfos',
        type: 'tuple[]'
      }
    ],
    stateMutability: 'view',
    type: 'function'
  },
  {
    inputs: [
      {
        internalType: 'uint256',
        name: 'teamId',
        type: 'uint256'
      }
    ],
    name: 'getTeamMembers',
    outputs: [
      {
        internalType: 'address[]',
        name: '',
        type: 'address[]'
      }
    ],
    stateMutability: 'view',
    type: 'function'
  },
  {
    inputs: [
      {
        internalType: 'uint256',
        name: 'teamId',
        type: 'uint256'
      }
    ],
    name: 'getTeamVestingsWithMembers',
    outputs: [
      {
        internalType: 'address[]',
        name: '',
        type: 'address[]'
      },
      {
        components: [
          {
            internalType: 'uint64',
            name: 'start',
            type: 'uint64'
          },
          {
            internalType: 'uint64',
            name: 'duration',
            type: 'uint64'
          },
          {
            internalType: 'uint64',
            name: 'cliff',
            type: 'uint64'
          },
          {
            internalType: 'uint256',
            name: 'totalAmount',
            type: 'uint256'
          },
          {
            internalType: 'uint256',
            name: 'released',
            type: 'uint256'
          },
          {
            internalType: 'bool',
            name: 'active',
            type: 'bool'
          }
        ],
        internalType: 'struct Vesting.VestingInfo[]',
        name: '',
        type: 'tuple[]'
      }
    ],
    stateMutability: 'view',
    type: 'function'
  },
  {
    inputs: [
      {
        internalType: 'address',
        name: 'user',
        type: 'address'
      }
    ],
    name: 'getUserTeams',
    outputs: [
      {
        internalType: 'uint256[]',
        name: '',
        type: 'uint256[]'
      }
    ],
    stateMutability: 'view',
    type: 'function'
  },
  {
    inputs: [],
    name: 'initialize',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function'
  },
  {
    inputs: [
      {
        internalType: 'address',
        name: '',
        type: 'address'
      },
      {
        internalType: 'uint256',
        name: '',
        type: 'uint256'
      }
    ],
    name: 'isUserInTeam',
    outputs: [
      {
        internalType: 'bool',
        name: '',
        type: 'bool'
      }
    ],
    stateMutability: 'view',
    type: 'function'
  },
  {
    inputs: [],
    name: 'owner',
    outputs: [
      {
        internalType: 'address',
        name: '',
        type: 'address'
      }
    ],
    stateMutability: 'view',
    type: 'function'
  },
  {
    inputs: [],
    name: 'pause',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function'
  },
  {
    inputs: [],
    name: 'paused',
    outputs: [
      {
        internalType: 'bool',
        name: '',
        type: 'bool'
      }
    ],
    stateMutability: 'view',
    type: 'function'
  },
  {
    inputs: [
      {
        internalType: 'address',
        name: 'member',
        type: 'address'
      },
      {
        internalType: 'uint256',
        name: 'teamId',
        type: 'uint256'
      }
    ],
    name: 'releasable',
    outputs: [
      {
        internalType: 'uint256',
        name: '',
        type: 'uint256'
      }
    ],
    stateMutability: 'view',
    type: 'function'
  },
  {
    inputs: [
      {
        internalType: 'uint256',
        name: 'teamId',
        type: 'uint256'
      }
    ],
    name: 'release',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function'
  },
  {
    inputs: [],
    name: 'renounceOwnership',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function'
  },
  {
    inputs: [
      {
        internalType: 'address',
        name: 'member',
        type: 'address'
      },
      {
        internalType: 'uint256',
        name: 'teamId',
        type: 'uint256'
      }
    ],
    name: 'stopVesting',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function'
  },
  {
    inputs: [
      {
        internalType: 'uint256',
        name: '',
        type: 'uint256'
      }
    ],
    name: 'teams',
    outputs: [
      {
        internalType: 'address',
        name: 'owner',
        type: 'address'
      },
      {
        internalType: 'address',
        name: 'token',
        type: 'address'
      }
    ],
    stateMutability: 'view',
    type: 'function'
  },
  {
    inputs: [
      {
        internalType: 'address',
        name: 'newOwner',
        type: 'address'
      }
    ],
    name: 'transferOwnership',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function'
  },
  {
    inputs: [],
    name: 'unpause',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function'
  },
  {
    inputs: [
      {
        internalType: 'address',
        name: '',
        type: 'address'
      },
      {
        internalType: 'uint256',
        name: '',
        type: 'uint256'
      }
    ],
    name: 'userTeams',
    outputs: [
      {
        internalType: 'uint256',
        name: '',
        type: 'uint256'
      }
    ],
    stateMutability: 'view',
    type: 'function'
  },
  {
    inputs: [
      {
        internalType: 'address',
        name: 'member',
        type: 'address'
      },
      {
        internalType: 'uint256',
        name: 'teamId',
        type: 'uint256'
      }
    ],
    name: 'vestedAmount',
    outputs: [
      {
        internalType: 'uint256',
        name: '',
        type: 'uint256'
      }
    ],
    stateMutability: 'view',
    type: 'function'
  },
  {
    inputs: [
      {
        internalType: 'address',
        name: '',
        type: 'address'
      },
      {
        internalType: 'uint256',
        name: '',
        type: 'uint256'
      }
    ],
    name: 'vestings',
    outputs: [
      {
        internalType: 'uint64',
        name: 'start',
        type: 'uint64'
      },
      {
        internalType: 'uint64',
        name: 'duration',
        type: 'uint64'
      },
      {
        internalType: 'uint64',
        name: 'cliff',
        type: 'uint64'
      },
      {
        internalType: 'uint256',
        name: 'totalAmount',
        type: 'uint256'
      },
      {
        internalType: 'uint256',
        name: 'released',
        type: 'uint256'
      },
      {
        internalType: 'bool',
        name: 'active',
        type: 'bool'
      }
    ],
    stateMutability: 'view',
    type: 'function'
  }
] as const satisfies Abi
