import type { Abi } from 'viem'

export const PROPOSALS_ABI = [
  {
    inputs: [],
    name: 'BoardOfDirectorAddressNotSet',
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
    name: 'InvalidInitialization',
    type: 'error'
  },
  {
    inputs: [],
    name: 'InvalidProposalContent',
    type: 'error'
  },
  {
    inputs: [],
    name: 'InvalidProposalDates',
    type: 'error'
  },
  {
    inputs: [],
    name: 'InvalidVote',
    type: 'error'
  },
  {
    inputs: [],
    name: 'NoBoardMembers',
    type: 'error'
  },
  {
    inputs: [],
    name: 'NotAllowed',
    type: 'error'
  },
  {
    inputs: [],
    name: 'NotInitializing',
    type: 'error'
  },
  {
    inputs: [],
    name: 'OnlyBoardMember',
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
    name: 'ProposalAlreadyVoted',
    type: 'error'
  },
  {
    inputs: [],
    name: 'ProposalNotFound',
    type: 'error'
  },
  {
    inputs: [],
    name: 'ProposalVotingEnded',
    type: 'error'
  },
  {
    inputs: [],
    name: 'ProposalVotingNotStarted',
    type: 'error'
  },
  {
    inputs: [],
    name: 'ReentrancyGuardReentrantCall',
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
        internalType: 'uint256',
        name: 'proposalId',
        type: 'uint256'
      },
      {
        indexed: false,
        internalType: 'string',
        name: 'title',
        type: 'string'
      },
      {
        indexed: true,
        internalType: 'address',
        name: 'creator',
        type: 'address'
      },
      {
        indexed: false,
        internalType: 'uint256',
        name: 'startDate',
        type: 'uint256'
      },
      {
        indexed: false,
        internalType: 'uint256',
        name: 'endDate',
        type: 'uint256'
      }
    ],
    name: 'ProposalCreated',
    type: 'event'
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: 'uint256',
        name: 'proposalId',
        type: 'uint256'
      },
      {
        indexed: false,
        internalType: 'enum Proposals.ProposalState',
        name: 'state',
        type: 'uint8'
      },
      {
        indexed: false,
        internalType: 'uint256',
        name: 'yesCount',
        type: 'uint256'
      },
      {
        indexed: false,
        internalType: 'uint256',
        name: 'noCount',
        type: 'uint256'
      },
      {
        indexed: false,
        internalType: 'uint256',
        name: 'abstainCount',
        type: 'uint256'
      }
    ],
    name: 'ProposalTallyResults',
    type: 'event'
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: 'uint256',
        name: 'proposalId',
        type: 'uint256'
      },
      {
        indexed: true,
        internalType: 'address',
        name: 'voter',
        type: 'address'
      },
      {
        indexed: false,
        internalType: 'enum Proposals.VoteOption',
        name: 'vote',
        type: 'uint8'
      },
      {
        indexed: false,
        internalType: 'uint256',
        name: 'timestamp',
        type: 'uint256'
      }
    ],
    name: 'ProposalVoted',
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
    inputs: [
      {
        internalType: 'uint256',
        name: 'proposalId',
        type: 'uint256'
      },
      {
        internalType: 'enum Proposals.VoteOption',
        name: 'vote',
        type: 'uint8'
      }
    ],
    name: 'castVote',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function'
  },
  {
    inputs: [
      {
        internalType: 'string',
        name: 'title',
        type: 'string'
      },
      {
        internalType: 'string',
        name: 'description',
        type: 'string'
      },
      {
        internalType: 'string',
        name: 'proposalType',
        type: 'string'
      },
      {
        internalType: 'uint256',
        name: 'startDate',
        type: 'uint256'
      },
      {
        internalType: 'uint256',
        name: 'endDate',
        type: 'uint256'
      }
    ],
    name: 'createProposal',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function'
  },
  {
    inputs: [],
    name: 'getBoardOfDirectors',
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
        name: 'proposalId',
        type: 'uint256'
      }
    ],
    name: 'getProposal',
    outputs: [
      {
        components: [
          {
            internalType: 'uint256',
            name: 'id',
            type: 'uint256'
          },
          {
            internalType: 'string',
            name: 'title',
            type: 'string'
          },
          {
            internalType: 'string',
            name: 'description',
            type: 'string'
          },
          {
            internalType: 'string',
            name: 'proposalType',
            type: 'string'
          },
          {
            internalType: 'uint256',
            name: 'startDate',
            type: 'uint256'
          },
          {
            internalType: 'uint256',
            name: 'endDate',
            type: 'uint256'
          },
          {
            internalType: 'address',
            name: 'creator',
            type: 'address'
          },
          {
            internalType: 'uint256',
            name: 'voteCount',
            type: 'uint256'
          },
          {
            internalType: 'uint256',
            name: 'totalVoters',
            type: 'uint256'
          },
          {
            internalType: 'uint256',
            name: 'yesCount',
            type: 'uint256'
          },
          {
            internalType: 'uint256',
            name: 'noCount',
            type: 'uint256'
          },
          {
            internalType: 'uint256',
            name: 'abstainCount',
            type: 'uint256'
          },
          {
            internalType: 'enum Proposals.ProposalState',
            name: 'state',
            type: 'uint8'
          }
        ],
        internalType: 'struct Proposals.ProposalView',
        name: '',
        type: 'tuple'
      }
    ],
    stateMutability: 'view',
    type: 'function'
  },
  {
    inputs: [
      {
        internalType: 'uint256',
        name: 'proposalId',
        type: 'uint256'
      },
      {
        internalType: 'address',
        name: 'voter',
        type: 'address'
      }
    ],
    name: 'hasVoted',
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
        name: '_owner',
        type: 'address'
      }
    ],
    name: 'initialize',
    outputs: [],
    stateMutability: 'nonpayable',
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
        name: '_boardOfDirectorsContractAddress',
        type: 'address'
      }
    ],
    name: 'setBoardOfDirectorsContractAddress',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function'
  },
  {
    inputs: [
      {
        internalType: 'uint256',
        name: 'proposalId',
        type: 'uint256'
      }
    ],
    name: 'tallyResults',
    outputs: [],
    stateMutability: 'nonpayable',
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
  }
] as const satisfies Abi
