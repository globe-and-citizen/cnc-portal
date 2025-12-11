import type { Abi } from 'viem'

export const EXPENSE_ACCOUNT_EIP712_ABI = [
  {
    inputs: [
      {
        internalType: 'uint256',
        name: 'amount',
        type: 'uint256'
      }
    ],
    name: 'AmountPerPeriodExceeded',
    type: 'error'
  },
  {
    inputs: [
      {
        internalType: 'uint256',
        name: 'amount',
        type: 'uint256'
      }
    ],
    name: 'AmountPerTransactionExceeded',
    type: 'error'
  },
  {
    inputs: [
      {
        internalType: 'uint256',
        name: 'currentTime',
        type: 'uint256'
      },
      {
        internalType: 'uint256',
        name: 'endDate',
        type: 'uint256'
      }
    ],
    name: 'ApprovalExpired',
    type: 'error'
  },
  {
    inputs: [
      {
        internalType: 'uint256',
        name: 'currentTime',
        type: 'uint256'
      },
      {
        internalType: 'uint256',
        name: 'startDate',
        type: 'uint256'
      }
    ],
    name: 'ApprovalNotActive',
    type: 'error'
  },
  {
    inputs: [],
    name: 'ECDSAInvalidSignature',
    type: 'error'
  },
  {
    inputs: [
      {
        internalType: 'uint256',
        name: 'length',
        type: 'uint256'
      }
    ],
    name: 'ECDSAInvalidSignatureLength',
    type: 'error'
  },
  {
    inputs: [
      {
        internalType: 'bytes32',
        name: 's',
        type: 'bytes32'
      }
    ],
    name: 'ECDSAInvalidSignatureS',
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
    name: 'FailedCall',
    type: 'error'
  },
  {
    inputs: [
      {
        internalType: 'uint256',
        name: 'balance',
        type: 'uint256'
      },
      {
        internalType: 'uint256',
        name: 'needed',
        type: 'uint256'
      }
    ],
    name: 'InsufficientBalance',
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
        name: 'expected',
        type: 'address'
      },
      {
        internalType: 'address',
        name: 'received',
        type: 'address'
      }
    ],
    name: 'UnauthorizedAccess',
    type: 'error'
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: 'bytes32',
        name: 'signatureHash',
        type: 'bytes32'
      }
    ],
    name: 'ApprovalActivated',
    type: 'event'
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: 'bytes32',
        name: 'signatureHash',
        type: 'bytes32'
      }
    ],
    name: 'ApprovalDeactivated',
    type: 'event'
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: 'address',
        name: 'depositor',
        type: 'address'
      },
      {
        indexed: false,
        internalType: 'uint256',
        name: 'amount',
        type: 'uint256'
      }
    ],
    name: 'Deposited',
    type: 'event'
  },
  {
    anonymous: false,
    inputs: [],
    name: 'EIP712DomainChanged',
    type: 'event'
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
        name: 'addressWhoChanged',
        type: 'address'
      },
      {
        indexed: false,
        internalType: 'string',
        name: 'tokenSymbol',
        type: 'string'
      },
      {
        indexed: true,
        internalType: 'address',
        name: 'oldAddress',
        type: 'address'
      },
      {
        indexed: true,
        internalType: 'address',
        name: 'newAddress',
        type: 'address'
      }
    ],
    name: 'TokenAddressChanged',
    type: 'event'
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: 'address',
        name: 'depositor',
        type: 'address'
      },
      {
        indexed: true,
        internalType: 'address',
        name: 'token',
        type: 'address'
      },
      {
        indexed: false,
        internalType: 'uint256',
        name: 'amount',
        type: 'uint256'
      }
    ],
    name: 'TokenDeposited',
    type: 'event'
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: 'address',
        name: 'withdrawer',
        type: 'address'
      },
      {
        indexed: true,
        internalType: 'address',
        name: 'to',
        type: 'address'
      },
      {
        indexed: true,
        internalType: 'address',
        name: 'token',
        type: 'address'
      },
      {
        indexed: false,
        internalType: 'uint256',
        name: 'amount',
        type: 'uint256'
      }
    ],
    name: 'TokenTransfer',
    type: 'event'
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: 'address',
        name: 'withdrawer',
        type: 'address'
      },
      {
        indexed: true,
        internalType: 'address',
        name: 'to',
        type: 'address'
      },
      {
        indexed: false,
        internalType: 'uint256',
        name: 'amount',
        type: 'uint256'
      }
    ],
    name: 'Transfer',
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
        internalType: 'bytes32',
        name: 'signatureHash',
        type: 'bytes32'
      }
    ],
    name: 'activateApproval',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function'
  },
  {
    inputs: [
      {
        components: [
          {
            internalType: 'uint256',
            name: 'amount',
            type: 'uint256'
          },
          {
            internalType: 'enum ExpenseAccountEIP712.FrequencyType',
            name: 'frequencyType',
            type: 'uint8'
          },
          {
            internalType: 'uint256',
            name: 'customFrequency',
            type: 'uint256'
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
            name: 'tokenAddress',
            type: 'address'
          },
          {
            internalType: 'address',
            name: 'approvedAddress',
            type: 'address'
          }
        ],
        internalType: 'struct ExpenseAccountEIP712.BudgetLimit',
        name: 'budgetLimit',
        type: 'tuple'
      }
    ],
    name: 'budgetLimitHash',
    outputs: [
      {
        internalType: 'bytes32',
        name: '',
        type: 'bytes32'
      }
    ],
    stateMutability: 'pure',
    type: 'function'
  },
  {
    inputs: [
      {
        internalType: 'string',
        name: 'symbol',
        type: 'string'
      },
      {
        internalType: 'address',
        name: 'newAddress',
        type: 'address'
      }
    ],
    name: 'changeTokenAddress',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function'
  },
  {
    inputs: [
      {
        internalType: 'bytes32',
        name: 'signatureHash',
        type: 'bytes32'
      }
    ],
    name: 'deactivateApproval',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function'
  },
  {
    inputs: [
      {
        internalType: 'address',
        name: 'token',
        type: 'address'
      },
      {
        internalType: 'uint256',
        name: 'amount',
        type: 'uint256'
      }
    ],
    name: 'depositToken',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function'
  },
  {
    inputs: [],
    name: 'eip712Domain',
    outputs: [
      {
        internalType: 'bytes1',
        name: 'fields',
        type: 'bytes1'
      },
      {
        internalType: 'string',
        name: 'name',
        type: 'string'
      },
      {
        internalType: 'string',
        name: 'version',
        type: 'string'
      },
      {
        internalType: 'uint256',
        name: 'chainId',
        type: 'uint256'
      },
      {
        internalType: 'address',
        name: 'verifyingContract',
        type: 'address'
      },
      {
        internalType: 'bytes32',
        name: 'salt',
        type: 'bytes32'
      },
      {
        internalType: 'uint256[]',
        name: 'extensions',
        type: 'uint256[]'
      }
    ],
    stateMutability: 'view',
    type: 'function'
  },
  {
    inputs: [
      {
        internalType: 'bytes32',
        name: '',
        type: 'bytes32'
      }
    ],
    name: 'expenseBalances',
    outputs: [
      {
        internalType: 'uint256',
        name: 'lastWithdrawnDate',
        type: 'uint256'
      },
      {
        internalType: 'uint256',
        name: 'totalWithdrawn',
        type: 'uint256'
      },
      {
        internalType: 'uint256',
        name: 'lastWithdrawnPeriod',
        type: 'uint256'
      },
      {
        internalType: 'enum ExpenseAccountEIP712.ApprovalState',
        name: 'state',
        type: 'uint8'
      }
    ],
    stateMutability: 'view',
    type: 'function'
  },
  {
    inputs: [],
    name: 'getBalance',
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
        components: [
          {
            internalType: 'uint256',
            name: 'amount',
            type: 'uint256'
          },
          {
            internalType: 'enum ExpenseAccountEIP712.FrequencyType',
            name: 'frequencyType',
            type: 'uint8'
          },
          {
            internalType: 'uint256',
            name: 'customFrequency',
            type: 'uint256'
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
            name: 'tokenAddress',
            type: 'address'
          },
          {
            internalType: 'address',
            name: 'approvedAddress',
            type: 'address'
          }
        ],
        internalType: 'struct ExpenseAccountEIP712.BudgetLimit',
        name: 'budgetLimit',
        type: 'tuple'
      }
    ],
    name: 'getCurrentPeriod',
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
        components: [
          {
            internalType: 'uint256',
            name: 'amount',
            type: 'uint256'
          },
          {
            internalType: 'enum ExpenseAccountEIP712.FrequencyType',
            name: 'frequencyType',
            type: 'uint8'
          },
          {
            internalType: 'uint256',
            name: 'customFrequency',
            type: 'uint256'
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
            name: 'tokenAddress',
            type: 'address'
          },
          {
            internalType: 'address',
            name: 'approvedAddress',
            type: 'address'
          }
        ],
        internalType: 'struct ExpenseAccountEIP712.BudgetLimit',
        name: 'budgetLimit',
        type: 'tuple'
      },
      {
        internalType: 'uint256',
        name: 'timestamp',
        type: 'uint256'
      }
    ],
    name: 'getPeriod',
    outputs: [
      {
        internalType: 'uint256',
        name: '',
        type: 'uint256'
      }
    ],
    stateMutability: 'pure',
    type: 'function'
  },
  {
    inputs: [
      {
        internalType: 'address',
        name: 'token',
        type: 'address'
      }
    ],
    name: 'getTokenBalance',
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
        name: 'owner',
        type: 'address'
      },
      {
        internalType: 'address',
        name: '_usdtAddress',
        type: 'address'
      },
      {
        internalType: 'address',
        name: '_usdcAddress',
        type: 'address'
      }
    ],
    name: 'initialize',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function'
  },
  {
    inputs: [
      {
        components: [
          {
            internalType: 'uint256',
            name: 'amount',
            type: 'uint256'
          },
          {
            internalType: 'enum ExpenseAccountEIP712.FrequencyType',
            name: 'frequencyType',
            type: 'uint8'
          },
          {
            internalType: 'uint256',
            name: 'customFrequency',
            type: 'uint256'
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
            name: 'tokenAddress',
            type: 'address'
          },
          {
            internalType: 'address',
            name: 'approvedAddress',
            type: 'address'
          }
        ],
        internalType: 'struct ExpenseAccountEIP712.BudgetLimit',
        name: 'budgetLimit',
        type: 'tuple'
      },
      {
        internalType: 'bytes32',
        name: 'signatureHash',
        type: 'bytes32'
      }
    ],
    name: 'isNewPeriod',
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
        name: '_token',
        type: 'address'
      }
    ],
    name: 'isTokenSupported',
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
    inputs: [],
    name: 'renounceOwnership',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function'
  },
  {
    inputs: [
      {
        internalType: 'string',
        name: '',
        type: 'string'
      }
    ],
    name: 'supportedTokens',
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
    inputs: [
      {
        internalType: 'address',
        name: 'to',
        type: 'address'
      },
      {
        internalType: 'uint256',
        name: 'amount',
        type: 'uint256'
      },
      {
        components: [
          {
            internalType: 'uint256',
            name: 'amount',
            type: 'uint256'
          },
          {
            internalType: 'enum ExpenseAccountEIP712.FrequencyType',
            name: 'frequencyType',
            type: 'uint8'
          },
          {
            internalType: 'uint256',
            name: 'customFrequency',
            type: 'uint256'
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
            name: 'tokenAddress',
            type: 'address'
          },
          {
            internalType: 'address',
            name: 'approvedAddress',
            type: 'address'
          }
        ],
        internalType: 'struct ExpenseAccountEIP712.BudgetLimit',
        name: 'budgetLimit',
        type: 'tuple'
      },
      {
        internalType: 'bytes',
        name: 'signature',
        type: 'bytes'
      }
    ],
    name: 'transfer',
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
        components: [
          {
            internalType: 'uint256',
            name: 'amount',
            type: 'uint256'
          },
          {
            internalType: 'enum ExpenseAccountEIP712.FrequencyType',
            name: 'frequencyType',
            type: 'uint8'
          },
          {
            internalType: 'uint256',
            name: 'customFrequency',
            type: 'uint256'
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
            name: 'tokenAddress',
            type: 'address'
          },
          {
            internalType: 'address',
            name: 'approvedAddress',
            type: 'address'
          }
        ],
        internalType: 'struct ExpenseAccountEIP712.BudgetLimit',
        name: 'budgetLimit',
        type: 'tuple'
      },
      {
        internalType: 'uint256',
        name: 'amount',
        type: 'uint256'
      },
      {
        internalType: 'bytes32',
        name: 'signatureHash',
        type: 'bytes32'
      }
    ],
    name: 'validateTransfer',
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
    stateMutability: 'payable',
    type: 'receive'
  }
] as const satisfies Abi
