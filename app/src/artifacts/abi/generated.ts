//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// AdCampaignManager
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

export const adCampaignManagerAbi = [
  {
    type: 'constructor',
    inputs: [
      { name: 'costPerClick', internalType: 'uint256', type: 'uint256' },
      { name: 'costPerImpression', internalType: 'uint256', type: 'uint256' },
      { name: 'bankContractAddress', internalType: 'address', type: 'address' }
    ],
    stateMutability: 'nonpayable'
  },
  {
    type: 'error',
    inputs: [],
    name: 'AdCampaignManager__AdvertiserTransferFailed'
  },
  {
    type: 'error',
    inputs: [{ name: 'admin', internalType: 'address', type: 'address' }],
    name: 'AdCampaignManager__AlreadyAdmin'
  },
  { type: 'error', inputs: [], name: 'AdCampaignManager__BankTransferFailed' },
  { type: 'error', inputs: [], name: 'AdCampaignManager__CampaignNotActive' },
  {
    type: 'error',
    inputs: [
      { name: 'required', internalType: 'uint256', type: 'uint256' },
      { name: 'available', internalType: 'uint256', type: 'uint256' }
    ],
    name: 'AdCampaignManager__InsufficientContractBalance'
  },
  { type: 'error', inputs: [], name: 'AdCampaignManager__InvalidCampaignCode' },
  {
    type: 'error',
    inputs: [{ name: 'caller', internalType: 'address', type: 'address' }],
    name: 'AdCampaignManager__NotAdminOrOwner'
  },
  {
    type: 'error',
    inputs: [{ name: 'admin', internalType: 'address', type: 'address' }],
    name: 'AdCampaignManager__NotAnAdmin'
  },
  {
    type: 'error',
    inputs: [{ name: 'caller', internalType: 'address', type: 'address' }],
    name: 'AdCampaignManager__NotAuthorizedWithdrawer'
  },
  {
    type: 'error',
    inputs: [],
    name: 'AdCampaignManager__SpentLessThanClaimed'
  },
  { type: 'error', inputs: [], name: 'AdCampaignManager__ZeroAddress' },
  { type: 'error', inputs: [], name: 'AdCampaignManager__ZeroAmount' },
  { type: 'error', inputs: [], name: 'EnforcedPause' },
  { type: 'error', inputs: [], name: 'ExpectedPause' },
  {
    type: 'error',
    inputs: [{ name: 'owner', internalType: 'address', type: 'address' }],
    name: 'OwnableInvalidOwner'
  },
  {
    type: 'error',
    inputs: [{ name: 'account', internalType: 'address', type: 'address' }],
    name: 'OwnableUnauthorizedAccount'
  },
  { type: 'error', inputs: [], name: 'ReentrancyGuardReentrantCall' },
  {
    type: 'event',
    anonymous: false,
    inputs: [
      {
        name: 'campaignCode',
        internalType: 'string',
        type: 'string',
        indexed: false
      },
      {
        name: 'budget',
        internalType: 'uint256',
        type: 'uint256',
        indexed: false
      }
    ],
    name: 'AdCampaignCreated'
  },
  {
    type: 'event',
    anonymous: false,
    inputs: [
      {
        name: 'admin',
        internalType: 'address',
        type: 'address',
        indexed: true
      }
    ],
    name: 'AdminAdded'
  },
  {
    type: 'event',
    anonymous: false,
    inputs: [
      {
        name: 'admin',
        internalType: 'address',
        type: 'address',
        indexed: true
      }
    ],
    name: 'AdminRemoved'
  },
  {
    type: 'event',
    anonymous: false,
    inputs: [
      {
        name: 'campaignCode',
        internalType: 'string',
        type: 'string',
        indexed: false
      },
      {
        name: 'advertiser',
        internalType: 'address',
        type: 'address',
        indexed: false
      },
      {
        name: 'amount',
        internalType: 'uint256',
        type: 'uint256',
        indexed: false
      }
    ],
    name: 'BudgetWithdrawn'
  },
  {
    type: 'event',
    anonymous: false,
    inputs: [
      {
        name: 'previousOwner',
        internalType: 'address',
        type: 'address',
        indexed: true
      },
      {
        name: 'newOwner',
        internalType: 'address',
        type: 'address',
        indexed: true
      }
    ],
    name: 'OwnershipTransferred'
  },
  {
    type: 'event',
    anonymous: false,
    inputs: [
      {
        name: 'account',
        internalType: 'address',
        type: 'address',
        indexed: false
      }
    ],
    name: 'Paused'
  },
  {
    type: 'event',
    anonymous: false,
    inputs: [
      {
        name: 'campaignCode',
        internalType: 'string',
        type: 'string',
        indexed: false
      },
      {
        name: 'paymentAmount',
        internalType: 'uint256',
        type: 'uint256',
        indexed: false
      }
    ],
    name: 'PaymentReleased'
  },
  {
    type: 'event',
    anonymous: false,
    inputs: [
      {
        name: 'campaignCode',
        internalType: 'string',
        type: 'string',
        indexed: false
      },
      {
        name: 'paymentAmount',
        internalType: 'uint256',
        type: 'uint256',
        indexed: false
      }
    ],
    name: 'PaymentReleasedOnWithdrawApproval'
  },
  {
    type: 'event',
    anonymous: false,
    inputs: [
      {
        name: 'account',
        internalType: 'address',
        type: 'address',
        indexed: false
      }
    ],
    name: 'Unpaused'
  },
  {
    type: 'function',
    inputs: [{ name: 'admin', internalType: 'address', type: 'address' }],
    name: 'addAdmin',
    outputs: [],
    stateMutability: 'nonpayable'
  },
  {
    type: 'function',
    inputs: [
      { name: 'campaignCode', internalType: 'string', type: 'string' },
      { name: 'currentAmountSpent', internalType: 'uint256', type: 'uint256' }
    ],
    name: 'claimPayment',
    outputs: [],
    stateMutability: 'nonpayable'
  },
  {
    type: 'function',
    inputs: [],
    name: 'createAdCampaign',
    outputs: [],
    stateMutability: 'payable'
  },
  {
    type: 'function',
    inputs: [{ name: 'campaignCode', internalType: 'string', type: 'string' }],
    name: 'getAdCampaignByCode',
    outputs: [
      {
        name: '',
        internalType: 'struct AdCampaignManager.AdCampaign',
        type: 'tuple',
        components: [
          { name: 'budget', internalType: 'uint256', type: 'uint256' },
          { name: 'amountSpent', internalType: 'uint256', type: 'uint256' },
          {
            name: 'status',
            internalType: 'enum AdCampaignManager.CampaignStatus',
            type: 'uint8'
          },
          { name: 'campaignCode', internalType: 'string', type: 'string' },
          { name: 'advertiser', internalType: 'address', type: 'address' }
        ]
      }
    ],
    stateMutability: 'view'
  },
  {
    type: 'function',
    inputs: [],
    name: 'getAdCampaignCount',
    outputs: [{ name: '', internalType: 'uint256', type: 'uint256' }],
    stateMutability: 'view'
  },
  {
    type: 'function',
    inputs: [{ name: 'campaignId', internalType: 'uint256', type: 'uint256' }],
    name: 'getAdCampaigns',
    outputs: [
      {
        name: '',
        internalType: 'struct AdCampaignManager.AdCampaign',
        type: 'tuple',
        components: [
          { name: 'budget', internalType: 'uint256', type: 'uint256' },
          { name: 'amountSpent', internalType: 'uint256', type: 'uint256' },
          {
            name: 'status',
            internalType: 'enum AdCampaignManager.CampaignStatus',
            type: 'uint8'
          },
          { name: 'campaignCode', internalType: 'string', type: 'string' },
          { name: 'advertiser', internalType: 'address', type: 'address' }
        ]
      }
    ],
    stateMutability: 'view'
  },
  {
    type: 'function',
    inputs: [{ name: 'account', internalType: 'address', type: 'address' }],
    name: 'getAdminIndex',
    outputs: [{ name: '', internalType: 'uint256', type: 'uint256' }],
    stateMutability: 'view'
  },
  {
    type: 'function',
    inputs: [],
    name: 'getAdminList',
    outputs: [{ name: '', internalType: 'address[]', type: 'address[]' }],
    stateMutability: 'view'
  },
  {
    type: 'function',
    inputs: [{ name: 'account', internalType: 'address', type: 'address' }],
    name: 'getAdmins',
    outputs: [{ name: '', internalType: 'bool', type: 'bool' }],
    stateMutability: 'view'
  },
  {
    type: 'function',
    inputs: [],
    name: 'getBankContractAddress',
    outputs: [{ name: '', internalType: 'address', type: 'address' }],
    stateMutability: 'view'
  },
  {
    type: 'function',
    inputs: [{ name: 'campaignCode', internalType: 'string', type: 'string' }],
    name: 'getCampaignCodesToId',
    outputs: [{ name: '', internalType: 'uint256', type: 'uint256' }],
    stateMutability: 'view'
  },
  {
    type: 'function',
    inputs: [],
    name: 'getCostPerClick',
    outputs: [{ name: '', internalType: 'uint256', type: 'uint256' }],
    stateMutability: 'view'
  },
  {
    type: 'function',
    inputs: [],
    name: 'getCostPerImpression',
    outputs: [{ name: '', internalType: 'uint256', type: 'uint256' }],
    stateMutability: 'view'
  },
  {
    type: 'function',
    inputs: [],
    name: 'owner',
    outputs: [{ name: '', internalType: 'address', type: 'address' }],
    stateMutability: 'view'
  },
  {
    type: 'function',
    inputs: [],
    name: 'pause',
    outputs: [],
    stateMutability: 'nonpayable'
  },
  {
    type: 'function',
    inputs: [],
    name: 'paused',
    outputs: [{ name: '', internalType: 'bool', type: 'bool' }],
    stateMutability: 'view'
  },
  {
    type: 'function',
    inputs: [{ name: 'admin', internalType: 'address', type: 'address' }],
    name: 'removeAdmin',
    outputs: [],
    stateMutability: 'nonpayable'
  },
  {
    type: 'function',
    inputs: [],
    name: 'renounceOwnership',
    outputs: [],
    stateMutability: 'nonpayable'
  },
  {
    type: 'function',
    inputs: [
      { name: 'campaignCode', internalType: 'string', type: 'string' },
      { name: 'currentAmountSpent', internalType: 'uint256', type: 'uint256' }
    ],
    name: 'requestAndApproveWithdrawal',
    outputs: [],
    stateMutability: 'nonpayable'
  },
  {
    type: 'function',
    inputs: [{ name: 'bankContractAddress', internalType: 'address', type: 'address' }],
    name: 'setBankContractAddress',
    outputs: [],
    stateMutability: 'nonpayable'
  },
  {
    type: 'function',
    inputs: [{ name: 'costPerClick', internalType: 'uint256', type: 'uint256' }],
    name: 'setCostPerClick',
    outputs: [],
    stateMutability: 'nonpayable'
  },
  {
    type: 'function',
    inputs: [{ name: 'costPerImpression', internalType: 'uint256', type: 'uint256' }],
    name: 'setCostPerImpression',
    outputs: [],
    stateMutability: 'nonpayable'
  },
  {
    type: 'function',
    inputs: [{ name: 'newOwner', internalType: 'address', type: 'address' }],
    name: 'transferOwnership',
    outputs: [],
    stateMutability: 'nonpayable'
  },
  {
    type: 'function',
    inputs: [],
    name: 'unpause',
    outputs: [],
    stateMutability: 'nonpayable'
  },
  {
    type: 'function',
    inputs: [],
    name: 'version',
    outputs: [{ name: '', internalType: 'string', type: 'string' }],
    stateMutability: 'pure'
  },
  { type: 'receive', stateMutability: 'payable' }
] as const

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// Bank
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

export const bankAbi = [
  { type: 'constructor', inputs: [], stateMutability: 'nonpayable' },
  { type: 'error', inputs: [], name: 'Bank__FeeCollectorNotConfigured' },
  { type: 'error', inputs: [], name: 'Bank__FixedReturnContractNotFound' },
  {
    type: 'error',
    inputs: [
      { name: 'required', internalType: 'uint256', type: 'uint256' },
      { name: 'available', internalType: 'uint256', type: 'uint256' }
    ],
    name: 'Bank__InsufficientBalance'
  },
  {
    type: 'error',
    inputs: [{ name: 'feeBps', internalType: 'uint16', type: 'uint16' }],
    name: 'Bank__InvalidFeeBps'
  },
  { type: 'error', inputs: [], name: 'Bank__InvestorContractNotFound' },
  { type: 'error', inputs: [], name: 'Bank__OfficerAddressNotSet' },
  { type: 'error', inputs: [], name: 'Bank__TransferFailed' },
  {
    type: 'error',
    inputs: [{ name: 'token', internalType: 'address', type: 'address' }],
    name: 'Bank__UnsupportedToken'
  },
  { type: 'error', inputs: [], name: 'Bank__ZeroAddress' },
  { type: 'error', inputs: [], name: 'Bank__ZeroAmount' },
  { type: 'error', inputs: [], name: 'EnforcedPause' },
  { type: 'error', inputs: [], name: 'ExpectedPause' },
  { type: 'error', inputs: [], name: 'InvalidInitialization' },
  { type: 'error', inputs: [], name: 'NotInitializing' },
  {
    type: 'error',
    inputs: [{ name: 'owner', internalType: 'address', type: 'address' }],
    name: 'OwnableInvalidOwner'
  },
  {
    type: 'error',
    inputs: [{ name: 'account', internalType: 'address', type: 'address' }],
    name: 'OwnableUnauthorizedAccount'
  },
  { type: 'error', inputs: [], name: 'ReentrancyGuardReentrantCall' },
  {
    type: 'error',
    inputs: [{ name: 'token', internalType: 'address', type: 'address' }],
    name: 'SafeERC20FailedOperation'
  },
  {
    type: 'error',
    inputs: [{ name: 'token', internalType: 'address', type: 'address' }],
    name: 'TokenSupport__AlreadyAdded'
  },
  {
    type: 'error',
    inputs: [{ name: 'token', internalType: 'address', type: 'address' }],
    name: 'TokenSupport__NotFound'
  },
  { type: 'error', inputs: [], name: 'TokenSupport__ZeroAddress' },
  {
    type: 'event',
    anonymous: false,
    inputs: [
      {
        name: 'depositor',
        internalType: 'address',
        type: 'address',
        indexed: true
      },
      {
        name: 'amount',
        internalType: 'uint256',
        type: 'uint256',
        indexed: false
      }
    ],
    name: 'Deposited'
  },
  {
    type: 'event',
    anonymous: false,
    inputs: [
      {
        name: 'investor',
        internalType: 'address',
        type: 'address',
        indexed: true
      },
      {
        name: 'token',
        internalType: 'address',
        type: 'address',
        indexed: true
      },
      {
        name: 'totalAmount',
        internalType: 'uint256',
        type: 'uint256',
        indexed: false
      }
    ],
    name: 'DividendDistributionTriggered'
  },
  {
    type: 'event',
    anonymous: false,
    inputs: [
      {
        name: 'fixedReturn',
        internalType: 'address',
        type: 'address',
        indexed: true
      },
      {
        name: 'offerId',
        internalType: 'uint256',
        type: 'uint256',
        indexed: true
      },
      {
        name: 'token',
        internalType: 'address',
        type: 'address',
        indexed: true
      },
      {
        name: 'amount',
        internalType: 'uint256',
        type: 'uint256',
        indexed: false
      }
    ],
    name: 'FixedReturnRepaymentFunded'
  },
  {
    type: 'event',
    anonymous: false,
    inputs: [
      {
        name: 'version',
        internalType: 'uint64',
        type: 'uint64',
        indexed: false
      }
    ],
    name: 'Initialized'
  },
  {
    type: 'event',
    anonymous: false,
    inputs: [
      {
        name: 'previousOwner',
        internalType: 'address',
        type: 'address',
        indexed: true
      },
      {
        name: 'newOwner',
        internalType: 'address',
        type: 'address',
        indexed: true
      }
    ],
    name: 'OwnershipTransferred'
  },
  {
    type: 'event',
    anonymous: false,
    inputs: [
      {
        name: 'account',
        internalType: 'address',
        type: 'address',
        indexed: false
      }
    ],
    name: 'Paused'
  },
  {
    type: 'event',
    anonymous: false,
    inputs: [
      {
        name: 'depositor',
        internalType: 'address',
        type: 'address',
        indexed: true
      },
      {
        name: 'token',
        internalType: 'address',
        type: 'address',
        indexed: true
      },
      {
        name: 'amount',
        internalType: 'uint256',
        type: 'uint256',
        indexed: false
      }
    ],
    name: 'TokenDeposited'
  },
  {
    type: 'event',
    anonymous: false,
    inputs: [
      {
        name: 'tokenAddress',
        internalType: 'address',
        type: 'address',
        indexed: true
      }
    ],
    name: 'TokenSupportAdded'
  },
  {
    type: 'event',
    anonymous: false,
    inputs: [
      {
        name: 'tokenAddress',
        internalType: 'address',
        type: 'address',
        indexed: true
      }
    ],
    name: 'TokenSupportRemoved'
  },
  {
    type: 'event',
    anonymous: false,
    inputs: [
      {
        name: 'sender',
        internalType: 'address',
        type: 'address',
        indexed: true
      },
      { name: 'to', internalType: 'address', type: 'address', indexed: true },
      {
        name: 'token',
        internalType: 'address',
        type: 'address',
        indexed: true
      },
      {
        name: 'amount',
        internalType: 'uint256',
        type: 'uint256',
        indexed: false
      }
    ],
    name: 'TokenTransfer'
  },
  {
    type: 'event',
    anonymous: false,
    inputs: [
      {
        name: 'sender',
        internalType: 'address',
        type: 'address',
        indexed: true
      },
      { name: 'to', internalType: 'address', type: 'address', indexed: true },
      {
        name: 'amount',
        internalType: 'uint256',
        type: 'uint256',
        indexed: false
      }
    ],
    name: 'Transfer'
  },
  {
    type: 'event',
    anonymous: false,
    inputs: [
      {
        name: 'account',
        internalType: 'address',
        type: 'address',
        indexed: false
      }
    ],
    name: 'Unpaused'
  },
  {
    type: 'function',
    inputs: [{ name: 'tokenAddress', internalType: 'address', type: 'address' }],
    name: 'addTokenSupport',
    outputs: [],
    stateMutability: 'nonpayable'
  },
  {
    type: 'function',
    inputs: [
      { name: 'token', internalType: 'address', type: 'address' },
      { name: 'amount', internalType: 'uint256', type: 'uint256' }
    ],
    name: 'depositToken',
    outputs: [],
    stateMutability: 'nonpayable'
  },
  {
    type: 'function',
    inputs: [{ name: 'amount', internalType: 'uint256', type: 'uint256' }],
    name: 'distributeNativeDividends',
    outputs: [],
    stateMutability: 'nonpayable'
  },
  {
    type: 'function',
    inputs: [
      { name: 'token', internalType: 'address', type: 'address' },
      { name: 'amount', internalType: 'uint256', type: 'uint256' }
    ],
    name: 'distributeTokenDividends',
    outputs: [],
    stateMutability: 'nonpayable'
  },
  {
    type: 'function',
    inputs: [
      { name: 'offerId', internalType: 'uint256', type: 'uint256' },
      { name: 'amount', internalType: 'uint256', type: 'uint256' }
    ],
    name: 'fundFixedReturnRepayment',
    outputs: [],
    stateMutability: 'nonpayable'
  },
  {
    type: 'function',
    inputs: [],
    name: 'getBalance',
    outputs: [{ name: '', internalType: 'uint256', type: 'uint256' }],
    stateMutability: 'view'
  },
  {
    type: 'function',
    inputs: [],
    name: 'getOfficerAddress',
    outputs: [{ name: '', internalType: 'address', type: 'address' }],
    stateMutability: 'view'
  },
  {
    type: 'function',
    inputs: [],
    name: 'getSupportedTokenCount',
    outputs: [{ name: '', internalType: 'uint256', type: 'uint256' }],
    stateMutability: 'view'
  },
  {
    type: 'function',
    inputs: [],
    name: 'getSupportedTokens',
    outputs: [{ name: '', internalType: 'address[]', type: 'address[]' }],
    stateMutability: 'view'
  },
  {
    type: 'function',
    inputs: [{ name: 'token', internalType: 'address', type: 'address' }],
    name: 'getTokenBalance',
    outputs: [{ name: '', internalType: 'uint256', type: 'uint256' }],
    stateMutability: 'view'
  },
  {
    type: 'function',
    inputs: [
      { name: 'tokenAddresses', internalType: 'address[]', type: 'address[]' },
      { name: 'sender', internalType: 'address', type: 'address' }
    ],
    name: 'initialize',
    outputs: [],
    stateMutability: 'nonpayable'
  },
  {
    type: 'function',
    inputs: [{ name: 'token', internalType: 'address', type: 'address' }],
    name: 'isTokenSupported',
    outputs: [{ name: '', internalType: 'bool', type: 'bool' }],
    stateMutability: 'view'
  },
  {
    type: 'function',
    inputs: [],
    name: 'owner',
    outputs: [{ name: '', internalType: 'address', type: 'address' }],
    stateMutability: 'view'
  },
  {
    type: 'function',
    inputs: [],
    name: 'pause',
    outputs: [],
    stateMutability: 'nonpayable'
  },
  {
    type: 'function',
    inputs: [],
    name: 'paused',
    outputs: [{ name: '', internalType: 'bool', type: 'bool' }],
    stateMutability: 'view'
  },
  {
    type: 'function',
    inputs: [{ name: 'tokenAddress', internalType: 'address', type: 'address' }],
    name: 'removeTokenSupport',
    outputs: [],
    stateMutability: 'nonpayable'
  },
  {
    type: 'function',
    inputs: [],
    name: 'renounceOwnership',
    outputs: [],
    stateMutability: 'nonpayable'
  },
  {
    type: 'function',
    inputs: [
      { name: 'to', internalType: 'address', type: 'address' },
      { name: 'amount', internalType: 'uint256', type: 'uint256' }
    ],
    name: 'transfer',
    outputs: [],
    stateMutability: 'nonpayable'
  },
  {
    type: 'function',
    inputs: [{ name: 'newOwner', internalType: 'address', type: 'address' }],
    name: 'transferOwnership',
    outputs: [],
    stateMutability: 'nonpayable'
  },
  {
    type: 'function',
    inputs: [
      { name: 'token', internalType: 'address', type: 'address' },
      { name: 'to', internalType: 'address', type: 'address' },
      { name: 'amount', internalType: 'uint256', type: 'uint256' }
    ],
    name: 'transferToken',
    outputs: [],
    stateMutability: 'nonpayable'
  },
  {
    type: 'function',
    inputs: [],
    name: 'unpause',
    outputs: [],
    stateMutability: 'nonpayable'
  },
  {
    type: 'function',
    inputs: [],
    name: 'version',
    outputs: [{ name: '', internalType: 'string', type: 'string' }],
    stateMutability: 'pure'
  },
  { type: 'receive', stateMutability: 'payable' }
] as const

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// BoardOfDirectors
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

export const boardOfDirectorsAbi = [
  { type: 'constructor', inputs: [], stateMutability: 'nonpayable' },
  {
    type: 'error',
    inputs: [{ name: 'actionId', internalType: 'uint256', type: 'uint256' }],
    name: 'BoardOfDirectors__ActionAlreadyExecuted'
  },
  { type: 'error', inputs: [], name: 'BoardOfDirectors__AlreadyApproved' },
  {
    type: 'error',
    inputs: [{ name: 'target', internalType: 'address', type: 'address' }],
    name: 'BoardOfDirectors__CallFailed'
  },
  { type: 'error', inputs: [], name: 'BoardOfDirectors__EmptyList' },
  { type: 'error', inputs: [], name: 'BoardOfDirectors__NotApproved' },
  {
    type: 'error',
    inputs: [{ name: 'caller', internalType: 'address', type: 'address' }],
    name: 'BoardOfDirectors__NotBoardMember'
  },
  {
    type: 'error',
    inputs: [{ name: 'caller', internalType: 'address', type: 'address' }],
    name: 'BoardOfDirectors__NotOwner'
  },
  { type: 'error', inputs: [], name: 'BoardOfDirectors__NotSelf' },
  {
    type: 'error',
    inputs: [{ name: 'owner', internalType: 'address', type: 'address' }],
    name: 'BoardOfDirectors__OwnerAlreadyExists'
  },
  {
    type: 'error',
    inputs: [{ name: 'owner', internalType: 'address', type: 'address' }],
    name: 'BoardOfDirectors__OwnerNotFound'
  },
  { type: 'error', inputs: [], name: 'BoardOfDirectors__ZeroAddress' },
  { type: 'error', inputs: [], name: 'InvalidInitialization' },
  { type: 'error', inputs: [], name: 'NotInitializing' },
  { type: 'error', inputs: [], name: 'ReentrancyGuardReentrantCall' },
  {
    type: 'event',
    anonymous: false,
    inputs: [
      { name: 'id', internalType: 'uint256', type: 'uint256', indexed: true },
      {
        name: 'target',
        internalType: 'address',
        type: 'address',
        indexed: true
      },
      {
        name: 'description',
        internalType: 'string',
        type: 'string',
        indexed: false
      },
      { name: 'data', internalType: 'bytes', type: 'bytes', indexed: false }
    ],
    name: 'ActionAdded'
  },
  {
    type: 'event',
    anonymous: false,
    inputs: [
      { name: 'id', internalType: 'uint256', type: 'uint256', indexed: true },
      {
        name: 'target',
        internalType: 'address',
        type: 'address',
        indexed: true
      },
      {
        name: 'description',
        internalType: 'string',
        type: 'string',
        indexed: false
      },
      { name: 'data', internalType: 'bytes', type: 'bytes', indexed: false }
    ],
    name: 'ActionExecuted'
  },
  {
    type: 'event',
    anonymous: false,
    inputs: [
      { name: 'id', internalType: 'uint256', type: 'uint256', indexed: true },
      {
        name: 'approver',
        internalType: 'address',
        type: 'address',
        indexed: true
      }
    ],
    name: 'Approval'
  },
  {
    type: 'event',
    anonymous: false,
    inputs: [
      {
        name: 'boardOfDirectors',
        internalType: 'address[]',
        type: 'address[]',
        indexed: false
      }
    ],
    name: 'BoardOfDirectorsChanged'
  },
  {
    type: 'event',
    anonymous: false,
    inputs: [
      {
        name: 'version',
        internalType: 'uint64',
        type: 'uint64',
        indexed: false
      }
    ],
    name: 'Initialized'
  },
  {
    type: 'event',
    anonymous: false,
    inputs: [
      {
        name: 'owners',
        internalType: 'address[]',
        type: 'address[]',
        indexed: false
      }
    ],
    name: 'OwnersChanged'
  },
  {
    type: 'event',
    anonymous: false,
    inputs: [
      { name: 'id', internalType: 'uint256', type: 'uint256', indexed: true },
      {
        name: 'approver',
        internalType: 'address',
        type: 'address',
        indexed: true
      }
    ],
    name: 'Revocation'
  },
  {
    type: 'function',
    inputs: [
      { name: 'target', internalType: 'address', type: 'address' },
      { name: 'description', internalType: 'string', type: 'string' },
      { name: 'data', internalType: 'bytes', type: 'bytes' }
    ],
    name: 'addAction',
    outputs: [],
    stateMutability: 'nonpayable'
  },
  {
    type: 'function',
    inputs: [{ name: 'owner', internalType: 'address', type: 'address' }],
    name: 'addOwner',
    outputs: [],
    stateMutability: 'nonpayable'
  },
  {
    type: 'function',
    inputs: [{ name: 'actionId', internalType: 'uint256', type: 'uint256' }],
    name: 'approvalCount',
    outputs: [{ name: '', internalType: 'uint256', type: 'uint256' }],
    stateMutability: 'view'
  },
  {
    type: 'function',
    inputs: [{ name: 'actionId', internalType: 'uint256', type: 'uint256' }],
    name: 'approve',
    outputs: [],
    stateMutability: 'nonpayable'
  },
  {
    type: 'function',
    inputs: [],
    name: 'getActionCount',
    outputs: [{ name: '', internalType: 'uint256', type: 'uint256' }],
    stateMutability: 'view'
  },
  {
    type: 'function',
    inputs: [{ name: 'actionId', internalType: 'uint256', type: 'uint256' }],
    name: 'getActions',
    outputs: [
      { name: 'id', internalType: 'uint256', type: 'uint256' },
      { name: 'target', internalType: 'address', type: 'address' },
      { name: 'description', internalType: 'string', type: 'string' },
      { name: 'approvalCount_', internalType: 'uint8', type: 'uint8' },
      { name: 'isExecuted', internalType: 'bool', type: 'bool' },
      { name: 'data', internalType: 'bytes', type: 'bytes' },
      { name: 'createdBy', internalType: 'address', type: 'address' }
    ],
    stateMutability: 'view'
  },
  {
    type: 'function',
    inputs: [],
    name: 'getBoardOfDirectors',
    outputs: [{ name: '', internalType: 'address[]', type: 'address[]' }],
    stateMutability: 'view'
  },
  {
    type: 'function',
    inputs: [],
    name: 'getOwners',
    outputs: [{ name: '', internalType: 'address[]', type: 'address[]' }],
    stateMutability: 'view'
  },
  {
    type: 'function',
    inputs: [{ name: 'owners', internalType: 'address[]', type: 'address[]' }],
    name: 'initialize',
    outputs: [],
    stateMutability: 'nonpayable'
  },
  {
    type: 'function',
    inputs: [{ name: 'actionId', internalType: 'uint256', type: 'uint256' }],
    name: 'isActionExecuted',
    outputs: [{ name: '', internalType: 'bool', type: 'bool' }],
    stateMutability: 'view'
  },
  {
    type: 'function',
    inputs: [
      { name: 'actionId', internalType: 'uint256', type: 'uint256' },
      { name: 'account', internalType: 'address', type: 'address' }
    ],
    name: 'isApproved',
    outputs: [{ name: '', internalType: 'bool', type: 'bool' }],
    stateMutability: 'view'
  },
  {
    type: 'function',
    inputs: [{ name: 'account', internalType: 'address', type: 'address' }],
    name: 'isMember',
    outputs: [{ name: '', internalType: 'bool', type: 'bool' }],
    stateMutability: 'view'
  },
  {
    type: 'function',
    inputs: [{ name: 'owner', internalType: 'address', type: 'address' }],
    name: 'removeOwner',
    outputs: [],
    stateMutability: 'nonpayable'
  },
  {
    type: 'function',
    inputs: [{ name: 'actionId', internalType: 'uint256', type: 'uint256' }],
    name: 'revoke',
    outputs: [],
    stateMutability: 'nonpayable'
  },
  {
    type: 'function',
    inputs: [
      {
        name: 'boardOfDirectors',
        internalType: 'address[]',
        type: 'address[]'
      }
    ],
    name: 'setBoardOfDirectors',
    outputs: [],
    stateMutability: 'nonpayable'
  },
  {
    type: 'function',
    inputs: [{ name: 'owners', internalType: 'address[]', type: 'address[]' }],
    name: 'setOwners',
    outputs: [],
    stateMutability: 'nonpayable'
  },
  {
    type: 'function',
    inputs: [],
    name: 'version',
    outputs: [{ name: '', internalType: 'string', type: 'string' }],
    stateMutability: 'pure'
  }
] as const

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// CashRemunerationEIP712
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

export const cashRemunerationEip712Abi = [
  { type: 'constructor', inputs: [], stateMutability: 'nonpayable' },
  {
    type: 'error',
    inputs: [],
    name: 'CashRemunerationEIP712__BankContractNotFound'
  },
  {
    type: 'error',
    inputs: [{ name: 'signatureHash', internalType: 'bytes32', type: 'bytes32' }],
    name: 'CashRemunerationEIP712__ClaimIsDisabled'
  },
  {
    type: 'error',
    inputs: [
      { name: 'token', internalType: 'address', type: 'address' },
      { name: 'required', internalType: 'uint256', type: 'uint256' },
      { name: 'available', internalType: 'uint256', type: 'uint256' }
    ],
    name: 'CashRemunerationEIP712__InsufficientTokenBalance'
  },
  {
    type: 'error',
    inputs: [
      { name: 'expected', internalType: 'address', type: 'address' },
      { name: 'actual', internalType: 'address', type: 'address' }
    ],
    name: 'CashRemunerationEIP712__NotClaimOwner'
  },
  {
    type: 'error',
    inputs: [],
    name: 'CashRemunerationEIP712__OfficerAddressNotSet'
  },
  {
    type: 'error',
    inputs: [{ name: 'token', internalType: 'address', type: 'address' }],
    name: 'CashRemunerationEIP712__TokenNotSupported'
  },
  {
    type: 'error',
    inputs: [
      { name: 'expected', internalType: 'address', type: 'address' },
      { name: 'received', internalType: 'address', type: 'address' }
    ],
    name: 'CashRemunerationEIP712__UnauthorizedAccess'
  },
  {
    type: 'error',
    inputs: [{ name: 'signatureHash', internalType: 'bytes32', type: 'bytes32' }],
    name: 'CashRemunerationEIP712__WageAlreadyPaid'
  },
  { type: 'error', inputs: [], name: 'CashRemunerationEIP712__ZeroAddress' },
  { type: 'error', inputs: [], name: 'ECDSAInvalidSignature' },
  {
    type: 'error',
    inputs: [{ name: 'length', internalType: 'uint256', type: 'uint256' }],
    name: 'ECDSAInvalidSignatureLength'
  },
  {
    type: 'error',
    inputs: [{ name: 's', internalType: 'bytes32', type: 'bytes32' }],
    name: 'ECDSAInvalidSignatureS'
  },
  { type: 'error', inputs: [], name: 'EnforcedPause' },
  { type: 'error', inputs: [], name: 'ExpectedPause' },
  { type: 'error', inputs: [], name: 'FailedCall' },
  {
    type: 'error',
    inputs: [
      { name: 'balance', internalType: 'uint256', type: 'uint256' },
      { name: 'needed', internalType: 'uint256', type: 'uint256' }
    ],
    name: 'InsufficientBalance'
  },
  { type: 'error', inputs: [], name: 'InvalidInitialization' },
  { type: 'error', inputs: [], name: 'NotInitializing' },
  {
    type: 'error',
    inputs: [{ name: 'owner', internalType: 'address', type: 'address' }],
    name: 'OwnableInvalidOwner'
  },
  {
    type: 'error',
    inputs: [{ name: 'account', internalType: 'address', type: 'address' }],
    name: 'OwnableUnauthorizedAccount'
  },
  { type: 'error', inputs: [], name: 'ReentrancyGuardReentrantCall' },
  {
    type: 'error',
    inputs: [{ name: 'token', internalType: 'address', type: 'address' }],
    name: 'SafeERC20FailedOperation'
  },
  {
    type: 'error',
    inputs: [{ name: 'token', internalType: 'address', type: 'address' }],
    name: 'TokenSupport__AlreadyAdded'
  },
  {
    type: 'error',
    inputs: [{ name: 'token', internalType: 'address', type: 'address' }],
    name: 'TokenSupport__NotFound'
  },
  { type: 'error', inputs: [], name: 'TokenSupport__ZeroAddress' },
  {
    type: 'event',
    anonymous: false,
    inputs: [
      {
        name: 'depositor',
        internalType: 'address',
        type: 'address',
        indexed: true
      },
      {
        name: 'amount',
        internalType: 'uint256',
        type: 'uint256',
        indexed: false
      }
    ],
    name: 'Deposited'
  },
  { type: 'event', anonymous: false, inputs: [], name: 'EIP712DomainChanged' },
  {
    type: 'event',
    anonymous: false,
    inputs: [
      {
        name: 'version',
        internalType: 'uint64',
        type: 'uint64',
        indexed: false
      }
    ],
    name: 'Initialized'
  },
  {
    type: 'event',
    anonymous: false,
    inputs: [
      {
        name: 'newOfficerAddress',
        internalType: 'address',
        type: 'address',
        indexed: true
      }
    ],
    name: 'OfficerAddressUpdated'
  },
  {
    type: 'event',
    anonymous: false,
    inputs: [
      {
        name: 'ownerAddress',
        internalType: 'address',
        type: 'address',
        indexed: true
      },
      {
        name: 'amount',
        internalType: 'uint256',
        type: 'uint256',
        indexed: false
      }
    ],
    name: 'OwnerTreasuryWithdrawNative'
  },
  {
    type: 'event',
    anonymous: false,
    inputs: [
      {
        name: 'ownerAddress',
        internalType: 'address',
        type: 'address',
        indexed: true
      },
      {
        name: 'tokenAddress',
        internalType: 'address',
        type: 'address',
        indexed: true
      },
      {
        name: 'amount',
        internalType: 'uint256',
        type: 'uint256',
        indexed: false
      }
    ],
    name: 'OwnerTreasuryWithdrawToken'
  },
  {
    type: 'event',
    anonymous: false,
    inputs: [
      {
        name: 'previousOwner',
        internalType: 'address',
        type: 'address',
        indexed: true
      },
      {
        name: 'newOwner',
        internalType: 'address',
        type: 'address',
        indexed: true
      }
    ],
    name: 'OwnershipTransferred'
  },
  {
    type: 'event',
    anonymous: false,
    inputs: [
      {
        name: 'account',
        internalType: 'address',
        type: 'address',
        indexed: false
      }
    ],
    name: 'Paused'
  },
  {
    type: 'event',
    anonymous: false,
    inputs: [
      {
        name: 'tokenAddress',
        internalType: 'address',
        type: 'address',
        indexed: true
      }
    ],
    name: 'TokenSupportAdded'
  },
  {
    type: 'event',
    anonymous: false,
    inputs: [
      {
        name: 'tokenAddress',
        internalType: 'address',
        type: 'address',
        indexed: true
      }
    ],
    name: 'TokenSupportRemoved'
  },
  {
    type: 'event',
    anonymous: false,
    inputs: [
      {
        name: 'account',
        internalType: 'address',
        type: 'address',
        indexed: false
      }
    ],
    name: 'Unpaused'
  },
  {
    type: 'event',
    anonymous: false,
    inputs: [
      {
        name: 'signatureHash',
        internalType: 'bytes32',
        type: 'bytes32',
        indexed: true
      }
    ],
    name: 'WageClaimDisabled'
  },
  {
    type: 'event',
    anonymous: false,
    inputs: [
      {
        name: 'signatureHash',
        internalType: 'bytes32',
        type: 'bytes32',
        indexed: true
      }
    ],
    name: 'WageClaimEnabled'
  },
  {
    type: 'event',
    anonymous: false,
    inputs: [
      {
        name: 'withdrawer',
        internalType: 'address',
        type: 'address',
        indexed: true
      },
      {
        name: 'amount',
        internalType: 'uint256',
        type: 'uint256',
        indexed: false
      }
    ],
    name: 'Withdraw'
  },
  {
    type: 'event',
    anonymous: false,
    inputs: [
      {
        name: 'withdrawer',
        internalType: 'address',
        type: 'address',
        indexed: true
      },
      {
        name: 'tokenAddress',
        internalType: 'address',
        type: 'address',
        indexed: true
      },
      {
        name: 'amount',
        internalType: 'uint256',
        type: 'uint256',
        indexed: false
      }
    ],
    name: 'WithdrawToken'
  },
  {
    type: 'function',
    inputs: [{ name: 'tokenAddress', internalType: 'address', type: 'address' }],
    name: 'addTokenSupport',
    outputs: [],
    stateMutability: 'nonpayable'
  },
  {
    type: 'function',
    inputs: [{ name: 'signatureHash', internalType: 'bytes32', type: 'bytes32' }],
    name: 'disableClaim',
    outputs: [],
    stateMutability: 'nonpayable'
  },
  {
    type: 'function',
    inputs: [],
    name: 'eip712Domain',
    outputs: [
      { name: 'fields', internalType: 'bytes1', type: 'bytes1' },
      { name: 'name', internalType: 'string', type: 'string' },
      { name: 'version', internalType: 'string', type: 'string' },
      { name: 'chainId', internalType: 'uint256', type: 'uint256' },
      { name: 'verifyingContract', internalType: 'address', type: 'address' },
      { name: 'salt', internalType: 'bytes32', type: 'bytes32' },
      { name: 'extensions', internalType: 'uint256[]', type: 'uint256[]' }
    ],
    stateMutability: 'view'
  },
  {
    type: 'function',
    inputs: [{ name: 'signatureHash', internalType: 'bytes32', type: 'bytes32' }],
    name: 'enableClaim',
    outputs: [],
    stateMutability: 'nonpayable'
  },
  {
    type: 'function',
    inputs: [],
    name: 'getBalance',
    outputs: [{ name: '', internalType: 'uint256', type: 'uint256' }],
    stateMutability: 'view'
  },
  {
    type: 'function',
    inputs: [{ name: 'signatureHash', internalType: 'bytes32', type: 'bytes32' }],
    name: 'getDisabledWageClaim',
    outputs: [{ name: '', internalType: 'bool', type: 'bool' }],
    stateMutability: 'view'
  },
  {
    type: 'function',
    inputs: [],
    name: 'getOfficerAddress',
    outputs: [{ name: '', internalType: 'address', type: 'address' }],
    stateMutability: 'view'
  },
  {
    type: 'function',
    inputs: [{ name: 'signatureHash', internalType: 'bytes32', type: 'bytes32' }],
    name: 'getPaidWageClaim',
    outputs: [{ name: '', internalType: 'bool', type: 'bool' }],
    stateMutability: 'view'
  },
  {
    type: 'function',
    inputs: [],
    name: 'getSupportedTokenCount',
    outputs: [{ name: '', internalType: 'uint256', type: 'uint256' }],
    stateMutability: 'view'
  },
  {
    type: 'function',
    inputs: [],
    name: 'getSupportedTokens',
    outputs: [{ name: '', internalType: 'address[]', type: 'address[]' }],
    stateMutability: 'view'
  },
  {
    type: 'function',
    inputs: [
      { name: 'initialOwner', internalType: 'address', type: 'address' },
      { name: 'tokenAddresses', internalType: 'address[]', type: 'address[]' }
    ],
    name: 'initialize',
    outputs: [],
    stateMutability: 'nonpayable'
  },
  {
    type: 'function',
    inputs: [{ name: 'token', internalType: 'address', type: 'address' }],
    name: 'isTokenSupported',
    outputs: [{ name: '', internalType: 'bool', type: 'bool' }],
    stateMutability: 'view'
  },
  {
    type: 'function',
    inputs: [],
    name: 'owner',
    outputs: [{ name: '', internalType: 'address', type: 'address' }],
    stateMutability: 'view'
  },
  {
    type: 'function',
    inputs: [],
    name: 'ownerWithdrawAllToBank',
    outputs: [],
    stateMutability: 'nonpayable'
  },
  {
    type: 'function',
    inputs: [],
    name: 'pause',
    outputs: [],
    stateMutability: 'nonpayable'
  },
  {
    type: 'function',
    inputs: [],
    name: 'paused',
    outputs: [{ name: '', internalType: 'bool', type: 'bool' }],
    stateMutability: 'view'
  },
  {
    type: 'function',
    inputs: [{ name: 'tokenAddress', internalType: 'address', type: 'address' }],
    name: 'removeTokenSupport',
    outputs: [],
    stateMutability: 'nonpayable'
  },
  {
    type: 'function',
    inputs: [],
    name: 'renounceOwnership',
    outputs: [],
    stateMutability: 'nonpayable'
  },
  {
    type: 'function',
    inputs: [{ name: 'newOwner', internalType: 'address', type: 'address' }],
    name: 'transferOwnership',
    outputs: [],
    stateMutability: 'nonpayable'
  },
  {
    type: 'function',
    inputs: [],
    name: 'unpause',
    outputs: [],
    stateMutability: 'nonpayable'
  },
  {
    type: 'function',
    inputs: [],
    name: 'version',
    outputs: [{ name: '', internalType: 'string', type: 'string' }],
    stateMutability: 'pure'
  },
  {
    type: 'function',
    inputs: [
      {
        name: 'wageClaim',
        internalType: 'struct CashRemunerationEIP712.WageClaim',
        type: 'tuple',
        components: [
          { name: 'employeeAddress', internalType: 'address', type: 'address' },
          { name: 'minutesWorked', internalType: 'uint16', type: 'uint16' },
          {
            name: 'wages',
            internalType: 'struct CashRemunerationEIP712.Wage[]',
            type: 'tuple[]',
            components: [
              { name: 'hourlyRate', internalType: 'uint256', type: 'uint256' },
              {
                name: 'tokenAddress',
                internalType: 'address',
                type: 'address'
              }
            ]
          },
          { name: 'date', internalType: 'uint256', type: 'uint256' }
        ]
      },
      { name: 'signature', internalType: 'bytes', type: 'bytes' }
    ],
    name: 'withdraw',
    outputs: [],
    stateMutability: 'nonpayable'
  },
  { type: 'receive', stateMutability: 'payable' }
] as const

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// Elections
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

export const electionsAbi = [
  { type: 'constructor', inputs: [], stateMutability: 'nonpayable' },
  { type: 'error', inputs: [], name: 'ElectionUtils__DuplicateCandidates' },
  { type: 'error', inputs: [], name: 'ElectionUtils__DuplicateVoters' },
  { type: 'error', inputs: [], name: 'ElectionUtils__InsufficientCandidates' },
  { type: 'error', inputs: [], name: 'ElectionUtils__InvalidCandidate' },
  { type: 'error', inputs: [], name: 'ElectionUtils__InvalidDates' },
  { type: 'error', inputs: [], name: 'ElectionUtils__InvalidSeatCount' },
  { type: 'error', inputs: [], name: 'ElectionUtils__NoEligibleVoters' },
  { type: 'error', inputs: [], name: 'Elections__AlreadyVoted' },
  { type: 'error', inputs: [], name: 'Elections__BoardOfDirectorsNotFound' },
  { type: 'error', inputs: [], name: 'Elections__ElectionEnded' },
  { type: 'error', inputs: [], name: 'Elections__ElectionIsOngoing' },
  { type: 'error', inputs: [], name: 'Elections__ElectionNotActive' },
  { type: 'error', inputs: [], name: 'Elections__ElectionNotFound' },
  { type: 'error', inputs: [], name: 'Elections__NotEligibleVoter' },
  { type: 'error', inputs: [], name: 'Elections__OfficerAddressNotSet' },
  { type: 'error', inputs: [], name: 'Elections__ResultsAlreadyPublished' },
  { type: 'error', inputs: [], name: 'Elections__ResultsNotReady' },
  { type: 'error', inputs: [], name: 'Elections__Unauthorized' },
  { type: 'error', inputs: [], name: 'Elections__ZeroSender' },
  { type: 'error', inputs: [], name: 'EnforcedPause' },
  { type: 'error', inputs: [], name: 'ExpectedPause' },
  { type: 'error', inputs: [], name: 'InvalidInitialization' },
  { type: 'error', inputs: [], name: 'NotInitializing' },
  {
    type: 'error',
    inputs: [{ name: 'owner', internalType: 'address', type: 'address' }],
    name: 'OwnableInvalidOwner'
  },
  {
    type: 'error',
    inputs: [{ name: 'account', internalType: 'address', type: 'address' }],
    name: 'OwnableUnauthorizedAccount'
  },
  {
    type: 'event',
    anonymous: false,
    inputs: [
      {
        name: 'electionId',
        internalType: 'uint256',
        type: 'uint256',
        indexed: true
      },
      { name: 'title', internalType: 'string', type: 'string', indexed: false },
      {
        name: 'createdBy',
        internalType: 'address',
        type: 'address',
        indexed: true
      },
      {
        name: 'startDate',
        internalType: 'uint256',
        type: 'uint256',
        indexed: false
      },
      {
        name: 'endDate',
        internalType: 'uint256',
        type: 'uint256',
        indexed: false
      },
      {
        name: 'seatCount',
        internalType: 'uint256',
        type: 'uint256',
        indexed: false
      }
    ],
    name: 'ElectionCreated'
  },
  {
    type: 'event',
    anonymous: false,
    inputs: [
      {
        name: 'version',
        internalType: 'uint64',
        type: 'uint64',
        indexed: false
      }
    ],
    name: 'Initialized'
  },
  {
    type: 'event',
    anonymous: false,
    inputs: [
      {
        name: 'previousOwner',
        internalType: 'address',
        type: 'address',
        indexed: true
      },
      {
        name: 'newOwner',
        internalType: 'address',
        type: 'address',
        indexed: true
      }
    ],
    name: 'OwnershipTransferred'
  },
  {
    type: 'event',
    anonymous: false,
    inputs: [
      {
        name: 'account',
        internalType: 'address',
        type: 'address',
        indexed: false
      }
    ],
    name: 'Paused'
  },
  {
    type: 'event',
    anonymous: false,
    inputs: [
      {
        name: 'electionId',
        internalType: 'uint256',
        type: 'uint256',
        indexed: true
      },
      {
        name: 'winners',
        internalType: 'address[]',
        type: 'address[]',
        indexed: false
      }
    ],
    name: 'ResultsPublished'
  },
  {
    type: 'event',
    anonymous: false,
    inputs: [
      {
        name: 'account',
        internalType: 'address',
        type: 'address',
        indexed: false
      }
    ],
    name: 'Unpaused'
  },
  {
    type: 'event',
    anonymous: false,
    inputs: [
      {
        name: 'electionId',
        internalType: 'uint256',
        type: 'uint256',
        indexed: true
      },
      {
        name: 'voter',
        internalType: 'address',
        type: 'address',
        indexed: true
      },
      {
        name: 'candidate',
        internalType: 'address',
        type: 'address',
        indexed: true
      }
    ],
    name: 'VoteSubmitted'
  },
  {
    type: 'function',
    inputs: [
      { name: 'electionId', internalType: 'uint256', type: 'uint256' },
      { name: 'candidate', internalType: 'address', type: 'address' }
    ],
    name: 'castVote',
    outputs: [],
    stateMutability: 'nonpayable'
  },
  {
    type: 'function',
    inputs: [
      { name: 'title', internalType: 'string', type: 'string' },
      { name: 'description', internalType: 'string', type: 'string' },
      { name: 'startDate', internalType: 'uint256', type: 'uint256' },
      { name: 'endDate', internalType: 'uint256', type: 'uint256' },
      { name: 'seatCount', internalType: 'uint256', type: 'uint256' },
      { name: 'candidates', internalType: 'address[]', type: 'address[]' },
      { name: 'eligibleVoters', internalType: 'address[]', type: 'address[]' }
    ],
    name: 'createElection',
    outputs: [{ name: 'electionId', internalType: 'uint256', type: 'uint256' }],
    stateMutability: 'nonpayable'
  },
  {
    type: 'function',
    inputs: [{ name: 'electionId', internalType: 'uint256', type: 'uint256' }],
    name: 'getElection',
    outputs: [
      { name: 'id', internalType: 'uint256', type: 'uint256' },
      { name: 'title', internalType: 'string', type: 'string' },
      { name: 'description', internalType: 'string', type: 'string' },
      { name: 'createdBy', internalType: 'address', type: 'address' },
      { name: 'startDate', internalType: 'uint256', type: 'uint256' },
      { name: 'endDate', internalType: 'uint256', type: 'uint256' },
      { name: 'seatCount', internalType: 'uint256', type: 'uint256' },
      { name: 'resultsPublished', internalType: 'bool', type: 'bool' }
    ],
    stateMutability: 'view'
  },
  {
    type: 'function',
    inputs: [{ name: 'electionId', internalType: 'uint256', type: 'uint256' }],
    name: 'getElectionCandidates',
    outputs: [{ name: 'candidates', internalType: 'address[]', type: 'address[]' }],
    stateMutability: 'view'
  },
  {
    type: 'function',
    inputs: [{ name: 'electionId', internalType: 'uint256', type: 'uint256' }],
    name: 'getElectionEligibleVoters',
    outputs: [{ name: 'voters', internalType: 'address[]', type: 'address[]' }],
    stateMutability: 'view'
  },
  {
    type: 'function',
    inputs: [],
    name: 'getElectionIds',
    outputs: [{ name: '', internalType: 'uint256[]', type: 'uint256[]' }],
    stateMutability: 'view'
  },
  {
    type: 'function',
    inputs: [{ name: 'electionId', internalType: 'uint256', type: 'uint256' }],
    name: 'getElectionResults',
    outputs: [{ name: '', internalType: 'address[]', type: 'address[]' }],
    stateMutability: 'view'
  },
  {
    type: 'function',
    inputs: [{ name: 'electionId', internalType: 'uint256', type: 'uint256' }],
    name: 'getElectionWinners',
    outputs: [{ name: '', internalType: 'address[]', type: 'address[]' }],
    stateMutability: 'view'
  },
  {
    type: 'function',
    inputs: [],
    name: 'getNextElectionId',
    outputs: [{ name: '', internalType: 'uint256', type: 'uint256' }],
    stateMutability: 'view'
  },
  {
    type: 'function',
    inputs: [],
    name: 'getOfficerAddress',
    outputs: [{ name: '', internalType: 'address', type: 'address' }],
    stateMutability: 'view'
  },
  {
    type: 'function',
    inputs: [{ name: 'electionId', internalType: 'uint256', type: 'uint256' }],
    name: 'getVoteCount',
    outputs: [{ name: '', internalType: 'uint256', type: 'uint256' }],
    stateMutability: 'view'
  },
  {
    type: 'function',
    inputs: [
      { name: 'electionId', internalType: 'uint256', type: 'uint256' },
      { name: 'candidate', internalType: 'address', type: 'address' }
    ],
    name: 'getVoteCounts',
    outputs: [{ name: '', internalType: 'uint256', type: 'uint256' }],
    stateMutability: 'view'
  },
  {
    type: 'function',
    inputs: [
      { name: 'electionId', internalType: 'uint256', type: 'uint256' },
      { name: 'voter', internalType: 'address', type: 'address' }
    ],
    name: 'getVoterChoice',
    outputs: [{ name: '', internalType: 'address', type: 'address' }],
    stateMutability: 'view'
  },
  {
    type: 'function',
    inputs: [
      { name: 'electionId', internalType: 'uint256', type: 'uint256' },
      { name: 'voter', internalType: 'address', type: 'address' }
    ],
    name: 'hasVoted',
    outputs: [{ name: '', internalType: 'bool', type: 'bool' }],
    stateMutability: 'view'
  },
  {
    type: 'function',
    inputs: [{ name: 'ownerAddress', internalType: 'address', type: 'address' }],
    name: 'initialize',
    outputs: [],
    stateMutability: 'nonpayable'
  },
  {
    type: 'function',
    inputs: [
      { name: 'electionId', internalType: 'uint256', type: 'uint256' },
      { name: 'voter', internalType: 'address', type: 'address' }
    ],
    name: 'isEligibleVoter',
    outputs: [{ name: '', internalType: 'bool', type: 'bool' }],
    stateMutability: 'view'
  },
  {
    type: 'function',
    inputs: [],
    name: 'owner',
    outputs: [{ name: '', internalType: 'address', type: 'address' }],
    stateMutability: 'view'
  },
  {
    type: 'function',
    inputs: [],
    name: 'pause',
    outputs: [],
    stateMutability: 'nonpayable'
  },
  {
    type: 'function',
    inputs: [],
    name: 'paused',
    outputs: [{ name: '', internalType: 'bool', type: 'bool' }],
    stateMutability: 'view'
  },
  {
    type: 'function',
    inputs: [{ name: 'electionId', internalType: 'uint256', type: 'uint256' }],
    name: 'publishResults',
    outputs: [],
    stateMutability: 'nonpayable'
  },
  {
    type: 'function',
    inputs: [],
    name: 'renounceOwnership',
    outputs: [],
    stateMutability: 'nonpayable'
  },
  {
    type: 'function',
    inputs: [{ name: 'newOwner', internalType: 'address', type: 'address' }],
    name: 'transferOwnership',
    outputs: [],
    stateMutability: 'nonpayable'
  },
  {
    type: 'function',
    inputs: [],
    name: 'unpause',
    outputs: [],
    stateMutability: 'nonpayable'
  },
  {
    type: 'function',
    inputs: [],
    name: 'version',
    outputs: [{ name: '', internalType: 'string', type: 'string' }],
    stateMutability: 'pure'
  }
] as const

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// ExpenseAccountEIP712
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

export const expenseAccountEip712Abi = [
  { type: 'constructor', inputs: [], stateMutability: 'nonpayable' },
  { type: 'error', inputs: [], name: 'ECDSAInvalidSignature' },
  {
    type: 'error',
    inputs: [{ name: 'length', internalType: 'uint256', type: 'uint256' }],
    name: 'ECDSAInvalidSignatureLength'
  },
  {
    type: 'error',
    inputs: [{ name: 's', internalType: 'bytes32', type: 'bytes32' }],
    name: 'ECDSAInvalidSignatureS'
  },
  { type: 'error', inputs: [], name: 'EnforcedPause' },
  { type: 'error', inputs: [], name: 'ExpectedPause' },
  {
    type: 'error',
    inputs: [],
    name: 'ExpenseAccountEIP712__AmountExceedsBudgetLimit'
  },
  {
    type: 'error',
    inputs: [],
    name: 'ExpenseAccountEIP712__AmountExceedsPeriodBudget'
  },
  {
    type: 'error',
    inputs: [{ name: 'amount', internalType: 'uint256', type: 'uint256' }],
    name: 'ExpenseAccountEIP712__AmountPerPeriodExceeded'
  },
  {
    type: 'error',
    inputs: [{ name: 'amount', internalType: 'uint256', type: 'uint256' }],
    name: 'ExpenseAccountEIP712__AmountPerTransactionExceeded'
  },
  {
    type: 'error',
    inputs: [
      { name: 'currentTime', internalType: 'uint256', type: 'uint256' },
      { name: 'endDate', internalType: 'uint256', type: 'uint256' }
    ],
    name: 'ExpenseAccountEIP712__ApprovalExpired'
  },
  {
    type: 'error',
    inputs: [
      { name: 'currentTime', internalType: 'uint256', type: 'uint256' },
      { name: 'startDate', internalType: 'uint256', type: 'uint256' }
    ],
    name: 'ExpenseAccountEIP712__ApprovalNotActive'
  },
  {
    type: 'error',
    inputs: [],
    name: 'ExpenseAccountEIP712__BankContractNotFound'
  },
  {
    type: 'error',
    inputs: [
      { name: 'required', internalType: 'uint256', type: 'uint256' },
      { name: 'available', internalType: 'uint256', type: 'uint256' }
    ],
    name: 'ExpenseAccountEIP712__InsufficientNativeBalance'
  },
  {
    type: 'error',
    inputs: [
      { name: 'token', internalType: 'address', type: 'address' },
      { name: 'required', internalType: 'uint256', type: 'uint256' },
      { name: 'available', internalType: 'uint256', type: 'uint256' }
    ],
    name: 'ExpenseAccountEIP712__InsufficientTokenBalance'
  },
  {
    type: 'error',
    inputs: [],
    name: 'ExpenseAccountEIP712__InvalidCustomFrequency'
  },
  {
    type: 'error',
    inputs: [],
    name: 'ExpenseAccountEIP712__InvalidFrequencyType'
  },
  {
    type: 'error',
    inputs: [],
    name: 'ExpenseAccountEIP712__OfficerAddressNotSet'
  },
  {
    type: 'error',
    inputs: [],
    name: 'ExpenseAccountEIP712__OneTimeBudgetAlreadyUsed'
  },
  {
    type: 'error',
    inputs: [
      { name: 'expected', internalType: 'address', type: 'address' },
      { name: 'actual', internalType: 'address', type: 'address' }
    ],
    name: 'ExpenseAccountEIP712__SignerNotAuthorized'
  },
  {
    type: 'error',
    inputs: [
      { name: 'expected', internalType: 'address', type: 'address' },
      { name: 'actual', internalType: 'address', type: 'address' }
    ],
    name: 'ExpenseAccountEIP712__SpenderNotApproved'
  },
  {
    type: 'error',
    inputs: [{ name: 'token', internalType: 'address', type: 'address' }],
    name: 'ExpenseAccountEIP712__TokenNotSupported'
  },
  {
    type: 'error',
    inputs: [],
    name: 'ExpenseAccountEIP712__TransferNotAllowed'
  },
  {
    type: 'error',
    inputs: [
      { name: 'expected', internalType: 'address', type: 'address' },
      { name: 'received', internalType: 'address', type: 'address' }
    ],
    name: 'ExpenseAccountEIP712__UnauthorizedAccess'
  },
  { type: 'error', inputs: [], name: 'ExpenseAccountEIP712__ZeroAddress' },
  { type: 'error', inputs: [], name: 'ExpenseAccountEIP712__ZeroAmount' },
  { type: 'error', inputs: [], name: 'FailedCall' },
  {
    type: 'error',
    inputs: [
      { name: 'balance', internalType: 'uint256', type: 'uint256' },
      { name: 'needed', internalType: 'uint256', type: 'uint256' }
    ],
    name: 'InsufficientBalance'
  },
  { type: 'error', inputs: [], name: 'InvalidInitialization' },
  { type: 'error', inputs: [], name: 'NotInitializing' },
  {
    type: 'error',
    inputs: [{ name: 'owner', internalType: 'address', type: 'address' }],
    name: 'OwnableInvalidOwner'
  },
  {
    type: 'error',
    inputs: [{ name: 'account', internalType: 'address', type: 'address' }],
    name: 'OwnableUnauthorizedAccount'
  },
  { type: 'error', inputs: [], name: 'ReentrancyGuardReentrantCall' },
  {
    type: 'error',
    inputs: [{ name: 'token', internalType: 'address', type: 'address' }],
    name: 'SafeERC20FailedOperation'
  },
  {
    type: 'error',
    inputs: [{ name: 'token', internalType: 'address', type: 'address' }],
    name: 'TokenSupport__AlreadyAdded'
  },
  {
    type: 'error',
    inputs: [{ name: 'token', internalType: 'address', type: 'address' }],
    name: 'TokenSupport__NotFound'
  },
  { type: 'error', inputs: [], name: 'TokenSupport__ZeroAddress' },
  {
    type: 'event',
    anonymous: false,
    inputs: [
      {
        name: 'signatureHash',
        internalType: 'bytes32',
        type: 'bytes32',
        indexed: true
      }
    ],
    name: 'ApprovalActivated'
  },
  {
    type: 'event',
    anonymous: false,
    inputs: [
      {
        name: 'signatureHash',
        internalType: 'bytes32',
        type: 'bytes32',
        indexed: true
      }
    ],
    name: 'ApprovalDeactivated'
  },
  {
    type: 'event',
    anonymous: false,
    inputs: [
      {
        name: 'depositor',
        internalType: 'address',
        type: 'address',
        indexed: true
      },
      {
        name: 'amount',
        internalType: 'uint256',
        type: 'uint256',
        indexed: false
      }
    ],
    name: 'Deposited'
  },
  { type: 'event', anonymous: false, inputs: [], name: 'EIP712DomainChanged' },
  {
    type: 'event',
    anonymous: false,
    inputs: [
      {
        name: 'version',
        internalType: 'uint64',
        type: 'uint64',
        indexed: false
      }
    ],
    name: 'Initialized'
  },
  {
    type: 'event',
    anonymous: false,
    inputs: [
      {
        name: 'ownerAddress',
        internalType: 'address',
        type: 'address',
        indexed: true
      },
      {
        name: 'amount',
        internalType: 'uint256',
        type: 'uint256',
        indexed: false
      }
    ],
    name: 'OwnerTreasuryWithdrawNative'
  },
  {
    type: 'event',
    anonymous: false,
    inputs: [
      {
        name: 'ownerAddress',
        internalType: 'address',
        type: 'address',
        indexed: true
      },
      {
        name: 'token',
        internalType: 'address',
        type: 'address',
        indexed: true
      },
      {
        name: 'amount',
        internalType: 'uint256',
        type: 'uint256',
        indexed: false
      }
    ],
    name: 'OwnerTreasuryWithdrawToken'
  },
  {
    type: 'event',
    anonymous: false,
    inputs: [
      {
        name: 'previousOwner',
        internalType: 'address',
        type: 'address',
        indexed: true
      },
      {
        name: 'newOwner',
        internalType: 'address',
        type: 'address',
        indexed: true
      }
    ],
    name: 'OwnershipTransferred'
  },
  {
    type: 'event',
    anonymous: false,
    inputs: [
      {
        name: 'account',
        internalType: 'address',
        type: 'address',
        indexed: false
      }
    ],
    name: 'Paused'
  },
  {
    type: 'event',
    anonymous: false,
    inputs: [
      {
        name: 'addressWhoChanged',
        internalType: 'address',
        type: 'address',
        indexed: true
      },
      {
        name: 'tokenSymbol',
        internalType: 'string',
        type: 'string',
        indexed: false
      },
      {
        name: 'oldAddress',
        internalType: 'address',
        type: 'address',
        indexed: true
      },
      {
        name: 'newAddress',
        internalType: 'address',
        type: 'address',
        indexed: true
      }
    ],
    name: 'TokenAddressChanged'
  },
  {
    type: 'event',
    anonymous: false,
    inputs: [
      {
        name: 'depositor',
        internalType: 'address',
        type: 'address',
        indexed: true
      },
      {
        name: 'token',
        internalType: 'address',
        type: 'address',
        indexed: true
      },
      {
        name: 'amount',
        internalType: 'uint256',
        type: 'uint256',
        indexed: false
      }
    ],
    name: 'TokenDeposited'
  },
  {
    type: 'event',
    anonymous: false,
    inputs: [
      {
        name: 'tokenAddress',
        internalType: 'address',
        type: 'address',
        indexed: true
      }
    ],
    name: 'TokenSupportAdded'
  },
  {
    type: 'event',
    anonymous: false,
    inputs: [
      {
        name: 'tokenAddress',
        internalType: 'address',
        type: 'address',
        indexed: true
      }
    ],
    name: 'TokenSupportRemoved'
  },
  {
    type: 'event',
    anonymous: false,
    inputs: [
      {
        name: 'withdrawer',
        internalType: 'address',
        type: 'address',
        indexed: true
      },
      { name: 'to', internalType: 'address', type: 'address', indexed: true },
      {
        name: 'token',
        internalType: 'address',
        type: 'address',
        indexed: true
      },
      {
        name: 'amount',
        internalType: 'uint256',
        type: 'uint256',
        indexed: false
      }
    ],
    name: 'TokenTransfer'
  },
  {
    type: 'event',
    anonymous: false,
    inputs: [
      {
        name: 'withdrawer',
        internalType: 'address',
        type: 'address',
        indexed: true
      },
      { name: 'to', internalType: 'address', type: 'address', indexed: true },
      {
        name: 'amount',
        internalType: 'uint256',
        type: 'uint256',
        indexed: false
      }
    ],
    name: 'Transfer'
  },
  {
    type: 'event',
    anonymous: false,
    inputs: [
      {
        name: 'account',
        internalType: 'address',
        type: 'address',
        indexed: false
      }
    ],
    name: 'Unpaused'
  },
  {
    type: 'function',
    inputs: [{ name: 'signatureHash', internalType: 'bytes32', type: 'bytes32' }],
    name: 'activateApproval',
    outputs: [],
    stateMutability: 'nonpayable'
  },
  {
    type: 'function',
    inputs: [{ name: 'tokenAddress', internalType: 'address', type: 'address' }],
    name: 'addTokenSupport',
    outputs: [],
    stateMutability: 'nonpayable'
  },
  {
    type: 'function',
    inputs: [
      {
        name: 'budgetLimit',
        internalType: 'struct ExpenseAccountEIP712.BudgetLimit',
        type: 'tuple',
        components: [
          { name: 'amount', internalType: 'uint256', type: 'uint256' },
          {
            name: 'frequencyType',
            internalType: 'enum ExpenseAccountEIP712.FrequencyType',
            type: 'uint8'
          },
          { name: 'customFrequency', internalType: 'uint256', type: 'uint256' },
          { name: 'startDate', internalType: 'uint256', type: 'uint256' },
          { name: 'endDate', internalType: 'uint256', type: 'uint256' },
          { name: 'tokenAddress', internalType: 'address', type: 'address' },
          { name: 'approvedAddress', internalType: 'address', type: 'address' }
        ]
      }
    ],
    name: 'budgetLimitHash',
    outputs: [{ name: '', internalType: 'bytes32', type: 'bytes32' }],
    stateMutability: 'pure'
  },
  {
    type: 'function',
    inputs: [{ name: 'signatureHash', internalType: 'bytes32', type: 'bytes32' }],
    name: 'deactivateApproval',
    outputs: [],
    stateMutability: 'nonpayable'
  },
  {
    type: 'function',
    inputs: [
      { name: 'token', internalType: 'address', type: 'address' },
      { name: 'amount', internalType: 'uint256', type: 'uint256' }
    ],
    name: 'depositToken',
    outputs: [],
    stateMutability: 'nonpayable'
  },
  {
    type: 'function',
    inputs: [],
    name: 'eip712Domain',
    outputs: [
      { name: 'fields', internalType: 'bytes1', type: 'bytes1' },
      { name: 'name', internalType: 'string', type: 'string' },
      { name: 'version', internalType: 'string', type: 'string' },
      { name: 'chainId', internalType: 'uint256', type: 'uint256' },
      { name: 'verifyingContract', internalType: 'address', type: 'address' },
      { name: 'salt', internalType: 'bytes32', type: 'bytes32' },
      { name: 'extensions', internalType: 'uint256[]', type: 'uint256[]' }
    ],
    stateMutability: 'view'
  },
  {
    type: 'function',
    inputs: [],
    name: 'getBalance',
    outputs: [{ name: '', internalType: 'uint256', type: 'uint256' }],
    stateMutability: 'view'
  },
  {
    type: 'function',
    inputs: [
      {
        name: 'budgetLimit',
        internalType: 'struct ExpenseAccountEIP712.BudgetLimit',
        type: 'tuple',
        components: [
          { name: 'amount', internalType: 'uint256', type: 'uint256' },
          {
            name: 'frequencyType',
            internalType: 'enum ExpenseAccountEIP712.FrequencyType',
            type: 'uint8'
          },
          { name: 'customFrequency', internalType: 'uint256', type: 'uint256' },
          { name: 'startDate', internalType: 'uint256', type: 'uint256' },
          { name: 'endDate', internalType: 'uint256', type: 'uint256' },
          { name: 'tokenAddress', internalType: 'address', type: 'address' },
          { name: 'approvedAddress', internalType: 'address', type: 'address' }
        ]
      }
    ],
    name: 'getCurrentPeriod',
    outputs: [{ name: '', internalType: 'uint256', type: 'uint256' }],
    stateMutability: 'view'
  },
  {
    type: 'function',
    inputs: [{ name: 'signatureHash', internalType: 'bytes32', type: 'bytes32' }],
    name: 'getExpenseBalance',
    outputs: [
      {
        name: '',
        internalType: 'struct ExpenseAccountEIP712.ExpenseBalance',
        type: 'tuple',
        components: [
          {
            name: 'lastWithdrawnDate',
            internalType: 'uint256',
            type: 'uint256'
          },
          { name: 'totalWithdrawn', internalType: 'uint256', type: 'uint256' },
          {
            name: 'lastWithdrawnPeriod',
            internalType: 'uint256',
            type: 'uint256'
          },
          {
            name: 'state',
            internalType: 'enum ExpenseAccountEIP712.ApprovalState',
            type: 'uint8'
          }
        ]
      }
    ],
    stateMutability: 'view'
  },
  {
    type: 'function',
    inputs: [],
    name: 'getOfficerAddress',
    outputs: [{ name: '', internalType: 'address', type: 'address' }],
    stateMutability: 'view'
  },
  {
    type: 'function',
    inputs: [
      {
        name: 'budgetLimit',
        internalType: 'struct ExpenseAccountEIP712.BudgetLimit',
        type: 'tuple',
        components: [
          { name: 'amount', internalType: 'uint256', type: 'uint256' },
          {
            name: 'frequencyType',
            internalType: 'enum ExpenseAccountEIP712.FrequencyType',
            type: 'uint8'
          },
          { name: 'customFrequency', internalType: 'uint256', type: 'uint256' },
          { name: 'startDate', internalType: 'uint256', type: 'uint256' },
          { name: 'endDate', internalType: 'uint256', type: 'uint256' },
          { name: 'tokenAddress', internalType: 'address', type: 'address' },
          { name: 'approvedAddress', internalType: 'address', type: 'address' }
        ]
      },
      { name: 'timestamp', internalType: 'uint256', type: 'uint256' }
    ],
    name: 'getPeriod',
    outputs: [{ name: '', internalType: 'uint256', type: 'uint256' }],
    stateMutability: 'pure'
  },
  {
    type: 'function',
    inputs: [],
    name: 'getSupportedTokenCount',
    outputs: [{ name: '', internalType: 'uint256', type: 'uint256' }],
    stateMutability: 'view'
  },
  {
    type: 'function',
    inputs: [],
    name: 'getSupportedTokens',
    outputs: [{ name: '', internalType: 'address[]', type: 'address[]' }],
    stateMutability: 'view'
  },
  {
    type: 'function',
    inputs: [{ name: 'token', internalType: 'address', type: 'address' }],
    name: 'getTokenBalance',
    outputs: [{ name: '', internalType: 'uint256', type: 'uint256' }],
    stateMutability: 'view'
  },
  {
    type: 'function',
    inputs: [
      { name: 'owner', internalType: 'address', type: 'address' },
      { name: 'tokenAddresses', internalType: 'address[]', type: 'address[]' }
    ],
    name: 'initialize',
    outputs: [],
    stateMutability: 'nonpayable'
  },
  {
    type: 'function',
    inputs: [
      {
        name: 'budgetLimit',
        internalType: 'struct ExpenseAccountEIP712.BudgetLimit',
        type: 'tuple',
        components: [
          { name: 'amount', internalType: 'uint256', type: 'uint256' },
          {
            name: 'frequencyType',
            internalType: 'enum ExpenseAccountEIP712.FrequencyType',
            type: 'uint8'
          },
          { name: 'customFrequency', internalType: 'uint256', type: 'uint256' },
          { name: 'startDate', internalType: 'uint256', type: 'uint256' },
          { name: 'endDate', internalType: 'uint256', type: 'uint256' },
          { name: 'tokenAddress', internalType: 'address', type: 'address' },
          { name: 'approvedAddress', internalType: 'address', type: 'address' }
        ]
      },
      { name: 'signatureHash', internalType: 'bytes32', type: 'bytes32' }
    ],
    name: 'isNewPeriod',
    outputs: [{ name: '', internalType: 'bool', type: 'bool' }],
    stateMutability: 'view'
  },
  {
    type: 'function',
    inputs: [{ name: 'token', internalType: 'address', type: 'address' }],
    name: 'isTokenSupported',
    outputs: [{ name: '', internalType: 'bool', type: 'bool' }],
    stateMutability: 'view'
  },
  {
    type: 'function',
    inputs: [],
    name: 'owner',
    outputs: [{ name: '', internalType: 'address', type: 'address' }],
    stateMutability: 'view'
  },
  {
    type: 'function',
    inputs: [],
    name: 'ownerWithdrawAllToBank',
    outputs: [],
    stateMutability: 'nonpayable'
  },
  {
    type: 'function',
    inputs: [],
    name: 'pause',
    outputs: [],
    stateMutability: 'nonpayable'
  },
  {
    type: 'function',
    inputs: [],
    name: 'paused',
    outputs: [{ name: '', internalType: 'bool', type: 'bool' }],
    stateMutability: 'view'
  },
  {
    type: 'function',
    inputs: [{ name: 'tokenAddress', internalType: 'address', type: 'address' }],
    name: 'removeTokenSupport',
    outputs: [],
    stateMutability: 'nonpayable'
  },
  {
    type: 'function',
    inputs: [],
    name: 'renounceOwnership',
    outputs: [],
    stateMutability: 'nonpayable'
  },
  {
    type: 'function',
    inputs: [{ name: 'officerAddress', internalType: 'address', type: 'address' }],
    name: 'setOfficerAddress',
    outputs: [],
    stateMutability: 'nonpayable'
  },
  {
    type: 'function',
    inputs: [
      { name: 'to', internalType: 'address', type: 'address' },
      { name: 'amount', internalType: 'uint256', type: 'uint256' },
      {
        name: 'budgetLimit',
        internalType: 'struct ExpenseAccountEIP712.BudgetLimit',
        type: 'tuple',
        components: [
          { name: 'amount', internalType: 'uint256', type: 'uint256' },
          {
            name: 'frequencyType',
            internalType: 'enum ExpenseAccountEIP712.FrequencyType',
            type: 'uint8'
          },
          { name: 'customFrequency', internalType: 'uint256', type: 'uint256' },
          { name: 'startDate', internalType: 'uint256', type: 'uint256' },
          { name: 'endDate', internalType: 'uint256', type: 'uint256' },
          { name: 'tokenAddress', internalType: 'address', type: 'address' },
          { name: 'approvedAddress', internalType: 'address', type: 'address' }
        ]
      },
      { name: 'signature', internalType: 'bytes', type: 'bytes' }
    ],
    name: 'transfer',
    outputs: [],
    stateMutability: 'nonpayable'
  },
  {
    type: 'function',
    inputs: [{ name: 'newOwner', internalType: 'address', type: 'address' }],
    name: 'transferOwnership',
    outputs: [],
    stateMutability: 'nonpayable'
  },
  {
    type: 'function',
    inputs: [],
    name: 'unpause',
    outputs: [],
    stateMutability: 'nonpayable'
  },
  {
    type: 'function',
    inputs: [
      {
        name: 'budgetLimit',
        internalType: 'struct ExpenseAccountEIP712.BudgetLimit',
        type: 'tuple',
        components: [
          { name: 'amount', internalType: 'uint256', type: 'uint256' },
          {
            name: 'frequencyType',
            internalType: 'enum ExpenseAccountEIP712.FrequencyType',
            type: 'uint8'
          },
          { name: 'customFrequency', internalType: 'uint256', type: 'uint256' },
          { name: 'startDate', internalType: 'uint256', type: 'uint256' },
          { name: 'endDate', internalType: 'uint256', type: 'uint256' },
          { name: 'tokenAddress', internalType: 'address', type: 'address' },
          { name: 'approvedAddress', internalType: 'address', type: 'address' }
        ]
      },
      { name: 'amount', internalType: 'uint256', type: 'uint256' },
      { name: 'signatureHash', internalType: 'bytes32', type: 'bytes32' }
    ],
    name: 'validateTransfer',
    outputs: [{ name: '', internalType: 'bool', type: 'bool' }],
    stateMutability: 'view'
  },
  {
    type: 'function',
    inputs: [],
    name: 'version',
    outputs: [{ name: '', internalType: 'string', type: 'string' }],
    stateMutability: 'pure'
  },
  { type: 'receive', stateMutability: 'payable' }
] as const

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// FactoryBeacon
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

export const factoryBeaconAbi = [
  {
    type: 'constructor',
    inputs: [
      {
        name: 'implementationAddress',
        internalType: 'address',
        type: 'address'
      }
    ],
    stateMutability: 'nonpayable'
  },
  {
    type: 'error',
    inputs: [{ name: 'implementation', internalType: 'address', type: 'address' }],
    name: 'BeaconInvalidImplementation'
  },
  {
    type: 'error',
    inputs: [{ name: 'owner', internalType: 'address', type: 'address' }],
    name: 'OwnableInvalidOwner'
  },
  {
    type: 'error',
    inputs: [{ name: 'account', internalType: 'address', type: 'address' }],
    name: 'OwnableUnauthorizedAccount'
  },
  {
    type: 'event',
    anonymous: false,
    inputs: [
      {
        name: 'proxy',
        internalType: 'address',
        type: 'address',
        indexed: true
      },
      {
        name: 'deployer',
        internalType: 'address',
        type: 'address',
        indexed: true
      }
    ],
    name: 'BeaconProxyCreated'
  },
  {
    type: 'event',
    anonymous: false,
    inputs: [
      {
        name: 'previousOwner',
        internalType: 'address',
        type: 'address',
        indexed: true
      },
      {
        name: 'newOwner',
        internalType: 'address',
        type: 'address',
        indexed: true
      }
    ],
    name: 'OwnershipTransferred'
  },
  {
    type: 'event',
    anonymous: false,
    inputs: [
      {
        name: 'implementation',
        internalType: 'address',
        type: 'address',
        indexed: true
      }
    ],
    name: 'Upgraded'
  },
  {
    type: 'function',
    inputs: [{ name: 'data', internalType: 'bytes', type: 'bytes' }],
    name: 'createBeaconProxy',
    outputs: [],
    stateMutability: 'nonpayable'
  },
  {
    type: 'function',
    inputs: [],
    name: 'implementation',
    outputs: [{ name: '', internalType: 'address', type: 'address' }],
    stateMutability: 'view'
  },
  {
    type: 'function',
    inputs: [],
    name: 'owner',
    outputs: [{ name: '', internalType: 'address', type: 'address' }],
    stateMutability: 'view'
  },
  {
    type: 'function',
    inputs: [],
    name: 'renounceOwnership',
    outputs: [],
    stateMutability: 'nonpayable'
  },
  {
    type: 'function',
    inputs: [{ name: 'newOwner', internalType: 'address', type: 'address' }],
    name: 'transferOwnership',
    outputs: [],
    stateMutability: 'nonpayable'
  },
  {
    type: 'function',
    inputs: [{ name: 'newImplementation', internalType: 'address', type: 'address' }],
    name: 'upgradeTo',
    outputs: [],
    stateMutability: 'nonpayable'
  }
] as const

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// FixedReturn
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

export const fixedReturnAbi = [
  { type: 'constructor', inputs: [], stateMutability: 'nonpayable' },
  {
    type: 'error',
    inputs: [],
    name: 'FixedReturn__AllocationSumBelowFundingTarget'
  },
  { type: 'error', inputs: [], name: 'FixedReturn__BankContractNotFound' },
  { type: 'error', inputs: [], name: 'FixedReturn__DeadlineNotPassed' },
  { type: 'error', inputs: [], name: 'FixedReturn__DepositExceedsAllocation' },
  { type: 'error', inputs: [], name: 'FixedReturn__DepositExceedsLenderCap' },
  { type: 'error', inputs: [], name: 'FixedReturn__DuplicateWhitelistAddress' },
  {
    type: 'error',
    inputs: [],
    name: 'FixedReturn__ExceedsRepaymentObligation'
  },
  { type: 'error', inputs: [], name: 'FixedReturn__FundingTargetReached' },
  { type: 'error', inputs: [], name: 'FixedReturn__InvalidDeadline' },
  { type: 'error', inputs: [], name: 'FixedReturn__InvalidMaturityDate' },
  {
    type: 'error',
    inputs: [],
    name: 'FixedReturn__LenderCapExceedsFundingTarget'
  },
  { type: 'error', inputs: [], name: 'FixedReturn__NoFundsRaised' },
  {
    type: 'error',
    inputs: [{ name: 'caller', internalType: 'address', type: 'address' }],
    name: 'FixedReturn__NotBank'
  },
  { type: 'error', inputs: [], name: 'FixedReturn__NotWhitelisted' },
  { type: 'error', inputs: [], name: 'FixedReturn__OfferNotFunded' },
  { type: 'error', inputs: [], name: 'FixedReturn__OfferNotOpen' },
  {
    type: 'error',
    inputs: [{ name: 'token', internalType: 'address', type: 'address' }],
    name: 'FixedReturn__TokenNotSupportedByBank'
  },
  { type: 'error', inputs: [], name: 'FixedReturn__WhitelistLengthMismatch' },
  { type: 'error', inputs: [], name: 'FixedReturn__ZeroAddress' },
  { type: 'error', inputs: [], name: 'FixedReturn__ZeroAmount' },
  { type: 'error', inputs: [], name: 'InvalidInitialization' },
  { type: 'error', inputs: [], name: 'NotInitializing' },
  {
    type: 'error',
    inputs: [{ name: 'owner', internalType: 'address', type: 'address' }],
    name: 'OwnableInvalidOwner'
  },
  {
    type: 'error',
    inputs: [{ name: 'account', internalType: 'address', type: 'address' }],
    name: 'OwnableUnauthorizedAccount'
  },
  { type: 'error', inputs: [], name: 'ReentrancyGuardReentrantCall' },
  {
    type: 'error',
    inputs: [{ name: 'token', internalType: 'address', type: 'address' }],
    name: 'SafeERC20FailedOperation'
  },
  {
    type: 'error',
    inputs: [{ name: 'token', internalType: 'address', type: 'address' }],
    name: 'TokenSupport__AlreadyAdded'
  },
  {
    type: 'error',
    inputs: [{ name: 'token', internalType: 'address', type: 'address' }],
    name: 'TokenSupport__NotFound'
  },
  { type: 'error', inputs: [], name: 'TokenSupport__ZeroAddress' },
  {
    type: 'event',
    anonymous: false,
    inputs: [
      {
        name: 'offerId',
        internalType: 'uint256',
        type: 'uint256',
        indexed: true
      },
      {
        name: 'lender',
        internalType: 'address',
        type: 'address',
        indexed: true
      },
      {
        name: 'amount',
        internalType: 'uint256',
        type: 'uint256',
        indexed: false
      }
    ],
    name: 'FundsLent'
  },
  {
    type: 'event',
    anonymous: false,
    inputs: [
      {
        name: 'version',
        internalType: 'uint64',
        type: 'uint64',
        indexed: false
      }
    ],
    name: 'Initialized'
  },
  {
    type: 'event',
    anonymous: false,
    inputs: [
      {
        name: 'offerId',
        internalType: 'uint256',
        type: 'uint256',
        indexed: true
      },
      {
        name: 'lender',
        internalType: 'address',
        type: 'address',
        indexed: true
      },
      {
        name: 'amount',
        internalType: 'uint256',
        type: 'uint256',
        indexed: false
      }
    ],
    name: 'LenderRepaid'
  },
  {
    type: 'event',
    anonymous: false,
    inputs: [
      {
        name: 'offerId',
        internalType: 'uint256',
        type: 'uint256',
        indexed: true
      },
      {
        name: 'token',
        internalType: 'address',
        type: 'address',
        indexed: true
      },
      {
        name: 'fundingTarget',
        internalType: 'uint256',
        type: 'uint256',
        indexed: false
      },
      {
        name: 'interestRateBps',
        internalType: 'uint256',
        type: 'uint256',
        indexed: false
      },
      {
        name: 'subscriptionDeadline',
        internalType: 'uint256',
        type: 'uint256',
        indexed: false
      },
      {
        name: 'fundingAccess',
        internalType: 'enum FixedReturn.FundingAccess',
        type: 'uint8',
        indexed: false
      }
    ],
    name: 'LendingOfferCreated'
  },
  {
    type: 'event',
    anonymous: false,
    inputs: [
      {
        name: 'offerId',
        internalType: 'uint256',
        type: 'uint256',
        indexed: true
      }
    ],
    name: 'LendingOfferFunded'
  },
  {
    type: 'event',
    anonymous: false,
    inputs: [
      {
        name: 'offerId',
        internalType: 'uint256',
        type: 'uint256',
        indexed: true
      }
    ],
    name: 'LendingOfferRefundable'
  },
  {
    type: 'event',
    anonymous: false,
    inputs: [
      {
        name: 'previousOwner',
        internalType: 'address',
        type: 'address',
        indexed: true
      },
      {
        name: 'newOwner',
        internalType: 'address',
        type: 'address',
        indexed: true
      }
    ],
    name: 'OwnershipTransferred'
  },
  {
    type: 'event',
    anonymous: false,
    inputs: [
      {
        name: 'offerId',
        internalType: 'uint256',
        type: 'uint256',
        indexed: true
      },
      {
        name: 'totalFunded',
        internalType: 'uint256',
        type: 'uint256',
        indexed: false
      },
      {
        name: 'fundingTarget',
        internalType: 'uint256',
        type: 'uint256',
        indexed: false
      }
    ],
    name: 'PartialFundingAccepted'
  },
  {
    type: 'event',
    anonymous: false,
    inputs: [
      {
        name: 'offerId',
        internalType: 'uint256',
        type: 'uint256',
        indexed: true
      },
      {
        name: 'lender',
        internalType: 'address',
        type: 'address',
        indexed: true
      },
      {
        name: 'amount',
        internalType: 'uint256',
        type: 'uint256',
        indexed: false
      }
    ],
    name: 'PrincipalRefunded'
  },
  {
    type: 'event',
    anonymous: false,
    inputs: [
      {
        name: 'offerId',
        internalType: 'uint256',
        type: 'uint256',
        indexed: true
      },
      {
        name: 'totalAmount',
        internalType: 'uint256',
        type: 'uint256',
        indexed: false
      }
    ],
    name: 'RefundsDistributed'
  },
  {
    type: 'event',
    anonymous: false,
    inputs: [
      {
        name: 'offerId',
        internalType: 'uint256',
        type: 'uint256',
        indexed: true
      },
      {
        name: 'totalAmount',
        internalType: 'uint256',
        type: 'uint256',
        indexed: false
      }
    ],
    name: 'RepaymentDistributed'
  },
  {
    type: 'event',
    anonymous: false,
    inputs: [
      {
        name: 'tokenAddress',
        internalType: 'address',
        type: 'address',
        indexed: true
      }
    ],
    name: 'TokenSupportAdded'
  },
  {
    type: 'event',
    anonymous: false,
    inputs: [
      {
        name: 'tokenAddress',
        internalType: 'address',
        type: 'address',
        indexed: true
      }
    ],
    name: 'TokenSupportRemoved'
  },
  {
    type: 'function',
    inputs: [],
    name: 'UNCAPPED_ALLOCATION',
    outputs: [{ name: '', internalType: 'uint256', type: 'uint256' }],
    stateMutability: 'view'
  },
  {
    type: 'function',
    inputs: [{ name: 'offerId', internalType: 'uint256', type: 'uint256' }],
    name: 'acceptPartialFunding',
    outputs: [],
    stateMutability: 'nonpayable'
  },
  {
    type: 'function',
    inputs: [{ name: 'tokenAddress', internalType: 'address', type: 'address' }],
    name: 'addTokenSupport',
    outputs: [],
    stateMutability: 'nonpayable'
  },
  {
    type: 'function',
    inputs: [
      {
        name: 'params',
        internalType: 'struct FixedReturn.CreateOfferParams',
        type: 'tuple',
        components: [
          { name: 'token', internalType: 'address', type: 'address' },
          { name: 'fundingTarget', internalType: 'uint256', type: 'uint256' },
          { name: 'interestRateBps', internalType: 'uint256', type: 'uint256' },
          { name: 'maturityDate', internalType: 'uint256', type: 'uint256' },
          {
            name: 'subscriptionDeadline',
            internalType: 'uint256',
            type: 'uint256'
          },
          {
            name: 'fundingAccess',
            internalType: 'enum FixedReturn.FundingAccess',
            type: 'uint8'
          },
          { name: 'isCapEnabled', internalType: 'bool', type: 'bool' },
          { name: 'lenderCap', internalType: 'uint256', type: 'uint256' },
          {
            name: 'whitelistAddrs',
            internalType: 'address[]',
            type: 'address[]'
          },
          { name: 'allocations', internalType: 'uint256[]', type: 'uint256[]' }
        ]
      }
    ],
    name: 'createLendingOffer',
    outputs: [{ name: 'offerId', internalType: 'uint256', type: 'uint256' }],
    stateMutability: 'nonpayable'
  },
  {
    type: 'function',
    inputs: [
      { name: 'offerId', internalType: 'uint256', type: 'uint256' },
      { name: 'lender', internalType: 'address', type: 'address' }
    ],
    name: 'getHasDeposited',
    outputs: [{ name: '', internalType: 'bool', type: 'bool' }],
    stateMutability: 'view'
  },
  {
    type: 'function',
    inputs: [
      { name: 'offerId', internalType: 'uint256', type: 'uint256' },
      { name: 'lender', internalType: 'address', type: 'address' }
    ],
    name: 'getLenderAllocation',
    outputs: [{ name: '', internalType: 'uint256', type: 'uint256' }],
    stateMutability: 'view'
  },
  {
    type: 'function',
    inputs: [
      { name: 'offerId', internalType: 'uint256', type: 'uint256' },
      { name: 'lender', internalType: 'address', type: 'address' }
    ],
    name: 'getLenderDeposits',
    outputs: [{ name: '', internalType: 'uint256', type: 'uint256' }],
    stateMutability: 'view'
  },
  {
    type: 'function',
    inputs: [{ name: 'offerId', internalType: 'uint256', type: 'uint256' }],
    name: 'getLendingOffer',
    outputs: [
      {
        name: '',
        internalType: 'struct FixedReturn.LendingOffer',
        type: 'tuple',
        components: [
          { name: 'token', internalType: 'address', type: 'address' },
          { name: 'fundingTarget', internalType: 'uint256', type: 'uint256' },
          { name: 'interestRateBps', internalType: 'uint256', type: 'uint256' },
          { name: 'maturityDate', internalType: 'uint256', type: 'uint256' },
          {
            name: 'subscriptionDeadline',
            internalType: 'uint256',
            type: 'uint256'
          },
          {
            name: 'fundingAccess',
            internalType: 'enum FixedReturn.FundingAccess',
            type: 'uint8'
          },
          { name: 'isCapEnabled', internalType: 'bool', type: 'bool' },
          { name: 'lenderCap', internalType: 'uint256', type: 'uint256' },
          { name: 'totalFunded', internalType: 'uint256', type: 'uint256' },
          {
            name: 'totalRepaidByIssuer',
            internalType: 'uint256',
            type: 'uint256'
          },
          {
            name: 'state',
            internalType: 'enum FixedReturn.OfferState',
            type: 'uint8'
          }
        ]
      }
    ],
    stateMutability: 'view'
  },
  {
    type: 'function',
    inputs: [{ name: 'offerId', internalType: 'uint256', type: 'uint256' }],
    name: 'getOfferLenders',
    outputs: [{ name: '', internalType: 'address[]', type: 'address[]' }],
    stateMutability: 'view'
  },
  {
    type: 'function',
    inputs: [],
    name: 'getOfficerAddress',
    outputs: [{ name: '', internalType: 'address', type: 'address' }],
    stateMutability: 'view'
  },
  {
    type: 'function',
    inputs: [],
    name: 'getSupportedTokenCount',
    outputs: [{ name: '', internalType: 'uint256', type: 'uint256' }],
    stateMutability: 'view'
  },
  {
    type: 'function',
    inputs: [],
    name: 'getSupportedTokens',
    outputs: [{ name: '', internalType: 'address[]', type: 'address[]' }],
    stateMutability: 'view'
  },
  {
    type: 'function',
    inputs: [],
    name: 'getTotalOfferings',
    outputs: [{ name: '', internalType: 'uint256', type: 'uint256' }],
    stateMutability: 'view'
  },
  {
    type: 'function',
    inputs: [
      { name: 'offerId', internalType: 'uint256', type: 'uint256' },
      { name: 'lender', internalType: 'address', type: 'address' }
    ],
    name: 'getTotalPaidToLender',
    outputs: [{ name: '', internalType: 'uint256', type: 'uint256' }],
    stateMutability: 'view'
  },
  {
    type: 'function',
    inputs: [
      { name: 'tokenAddresses', internalType: 'address[]', type: 'address[]' },
      { name: 'ownerAddress', internalType: 'address', type: 'address' }
    ],
    name: 'initialize',
    outputs: [],
    stateMutability: 'nonpayable'
  },
  {
    type: 'function',
    inputs: [{ name: 'token', internalType: 'address', type: 'address' }],
    name: 'isTokenSupported',
    outputs: [{ name: '', internalType: 'bool', type: 'bool' }],
    stateMutability: 'view'
  },
  {
    type: 'function',
    inputs: [
      { name: 'offerId', internalType: 'uint256', type: 'uint256' },
      { name: 'amount', internalType: 'uint256', type: 'uint256' }
    ],
    name: 'lendFunds',
    outputs: [],
    stateMutability: 'nonpayable'
  },
  {
    type: 'function',
    inputs: [],
    name: 'owner',
    outputs: [{ name: '', internalType: 'address', type: 'address' }],
    stateMutability: 'view'
  },
  {
    type: 'function',
    inputs: [{ name: 'offerId', internalType: 'uint256', type: 'uint256' }],
    name: 'refundLenders',
    outputs: [],
    stateMutability: 'nonpayable'
  },
  {
    type: 'function',
    inputs: [{ name: 'tokenAddress', internalType: 'address', type: 'address' }],
    name: 'removeTokenSupport',
    outputs: [],
    stateMutability: 'nonpayable'
  },
  {
    type: 'function',
    inputs: [],
    name: 'renounceOwnership',
    outputs: [],
    stateMutability: 'nonpayable'
  },
  {
    type: 'function',
    inputs: [
      { name: 'offerId', internalType: 'uint256', type: 'uint256' },
      { name: 'amount', internalType: 'uint256', type: 'uint256' }
    ],
    name: 'repayLenders',
    outputs: [],
    stateMutability: 'nonpayable'
  },
  {
    type: 'function',
    inputs: [
      { name: 'offerId', internalType: 'uint256', type: 'uint256' },
      { name: 'lender', internalType: 'address', type: 'address' }
    ],
    name: 'totalEntitlementOf',
    outputs: [{ name: '', internalType: 'uint256', type: 'uint256' }],
    stateMutability: 'view'
  },
  {
    type: 'function',
    inputs: [{ name: 'newOwner', internalType: 'address', type: 'address' }],
    name: 'transferOwnership',
    outputs: [],
    stateMutability: 'nonpayable'
  },
  {
    type: 'function',
    inputs: [],
    name: 'version',
    outputs: [{ name: '', internalType: 'string', type: 'string' }],
    stateMutability: 'pure'
  }
] as const

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// Investor
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

export const investorAbi = [
  { type: 'constructor', inputs: [], stateMutability: 'nonpayable' },
  { type: 'error', inputs: [], name: 'AccessControlBadConfirmation' },
  {
    type: 'error',
    inputs: [
      { name: 'account', internalType: 'address', type: 'address' },
      { name: 'neededRole', internalType: 'bytes32', type: 'bytes32' }
    ],
    name: 'AccessControlUnauthorizedAccount'
  },
  {
    type: 'error',
    inputs: [
      { name: 'spender', internalType: 'address', type: 'address' },
      { name: 'allowance', internalType: 'uint256', type: 'uint256' },
      { name: 'needed', internalType: 'uint256', type: 'uint256' }
    ],
    name: 'ERC20InsufficientAllowance'
  },
  {
    type: 'error',
    inputs: [
      { name: 'sender', internalType: 'address', type: 'address' },
      { name: 'balance', internalType: 'uint256', type: 'uint256' },
      { name: 'needed', internalType: 'uint256', type: 'uint256' }
    ],
    name: 'ERC20InsufficientBalance'
  },
  {
    type: 'error',
    inputs: [{ name: 'approver', internalType: 'address', type: 'address' }],
    name: 'ERC20InvalidApprover'
  },
  {
    type: 'error',
    inputs: [{ name: 'receiver', internalType: 'address', type: 'address' }],
    name: 'ERC20InvalidReceiver'
  },
  {
    type: 'error',
    inputs: [{ name: 'sender', internalType: 'address', type: 'address' }],
    name: 'ERC20InvalidSender'
  },
  {
    type: 'error',
    inputs: [{ name: 'spender', internalType: 'address', type: 'address' }],
    name: 'ERC20InvalidSpender'
  },
  { type: 'error', inputs: [], name: 'EnforcedPause' },
  { type: 'error', inputs: [], name: 'ExpectedPause' },
  { type: 'error', inputs: [], name: 'InvalidInitialization' },
  {
    type: 'error',
    inputs: [{ name: 'shareholder', internalType: 'address', type: 'address' }],
    name: 'Investor__AlreadyMigrated'
  },
  { type: 'error', inputs: [], name: 'Investor__BankContractNotFound' },
  {
    type: 'error',
    inputs: [],
    name: 'Investor__DividendsFrozenDuringMigration'
  },
  {
    type: 'error',
    inputs: [
      { name: 'token', internalType: 'address', type: 'address' },
      { name: 'required', internalType: 'uint256', type: 'uint256' },
      { name: 'available', internalType: 'uint256', type: 'uint256' }
    ],
    name: 'Investor__InsufficientFundedTokenBalance'
  },
  {
    type: 'error',
    inputs: [
      { name: 'expected', internalType: 'uint256', type: 'uint256' },
      { name: 'actual', internalType: 'uint256', type: 'uint256' }
    ],
    name: 'Investor__InvalidNativeFunding'
  },
  { type: 'error', inputs: [], name: 'Investor__InvalidProof' },
  { type: 'error', inputs: [], name: 'Investor__LengthMismatch' },
  { type: 'error', inputs: [], name: 'Investor__MigrationAlreadyComplete' },
  { type: 'error', inputs: [], name: 'Investor__MigrationRootNotSet' },
  {
    type: 'error',
    inputs: [{ name: 'to', internalType: 'address', type: 'address' }],
    name: 'Investor__NativeTransferFailed'
  },
  { type: 'error', inputs: [], name: 'Investor__NoShareholders' },
  { type: 'error', inputs: [], name: 'Investor__NoTokensMinted' },
  {
    type: 'error',
    inputs: [{ name: 'caller', internalType: 'address', type: 'address' }],
    name: 'Investor__NotBank'
  },
  { type: 'error', inputs: [], name: 'Investor__OfficerAddressNotSet' },
  { type: 'error', inputs: [], name: 'Investor__ZeroAddress' },
  { type: 'error', inputs: [], name: 'Investor__ZeroAmount' },
  { type: 'error', inputs: [], name: 'NotInitializing' },
  {
    type: 'error',
    inputs: [{ name: 'owner', internalType: 'address', type: 'address' }],
    name: 'OwnableInvalidOwner'
  },
  {
    type: 'error',
    inputs: [{ name: 'account', internalType: 'address', type: 'address' }],
    name: 'OwnableUnauthorizedAccount'
  },
  { type: 'error', inputs: [], name: 'ReentrancyGuardReentrantCall' },
  {
    type: 'error',
    inputs: [{ name: 'token', internalType: 'address', type: 'address' }],
    name: 'SafeERC20FailedOperation'
  },
  {
    type: 'event',
    anonymous: false,
    inputs: [
      {
        name: 'owner',
        internalType: 'address',
        type: 'address',
        indexed: true
      },
      {
        name: 'spender',
        internalType: 'address',
        type: 'address',
        indexed: true
      },
      {
        name: 'value',
        internalType: 'uint256',
        type: 'uint256',
        indexed: false
      }
    ],
    name: 'Approval'
  },
  {
    type: 'event',
    anonymous: false,
    inputs: [
      {
        name: 'distributor',
        internalType: 'address',
        type: 'address',
        indexed: true
      },
      {
        name: 'token',
        internalType: 'address',
        type: 'address',
        indexed: true
      },
      {
        name: 'totalAmount',
        internalType: 'uint256',
        type: 'uint256',
        indexed: false
      },
      {
        name: 'shareholderCount',
        internalType: 'uint256',
        type: 'uint256',
        indexed: false
      }
    ],
    name: 'DividendDistributed'
  },
  {
    type: 'event',
    anonymous: false,
    inputs: [
      {
        name: 'shareholder',
        internalType: 'address',
        type: 'address',
        indexed: true
      },
      {
        name: 'token',
        internalType: 'address',
        type: 'address',
        indexed: true
      },
      {
        name: 'amount',
        internalType: 'uint256',
        type: 'uint256',
        indexed: false
      }
    ],
    name: 'DividendPaid'
  },
  {
    type: 'event',
    anonymous: false,
    inputs: [
      {
        name: 'version',
        internalType: 'uint64',
        type: 'uint64',
        indexed: false
      }
    ],
    name: 'Initialized'
  },
  {
    type: 'event',
    anonymous: false,
    inputs: [
      {
        name: 'shareholder',
        internalType: 'address',
        type: 'address',
        indexed: true
      },
      {
        name: 'amount',
        internalType: 'uint256',
        type: 'uint256',
        indexed: false
      }
    ],
    name: 'MigrationClaimed'
  },
  { type: 'event', anonymous: false, inputs: [], name: 'MigrationCompleted' },
  {
    type: 'event',
    anonymous: false,
    inputs: [{ name: 'root', internalType: 'bytes32', type: 'bytes32', indexed: true }],
    name: 'MigrationRootSet'
  },
  {
    type: 'event',
    anonymous: false,
    inputs: [
      {
        name: 'shareholder',
        internalType: 'address',
        type: 'address',
        indexed: true
      },
      {
        name: 'amount',
        internalType: 'uint256',
        type: 'uint256',
        indexed: false
      }
    ],
    name: 'Minted'
  },
  {
    type: 'event',
    anonymous: false,
    inputs: [
      {
        name: 'previousOwner',
        internalType: 'address',
        type: 'address',
        indexed: true
      },
      {
        name: 'newOwner',
        internalType: 'address',
        type: 'address',
        indexed: true
      }
    ],
    name: 'OwnershipTransferred'
  },
  {
    type: 'event',
    anonymous: false,
    inputs: [
      {
        name: 'account',
        internalType: 'address',
        type: 'address',
        indexed: false
      }
    ],
    name: 'Paused'
  },
  {
    type: 'event',
    anonymous: false,
    inputs: [
      { name: 'role', internalType: 'bytes32', type: 'bytes32', indexed: true },
      {
        name: 'previousAdminRole',
        internalType: 'bytes32',
        type: 'bytes32',
        indexed: true
      },
      {
        name: 'newAdminRole',
        internalType: 'bytes32',
        type: 'bytes32',
        indexed: true
      }
    ],
    name: 'RoleAdminChanged'
  },
  {
    type: 'event',
    anonymous: false,
    inputs: [
      { name: 'role', internalType: 'bytes32', type: 'bytes32', indexed: true },
      {
        name: 'account',
        internalType: 'address',
        type: 'address',
        indexed: true
      },
      {
        name: 'sender',
        internalType: 'address',
        type: 'address',
        indexed: true
      }
    ],
    name: 'RoleGranted'
  },
  {
    type: 'event',
    anonymous: false,
    inputs: [
      { name: 'role', internalType: 'bytes32', type: 'bytes32', indexed: true },
      {
        name: 'account',
        internalType: 'address',
        type: 'address',
        indexed: true
      },
      {
        name: 'sender',
        internalType: 'address',
        type: 'address',
        indexed: true
      }
    ],
    name: 'RoleRevoked'
  },
  {
    type: 'event',
    anonymous: false,
    inputs: [
      { name: 'from', internalType: 'address', type: 'address', indexed: true },
      { name: 'to', internalType: 'address', type: 'address', indexed: true },
      {
        name: 'value',
        internalType: 'uint256',
        type: 'uint256',
        indexed: false
      }
    ],
    name: 'Transfer'
  },
  {
    type: 'event',
    anonymous: false,
    inputs: [
      {
        name: 'account',
        internalType: 'address',
        type: 'address',
        indexed: false
      }
    ],
    name: 'Unpaused'
  },
  {
    type: 'function',
    inputs: [],
    name: 'DEFAULT_ADMIN_ROLE',
    outputs: [{ name: '', internalType: 'bytes32', type: 'bytes32' }],
    stateMutability: 'view'
  },
  {
    type: 'function',
    inputs: [],
    name: 'MINTER_ROLE',
    outputs: [{ name: '', internalType: 'bytes32', type: 'bytes32' }],
    stateMutability: 'view'
  },
  {
    type: 'function',
    inputs: [
      { name: 'owner', internalType: 'address', type: 'address' },
      { name: 'spender', internalType: 'address', type: 'address' }
    ],
    name: 'allowance',
    outputs: [{ name: '', internalType: 'uint256', type: 'uint256' }],
    stateMutability: 'view'
  },
  {
    type: 'function',
    inputs: [
      { name: 'spender', internalType: 'address', type: 'address' },
      { name: 'value', internalType: 'uint256', type: 'uint256' }
    ],
    name: 'approve',
    outputs: [{ name: '', internalType: 'bool', type: 'bool' }],
    stateMutability: 'nonpayable'
  },
  {
    type: 'function',
    inputs: [{ name: 'account', internalType: 'address', type: 'address' }],
    name: 'balanceOf',
    outputs: [{ name: '', internalType: 'uint256', type: 'uint256' }],
    stateMutability: 'view'
  },
  {
    type: 'function',
    inputs: [
      { name: 'shareholders', internalType: 'address[]', type: 'address[]' },
      { name: 'amounts', internalType: 'uint256[]', type: 'uint256[]' },
      { name: 'proofs', internalType: 'bytes32[][]', type: 'bytes32[][]' }
    ],
    name: 'bulkClaim',
    outputs: [],
    stateMutability: 'nonpayable'
  },
  {
    type: 'function',
    inputs: [{ name: 'value', internalType: 'uint256', type: 'uint256' }],
    name: 'burn',
    outputs: [],
    stateMutability: 'nonpayable'
  },
  {
    type: 'function',
    inputs: [
      { name: 'account', internalType: 'address', type: 'address' },
      { name: 'value', internalType: 'uint256', type: 'uint256' }
    ],
    name: 'burnFrom',
    outputs: [],
    stateMutability: 'nonpayable'
  },
  {
    type: 'function',
    inputs: [
      { name: 'amount', internalType: 'uint256', type: 'uint256' },
      { name: 'proof', internalType: 'bytes32[]', type: 'bytes32[]' }
    ],
    name: 'claim',
    outputs: [],
    stateMutability: 'nonpayable'
  },
  {
    type: 'function',
    inputs: [],
    name: 'completeMigration',
    outputs: [],
    stateMutability: 'nonpayable'
  },
  {
    type: 'function',
    inputs: [],
    name: 'decimals',
    outputs: [{ name: '', internalType: 'uint8', type: 'uint8' }],
    stateMutability: 'view'
  },
  {
    type: 'function',
    inputs: [
      {
        name: '_shareholders',
        internalType: 'struct Investor.Shareholder[]',
        type: 'tuple[]',
        components: [
          { name: 'shareholder', internalType: 'address', type: 'address' },
          { name: 'amount', internalType: 'uint256', type: 'uint256' }
        ]
      }
    ],
    name: 'distributeMint',
    outputs: [],
    stateMutability: 'nonpayable'
  },
  {
    type: 'function',
    inputs: [{ name: '_amount', internalType: 'uint256', type: 'uint256' }],
    name: 'distributeNativeDividends',
    outputs: [],
    stateMutability: 'payable'
  },
  {
    type: 'function',
    inputs: [
      { name: '_token', internalType: 'address', type: 'address' },
      { name: '_amount', internalType: 'uint256', type: 'uint256' }
    ],
    name: 'distributeTokenDividends',
    outputs: [],
    stateMutability: 'nonpayable'
  },
  {
    type: 'function',
    inputs: [{ name: 'shareholder', internalType: 'address', type: 'address' }],
    name: 'getMigrationClaimed',
    outputs: [{ name: '', internalType: 'bool', type: 'bool' }],
    stateMutability: 'view'
  },
  {
    type: 'function',
    inputs: [],
    name: 'getMigrationRoot',
    outputs: [{ name: '', internalType: 'bytes32', type: 'bytes32' }],
    stateMutability: 'view'
  },
  {
    type: 'function',
    inputs: [],
    name: 'getOfficerAddress',
    outputs: [{ name: '', internalType: 'address', type: 'address' }],
    stateMutability: 'view'
  },
  {
    type: 'function',
    inputs: [{ name: 'role', internalType: 'bytes32', type: 'bytes32' }],
    name: 'getRoleAdmin',
    outputs: [{ name: '', internalType: 'bytes32', type: 'bytes32' }],
    stateMutability: 'view'
  },
  {
    type: 'function',
    inputs: [],
    name: 'getShareholders',
    outputs: [
      {
        name: '',
        internalType: 'struct Investor.Shareholder[]',
        type: 'tuple[]',
        components: [
          { name: 'shareholder', internalType: 'address', type: 'address' },
          { name: 'amount', internalType: 'uint256', type: 'uint256' }
        ]
      }
    ],
    stateMutability: 'view'
  },
  {
    type: 'function',
    inputs: [
      { name: 'role', internalType: 'bytes32', type: 'bytes32' },
      { name: 'account', internalType: 'address', type: 'address' }
    ],
    name: 'grantRole',
    outputs: [],
    stateMutability: 'nonpayable'
  },
  {
    type: 'function',
    inputs: [
      { name: 'role', internalType: 'bytes32', type: 'bytes32' },
      { name: 'account', internalType: 'address', type: 'address' }
    ],
    name: 'hasRole',
    outputs: [{ name: '', internalType: 'bool', type: 'bool' }],
    stateMutability: 'view'
  },
  {
    type: 'function',
    inputs: [
      { name: 'shareholder', internalType: 'address', type: 'address' },
      { name: 'amount', internalType: 'uint256', type: 'uint256' }
    ],
    name: 'individualMint',
    outputs: [],
    stateMutability: 'nonpayable'
  },
  {
    type: 'function',
    inputs: [
      { name: '_name', internalType: 'string', type: 'string' },
      { name: '_symbol', internalType: 'string', type: 'string' },
      { name: '_owner', internalType: 'address', type: 'address' }
    ],
    name: 'initialize',
    outputs: [],
    stateMutability: 'nonpayable'
  },
  {
    type: 'function',
    inputs: [],
    name: 'isMigrationComplete',
    outputs: [{ name: '', internalType: 'bool', type: 'bool' }],
    stateMutability: 'view'
  },
  {
    type: 'function',
    inputs: [],
    name: 'name',
    outputs: [{ name: '', internalType: 'string', type: 'string' }],
    stateMutability: 'view'
  },
  {
    type: 'function',
    inputs: [],
    name: 'owner',
    outputs: [{ name: '', internalType: 'address', type: 'address' }],
    stateMutability: 'view'
  },
  {
    type: 'function',
    inputs: [],
    name: 'pause',
    outputs: [],
    stateMutability: 'nonpayable'
  },
  {
    type: 'function',
    inputs: [],
    name: 'paused',
    outputs: [{ name: '', internalType: 'bool', type: 'bool' }],
    stateMutability: 'view'
  },
  {
    type: 'function',
    inputs: [],
    name: 'renounceOwnership',
    outputs: [],
    stateMutability: 'nonpayable'
  },
  {
    type: 'function',
    inputs: [
      { name: 'role', internalType: 'bytes32', type: 'bytes32' },
      { name: 'callerConfirmation', internalType: 'address', type: 'address' }
    ],
    name: 'renounceRole',
    outputs: [],
    stateMutability: 'nonpayable'
  },
  {
    type: 'function',
    inputs: [
      { name: 'role', internalType: 'bytes32', type: 'bytes32' },
      { name: 'account', internalType: 'address', type: 'address' }
    ],
    name: 'revokeRole',
    outputs: [],
    stateMutability: 'nonpayable'
  },
  {
    type: 'function',
    inputs: [{ name: 'root', internalType: 'bytes32', type: 'bytes32' }],
    name: 'setMigrationRoot',
    outputs: [],
    stateMutability: 'nonpayable'
  },
  {
    type: 'function',
    inputs: [{ name: 'interfaceId', internalType: 'bytes4', type: 'bytes4' }],
    name: 'supportsInterface',
    outputs: [{ name: '', internalType: 'bool', type: 'bool' }],
    stateMutability: 'view'
  },
  {
    type: 'function',
    inputs: [],
    name: 'symbol',
    outputs: [{ name: '', internalType: 'string', type: 'string' }],
    stateMutability: 'view'
  },
  {
    type: 'function',
    inputs: [],
    name: 'totalSupply',
    outputs: [{ name: '', internalType: 'uint256', type: 'uint256' }],
    stateMutability: 'view'
  },
  {
    type: 'function',
    inputs: [
      { name: 'to', internalType: 'address', type: 'address' },
      { name: 'value', internalType: 'uint256', type: 'uint256' }
    ],
    name: 'transfer',
    outputs: [{ name: '', internalType: 'bool', type: 'bool' }],
    stateMutability: 'nonpayable'
  },
  {
    type: 'function',
    inputs: [
      { name: 'from', internalType: 'address', type: 'address' },
      { name: 'to', internalType: 'address', type: 'address' },
      { name: 'value', internalType: 'uint256', type: 'uint256' }
    ],
    name: 'transferFrom',
    outputs: [{ name: '', internalType: 'bool', type: 'bool' }],
    stateMutability: 'nonpayable'
  },
  {
    type: 'function',
    inputs: [{ name: 'newOwner', internalType: 'address', type: 'address' }],
    name: 'transferOwnership',
    outputs: [],
    stateMutability: 'nonpayable'
  },
  {
    type: 'function',
    inputs: [],
    name: 'unpause',
    outputs: [],
    stateMutability: 'nonpayable'
  },
  {
    type: 'function',
    inputs: [],
    name: 'version',
    outputs: [{ name: '', internalType: 'string', type: 'string' }],
    stateMutability: 'pure'
  },
  { type: 'receive', stateMutability: 'payable' }
] as const

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// Officer
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

export const officerAbi = [
  {
    type: 'constructor',
    inputs: [{ name: 'feeCollector', internalType: 'address', type: 'address' }],
    stateMutability: 'nonpayable'
  },
  { type: 'error', inputs: [], name: 'EnforcedPause' },
  { type: 'error', inputs: [], name: 'ExpectedPause' },
  { type: 'error', inputs: [], name: 'InvalidInitialization' },
  { type: 'error', inputs: [], name: 'NotInitializing' },
  {
    type: 'error',
    inputs: [{ name: 'contractType', internalType: 'string', type: 'string' }],
    name: 'Officer__BeaconNotConfigured'
  },
  { type: 'error', inputs: [], name: 'Officer__BodMustBeDeployedViaElections' },
  {
    type: 'error',
    inputs: [{ name: 'beaconType', internalType: 'string', type: 'string' }],
    name: 'Officer__DuplicateBeaconType'
  },
  { type: 'error', inputs: [], name: 'Officer__EmptyBeaconType' },
  { type: 'error', inputs: [], name: 'Officer__EmptyContractType' },
  {
    type: 'error',
    inputs: [{ name: 'contractType', internalType: 'string', type: 'string' }],
    name: 'Officer__MissingInitializerData'
  },
  { type: 'error', inputs: [], name: 'Officer__NotOwnerOrInitializing' },
  { type: 'error', inputs: [], name: 'Officer__Unauthorized' },
  { type: 'error', inputs: [], name: 'Officer__ZeroAddress' },
  {
    type: 'error',
    inputs: [{ name: 'owner', internalType: 'address', type: 'address' }],
    name: 'OwnableInvalidOwner'
  },
  {
    type: 'error',
    inputs: [{ name: 'account', internalType: 'address', type: 'address' }],
    name: 'OwnableUnauthorizedAccount'
  },
  { type: 'error', inputs: [], name: 'ReentrancyGuardReentrantCall' },
  {
    type: 'event',
    anonymous: false,
    inputs: [{ name: 'bank', internalType: 'address', type: 'address', indexed: true }],
    name: 'BankDeployed'
  },
  {
    type: 'event',
    anonymous: false,
    inputs: [
      {
        name: 'contractType',
        internalType: 'string',
        type: 'string',
        indexed: false
      },
      {
        name: 'beaconAddress',
        internalType: 'address',
        type: 'address',
        indexed: false
      }
    ],
    name: 'BeaconConfigured'
  },
  {
    type: 'event',
    anonymous: false,
    inputs: [
      {
        name: 'beaconProxies',
        internalType: 'address[]',
        type: 'address[]',
        indexed: false
      }
    ],
    name: 'BeaconProxiesDeployed'
  },
  {
    type: 'event',
    anonymous: false,
    inputs: [
      {
        name: 'board',
        internalType: 'address',
        type: 'address',
        indexed: true
      }
    ],
    name: 'BoardOfDirectorsDeployed'
  },
  {
    type: 'event',
    anonymous: false,
    inputs: [
      {
        name: 'remuneration',
        internalType: 'address',
        type: 'address',
        indexed: true
      }
    ],
    name: 'CashRemunerationEIP712Deployed'
  },
  {
    type: 'event',
    anonymous: false,
    inputs: [
      {
        name: 'elections',
        internalType: 'address',
        type: 'address',
        indexed: true
      }
    ],
    name: 'ElectionsDeployed'
  },
  {
    type: 'event',
    anonymous: false,
    inputs: [
      {
        name: 'account',
        internalType: 'address',
        type: 'address',
        indexed: true
      }
    ],
    name: 'ExpenseAccountEIP712Deployed'
  },
  {
    type: 'event',
    anonymous: false,
    inputs: [
      {
        name: 'version',
        internalType: 'uint64',
        type: 'uint64',
        indexed: false
      }
    ],
    name: 'Initialized'
  },
  {
    type: 'event',
    anonymous: false,
    inputs: [
      {
        name: 'investor',
        internalType: 'address',
        type: 'address',
        indexed: true
      }
    ],
    name: 'InvestorDeployed'
  },
  {
    type: 'event',
    anonymous: false,
    inputs: [
      {
        name: 'previousOwner',
        internalType: 'address',
        type: 'address',
        indexed: true
      },
      {
        name: 'newOwner',
        internalType: 'address',
        type: 'address',
        indexed: true
      }
    ],
    name: 'OwnershipTransferred'
  },
  {
    type: 'event',
    anonymous: false,
    inputs: [
      {
        name: 'account',
        internalType: 'address',
        type: 'address',
        indexed: false
      }
    ],
    name: 'Paused'
  },
  {
    type: 'event',
    anonymous: false,
    inputs: [
      {
        name: 'proposals',
        internalType: 'address',
        type: 'address',
        indexed: true
      }
    ],
    name: 'ProposalsDeployed'
  },
  {
    type: 'event',
    anonymous: false,
    inputs: [
      {
        name: 'router',
        internalType: 'address',
        type: 'address',
        indexed: true
      }
    ],
    name: 'SafeDepositRouterDeployed'
  },
  {
    type: 'event',
    anonymous: false,
    inputs: [
      {
        name: 'account',
        internalType: 'address',
        type: 'address',
        indexed: false
      }
    ],
    name: 'Unpaused'
  },
  {
    type: 'event',
    anonymous: false,
    inputs: [
      {
        name: 'vesting',
        internalType: 'address',
        type: 'address',
        indexed: true
      }
    ],
    name: 'VestingDeployed'
  },
  {
    type: 'function',
    inputs: [
      { name: 'contractType', internalType: 'string', type: 'string' },
      { name: 'beaconAddress', internalType: 'address', type: 'address' }
    ],
    name: 'configureBeacon',
    outputs: [],
    stateMutability: 'nonpayable'
  },
  {
    type: 'function',
    inputs: [
      {
        name: 'deployments',
        internalType: 'struct DeploymentData[]',
        type: 'tuple[]',
        components: [
          { name: 'contractType', internalType: 'string', type: 'string' },
          { name: 'initializerData', internalType: 'bytes', type: 'bytes' }
        ]
      }
    ],
    name: 'deployAllContracts',
    outputs: [{ name: '', internalType: 'address[]', type: 'address[]' }],
    stateMutability: 'nonpayable'
  },
  {
    type: 'function',
    inputs: [
      { name: 'contractType', internalType: 'string', type: 'string' },
      { name: 'initializerData', internalType: 'bytes', type: 'bytes' }
    ],
    name: 'deployBeaconProxy',
    outputs: [{ name: '', internalType: 'address', type: 'address' }],
    stateMutability: 'nonpayable'
  },
  {
    type: 'function',
    inputs: [{ name: 'contractType', internalType: 'string', type: 'string' }],
    name: 'findDeployedContract',
    outputs: [{ name: '', internalType: 'address', type: 'address' }],
    stateMutability: 'view'
  },
  {
    type: 'function',
    inputs: [],
    name: 'getBodContract',
    outputs: [{ name: '', internalType: 'address', type: 'address' }],
    stateMutability: 'view'
  },
  {
    type: 'function',
    inputs: [],
    name: 'getConfiguredContractTypes',
    outputs: [{ name: '', internalType: 'string[]', type: 'string[]' }],
    stateMutability: 'view'
  },
  {
    type: 'function',
    inputs: [{ name: 'contractType', internalType: 'string', type: 'string' }],
    name: 'getContractBeacon',
    outputs: [{ name: '', internalType: 'address', type: 'address' }],
    stateMutability: 'view'
  },
  {
    type: 'function',
    inputs: [],
    name: 'getContractTypes',
    outputs: [{ name: '', internalType: 'string[]', type: 'string[]' }],
    stateMutability: 'view'
  },
  {
    type: 'function',
    inputs: [],
    name: 'getDeployedContracts',
    outputs: [
      {
        name: '',
        internalType: 'struct Officer.DeployedContract[]',
        type: 'tuple[]',
        components: [
          { name: 'contractType', internalType: 'string', type: 'string' },
          { name: 'contractAddress', internalType: 'address', type: 'address' }
        ]
      }
    ],
    stateMutability: 'view'
  },
  {
    type: 'function',
    inputs: [],
    name: 'getFeeCollector',
    outputs: [{ name: '', internalType: 'address', type: 'address' }],
    stateMutability: 'view'
  },
  {
    type: 'function',
    inputs: [{ name: 'contractType', internalType: 'string', type: 'string' }],
    name: 'getFeeFor',
    outputs: [{ name: '', internalType: 'uint16', type: 'uint16' }],
    stateMutability: 'view'
  },
  {
    type: 'function',
    inputs: [],
    name: 'getTeam',
    outputs: [
      {
        name: '',
        internalType: 'struct Officer.DeployedContract[]',
        type: 'tuple[]',
        components: [
          { name: 'contractType', internalType: 'string', type: 'string' },
          { name: 'contractAddress', internalType: 'address', type: 'address' }
        ]
      }
    ],
    stateMutability: 'view'
  },
  {
    type: 'function',
    inputs: [
      { name: 'ownerAddress', internalType: 'address', type: 'address' },
      {
        name: 'beaconConfigs',
        internalType: 'struct Officer.BeaconConfig[]',
        type: 'tuple[]',
        components: [
          { name: 'beaconType', internalType: 'string', type: 'string' },
          { name: 'beaconAddress', internalType: 'address', type: 'address' }
        ]
      },
      {
        name: 'deployments',
        internalType: 'struct DeploymentData[]',
        type: 'tuple[]',
        components: [
          { name: 'contractType', internalType: 'string', type: 'string' },
          { name: 'initializerData', internalType: 'bytes', type: 'bytes' }
        ]
      },
      { name: 'isDeployAllContracts', internalType: 'bool', type: 'bool' }
    ],
    name: 'initialize',
    outputs: [],
    stateMutability: 'nonpayable'
  },
  {
    type: 'function',
    inputs: [{ name: 'tokenAddress', internalType: 'address', type: 'address' }],
    name: 'isFeeCollectorToken',
    outputs: [{ name: '', internalType: 'bool', type: 'bool' }],
    stateMutability: 'view'
  },
  {
    type: 'function',
    inputs: [],
    name: 'owner',
    outputs: [{ name: '', internalType: 'address', type: 'address' }],
    stateMutability: 'view'
  },
  {
    type: 'function',
    inputs: [],
    name: 'pause',
    outputs: [],
    stateMutability: 'nonpayable'
  },
  {
    type: 'function',
    inputs: [],
    name: 'paused',
    outputs: [{ name: '', internalType: 'bool', type: 'bool' }],
    stateMutability: 'view'
  },
  {
    type: 'function',
    inputs: [],
    name: 'renounceOwnership',
    outputs: [],
    stateMutability: 'nonpayable'
  },
  {
    type: 'function',
    inputs: [{ name: 'newOwner', internalType: 'address', type: 'address' }],
    name: 'transferOwnership',
    outputs: [],
    stateMutability: 'nonpayable'
  },
  {
    type: 'function',
    inputs: [],
    name: 'unpause',
    outputs: [],
    stateMutability: 'nonpayable'
  },
  {
    type: 'function',
    inputs: [],
    name: 'version',
    outputs: [{ name: '', internalType: 'string', type: 'string' }],
    stateMutability: 'pure'
  }
] as const

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// Proposals
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

export const proposalsAbi = [
  { type: 'constructor', inputs: [], stateMutability: 'nonpayable' },
  { type: 'error', inputs: [], name: 'EnforcedPause' },
  { type: 'error', inputs: [], name: 'ExpectedPause' },
  { type: 'error', inputs: [], name: 'InvalidInitialization' },
  { type: 'error', inputs: [], name: 'NotInitializing' },
  {
    type: 'error',
    inputs: [{ name: 'owner', internalType: 'address', type: 'address' }],
    name: 'OwnableInvalidOwner'
  },
  {
    type: 'error',
    inputs: [{ name: 'account', internalType: 'address', type: 'address' }],
    name: 'OwnableUnauthorizedAccount'
  },
  { type: 'error', inputs: [], name: 'ProposalUtils__InvalidProposalContent' },
  { type: 'error', inputs: [], name: 'ProposalUtils__InvalidProposalDates' },
  {
    type: 'error',
    inputs: [],
    name: 'Proposals__BoardOfDirectorAddressNotSet'
  },
  { type: 'error', inputs: [], name: 'Proposals__BoardOfDirectorsNotFound' },
  { type: 'error', inputs: [], name: 'Proposals__InvalidVote' },
  { type: 'error', inputs: [], name: 'Proposals__NoBoardMembers' },
  { type: 'error', inputs: [], name: 'Proposals__NotAllowed' },
  { type: 'error', inputs: [], name: 'Proposals__OfficerAddressNotSet' },
  { type: 'error', inputs: [], name: 'Proposals__OnlyBoardMember' },
  { type: 'error', inputs: [], name: 'Proposals__ProposalAlreadyVoted' },
  { type: 'error', inputs: [], name: 'Proposals__ProposalNotFound' },
  { type: 'error', inputs: [], name: 'Proposals__ProposalVotingEnded' },
  { type: 'error', inputs: [], name: 'Proposals__ProposalVotingNotStarted' },
  { type: 'error', inputs: [], name: 'Proposals__ZeroSender' },
  { type: 'error', inputs: [], name: 'ReentrancyGuardReentrantCall' },
  {
    type: 'event',
    anonymous: false,
    inputs: [
      {
        name: 'version',
        internalType: 'uint64',
        type: 'uint64',
        indexed: false
      }
    ],
    name: 'Initialized'
  },
  {
    type: 'event',
    anonymous: false,
    inputs: [
      {
        name: 'previousOwner',
        internalType: 'address',
        type: 'address',
        indexed: true
      },
      {
        name: 'newOwner',
        internalType: 'address',
        type: 'address',
        indexed: true
      }
    ],
    name: 'OwnershipTransferred'
  },
  {
    type: 'event',
    anonymous: false,
    inputs: [
      {
        name: 'account',
        internalType: 'address',
        type: 'address',
        indexed: false
      }
    ],
    name: 'Paused'
  },
  {
    type: 'event',
    anonymous: false,
    inputs: [
      {
        name: 'proposalId',
        internalType: 'uint256',
        type: 'uint256',
        indexed: true
      },
      { name: 'title', internalType: 'string', type: 'string', indexed: false },
      {
        name: 'creator',
        internalType: 'address',
        type: 'address',
        indexed: true
      },
      {
        name: 'startDate',
        internalType: 'uint256',
        type: 'uint256',
        indexed: false
      },
      {
        name: 'endDate',
        internalType: 'uint256',
        type: 'uint256',
        indexed: false
      }
    ],
    name: 'ProposalCreated'
  },
  {
    type: 'event',
    anonymous: false,
    inputs: [
      {
        name: 'proposalId',
        internalType: 'uint256',
        type: 'uint256',
        indexed: true
      },
      {
        name: 'state',
        internalType: 'enum Proposals.ProposalState',
        type: 'uint8',
        indexed: false
      },
      {
        name: 'yesCount',
        internalType: 'uint256',
        type: 'uint256',
        indexed: false
      },
      {
        name: 'noCount',
        internalType: 'uint256',
        type: 'uint256',
        indexed: false
      },
      {
        name: 'abstainCount',
        internalType: 'uint256',
        type: 'uint256',
        indexed: false
      }
    ],
    name: 'ProposalTallyResults'
  },
  {
    type: 'event',
    anonymous: false,
    inputs: [
      {
        name: 'proposalId',
        internalType: 'uint256',
        type: 'uint256',
        indexed: true
      },
      {
        name: 'voter',
        internalType: 'address',
        type: 'address',
        indexed: true
      },
      {
        name: 'vote',
        internalType: 'enum Proposals.VoteOption',
        type: 'uint8',
        indexed: false
      },
      {
        name: 'timestamp',
        internalType: 'uint256',
        type: 'uint256',
        indexed: false
      }
    ],
    name: 'ProposalVoted'
  },
  {
    type: 'event',
    anonymous: false,
    inputs: [
      {
        name: 'account',
        internalType: 'address',
        type: 'address',
        indexed: false
      }
    ],
    name: 'Unpaused'
  },
  {
    type: 'function',
    inputs: [
      { name: 'proposalId', internalType: 'uint256', type: 'uint256' },
      {
        name: 'vote',
        internalType: 'enum Proposals.VoteOption',
        type: 'uint8'
      }
    ],
    name: 'castVote',
    outputs: [],
    stateMutability: 'nonpayable'
  },
  {
    type: 'function',
    inputs: [
      { name: 'title', internalType: 'string', type: 'string' },
      { name: 'description', internalType: 'string', type: 'string' },
      { name: 'proposalType', internalType: 'string', type: 'string' },
      { name: 'startDate', internalType: 'uint256', type: 'uint256' },
      { name: 'endDate', internalType: 'uint256', type: 'uint256' }
    ],
    name: 'createProposal',
    outputs: [],
    stateMutability: 'nonpayable'
  },
  {
    type: 'function',
    inputs: [],
    name: 'getBoardOfDirectors',
    outputs: [{ name: '', internalType: 'address[]', type: 'address[]' }],
    stateMutability: 'view'
  },
  {
    type: 'function',
    inputs: [],
    name: 'getNextProposalId',
    outputs: [{ name: '', internalType: 'uint256', type: 'uint256' }],
    stateMutability: 'view'
  },
  {
    type: 'function',
    inputs: [],
    name: 'getOfficerAddress',
    outputs: [{ name: '', internalType: 'address', type: 'address' }],
    stateMutability: 'view'
  },
  {
    type: 'function',
    inputs: [{ name: 'proposalId', internalType: 'uint256', type: 'uint256' }],
    name: 'getProposal',
    outputs: [
      {
        name: '',
        internalType: 'struct Proposals.ProposalView',
        type: 'tuple',
        components: [
          { name: 'id', internalType: 'uint256', type: 'uint256' },
          { name: 'title', internalType: 'string', type: 'string' },
          { name: 'description', internalType: 'string', type: 'string' },
          { name: 'proposalType', internalType: 'string', type: 'string' },
          { name: 'startDate', internalType: 'uint256', type: 'uint256' },
          { name: 'endDate', internalType: 'uint256', type: 'uint256' },
          { name: 'creator', internalType: 'address', type: 'address' },
          { name: 'voteCount', internalType: 'uint256', type: 'uint256' },
          { name: 'totalVoters', internalType: 'uint256', type: 'uint256' },
          { name: 'yesCount', internalType: 'uint256', type: 'uint256' },
          { name: 'noCount', internalType: 'uint256', type: 'uint256' },
          { name: 'abstainCount', internalType: 'uint256', type: 'uint256' },
          {
            name: 'state',
            internalType: 'enum Proposals.ProposalState',
            type: 'uint8'
          }
        ]
      }
    ],
    stateMutability: 'view'
  },
  {
    type: 'function',
    inputs: [
      { name: 'proposalId', internalType: 'uint256', type: 'uint256' },
      { name: 'voter', internalType: 'address', type: 'address' }
    ],
    name: 'hasVoted',
    outputs: [{ name: '', internalType: 'bool', type: 'bool' }],
    stateMutability: 'view'
  },
  {
    type: 'function',
    inputs: [{ name: 'ownerAddress', internalType: 'address', type: 'address' }],
    name: 'initialize',
    outputs: [],
    stateMutability: 'nonpayable'
  },
  {
    type: 'function',
    inputs: [],
    name: 'owner',
    outputs: [{ name: '', internalType: 'address', type: 'address' }],
    stateMutability: 'view'
  },
  {
    type: 'function',
    inputs: [],
    name: 'paused',
    outputs: [{ name: '', internalType: 'bool', type: 'bool' }],
    stateMutability: 'view'
  },
  {
    type: 'function',
    inputs: [],
    name: 'renounceOwnership',
    outputs: [],
    stateMutability: 'nonpayable'
  },
  {
    type: 'function',
    inputs: [{ name: 'proposalId', internalType: 'uint256', type: 'uint256' }],
    name: 'tallyResults',
    outputs: [],
    stateMutability: 'nonpayable'
  },
  {
    type: 'function',
    inputs: [{ name: 'newOwner', internalType: 'address', type: 'address' }],
    name: 'transferOwnership',
    outputs: [],
    stateMutability: 'nonpayable'
  },
  {
    type: 'function',
    inputs: [],
    name: 'version',
    outputs: [{ name: '', internalType: 'string', type: 'string' }],
    stateMutability: 'pure'
  }
] as const

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// SafeDepositRouter
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

export const safeDepositRouterAbi = [
  { type: 'constructor', inputs: [], stateMutability: 'nonpayable' },
  { type: 'error', inputs: [], name: 'EnforcedPause' },
  { type: 'error', inputs: [], name: 'ExpectedPause' },
  { type: 'error', inputs: [], name: 'InvalidInitialization' },
  { type: 'error', inputs: [], name: 'NotInitializing' },
  {
    type: 'error',
    inputs: [{ name: 'owner', internalType: 'address', type: 'address' }],
    name: 'OwnableInvalidOwner'
  },
  {
    type: 'error',
    inputs: [{ name: 'account', internalType: 'address', type: 'address' }],
    name: 'OwnableUnauthorizedAccount'
  },
  { type: 'error', inputs: [], name: 'ReentrancyGuardReentrantCall' },
  { type: 'error', inputs: [], name: 'SafeDepositRouter__DepositsNotEnabled' },
  {
    type: 'error',
    inputs: [],
    name: 'SafeDepositRouter__InsufficientMinterRole'
  },
  {
    type: 'error',
    inputs: [],
    name: 'SafeDepositRouter__InvalidInvestorAddress'
  },
  { type: 'error', inputs: [], name: 'SafeDepositRouter__InvalidOwner' },
  { type: 'error', inputs: [], name: 'SafeDepositRouter__InvalidSafeAddress' },
  { type: 'error', inputs: [], name: 'SafeDepositRouter__InvalidTokenAddress' },
  {
    type: 'error',
    inputs: [],
    name: 'SafeDepositRouter__InvalidTokenDecimals'
  },
  {
    type: 'error',
    inputs: [],
    name: 'SafeDepositRouter__InvestorContractNotFound'
  },
  { type: 'error', inputs: [], name: 'SafeDepositRouter__MultiplierTooLow' },
  {
    type: 'error',
    inputs: [],
    name: 'SafeDepositRouter__OfficerAddressNotSet'
  },
  {
    type: 'error',
    inputs: [
      { name: 'expected', internalType: 'uint256', type: 'uint256' },
      { name: 'actual', internalType: 'uint256', type: 'uint256' }
    ],
    name: 'SafeDepositRouter__SlippageExceeded'
  },
  {
    type: 'error',
    inputs: [],
    name: 'SafeDepositRouter__TokenAlreadySupported'
  },
  { type: 'error', inputs: [], name: 'SafeDepositRouter__TokenNotSupported' },
  { type: 'error', inputs: [], name: 'SafeDepositRouter__ZeroAmount' },
  { type: 'error', inputs: [], name: 'SafeDepositRouter__ZeroSender' },
  {
    type: 'error',
    inputs: [{ name: 'token', internalType: 'address', type: 'address' }],
    name: 'SafeERC20FailedOperation'
  },
  {
    type: 'error',
    inputs: [{ name: 'token', internalType: 'address', type: 'address' }],
    name: 'TokenSupport__AlreadyAdded'
  },
  {
    type: 'error',
    inputs: [{ name: 'token', internalType: 'address', type: 'address' }],
    name: 'TokenSupport__NotFound'
  },
  { type: 'error', inputs: [], name: 'TokenSupport__ZeroAddress' },
  {
    type: 'event',
    anonymous: false,
    inputs: [
      {
        name: 'depositor',
        internalType: 'address',
        type: 'address',
        indexed: true
      },
      {
        name: 'token',
        internalType: 'address',
        type: 'address',
        indexed: true
      },
      {
        name: 'tokenAmount',
        internalType: 'uint256',
        type: 'uint256',
        indexed: false
      },
      {
        name: 'sherAmount',
        internalType: 'uint256',
        type: 'uint256',
        indexed: false
      },
      {
        name: 'timestamp',
        internalType: 'uint256',
        type: 'uint256',
        indexed: false
      }
    ],
    name: 'Deposited'
  },
  {
    type: 'event',
    anonymous: false,
    inputs: [
      {
        name: 'disabledBy',
        internalType: 'address',
        type: 'address',
        indexed: true
      }
    ],
    name: 'DepositsDisabled'
  },
  {
    type: 'event',
    anonymous: false,
    inputs: [
      {
        name: 'enabledBy',
        internalType: 'address',
        type: 'address',
        indexed: true
      }
    ],
    name: 'DepositsEnabled'
  },
  {
    type: 'event',
    anonymous: false,
    inputs: [
      {
        name: 'version',
        internalType: 'uint64',
        type: 'uint64',
        indexed: false
      }
    ],
    name: 'Initialized'
  },
  {
    type: 'event',
    anonymous: false,
    inputs: [
      {
        name: 'oldMultiplier',
        internalType: 'uint256',
        type: 'uint256',
        indexed: false
      },
      {
        name: 'newMultiplier',
        internalType: 'uint256',
        type: 'uint256',
        indexed: false
      }
    ],
    name: 'MultiplierUpdated'
  },
  {
    type: 'event',
    anonymous: false,
    inputs: [
      {
        name: 'previousOwner',
        internalType: 'address',
        type: 'address',
        indexed: true
      },
      {
        name: 'newOwner',
        internalType: 'address',
        type: 'address',
        indexed: true
      }
    ],
    name: 'OwnershipTransferred'
  },
  {
    type: 'event',
    anonymous: false,
    inputs: [
      {
        name: 'account',
        internalType: 'address',
        type: 'address',
        indexed: false
      }
    ],
    name: 'Paused'
  },
  {
    type: 'event',
    anonymous: false,
    inputs: [
      {
        name: 'oldSafe',
        internalType: 'address',
        type: 'address',
        indexed: true
      },
      {
        name: 'newSafe',
        internalType: 'address',
        type: 'address',
        indexed: true
      }
    ],
    name: 'SafeAddressUpdated'
  },
  {
    type: 'event',
    anonymous: false,
    inputs: [
      {
        name: 'tokenAddress',
        internalType: 'address',
        type: 'address',
        indexed: true
      },
      {
        name: 'decimals',
        internalType: 'uint8',
        type: 'uint8',
        indexed: false
      }
    ],
    name: 'TokenSupportAdded'
  },
  {
    type: 'event',
    anonymous: false,
    inputs: [
      {
        name: 'tokenAddress',
        internalType: 'address',
        type: 'address',
        indexed: true
      }
    ],
    name: 'TokenSupportAdded'
  },
  {
    type: 'event',
    anonymous: false,
    inputs: [
      {
        name: 'tokenAddress',
        internalType: 'address',
        type: 'address',
        indexed: true
      }
    ],
    name: 'TokenSupportRemoved'
  },
  {
    type: 'event',
    anonymous: false,
    inputs: [
      {
        name: 'token',
        internalType: 'address',
        type: 'address',
        indexed: true
      },
      { name: 'to', internalType: 'address', type: 'address', indexed: true },
      {
        name: 'amount',
        internalType: 'uint256',
        type: 'uint256',
        indexed: false
      }
    ],
    name: 'TokensRecovered'
  },
  {
    type: 'event',
    anonymous: false,
    inputs: [
      {
        name: 'account',
        internalType: 'address',
        type: 'address',
        indexed: false
      }
    ],
    name: 'Unpaused'
  },
  {
    type: 'function',
    inputs: [],
    name: 'MIN_MULTIPLIER',
    outputs: [{ name: '', internalType: 'uint256', type: 'uint256' }],
    stateMutability: 'view'
  },
  {
    type: 'function',
    inputs: [{ name: 'tokenAddress', internalType: 'address', type: 'address' }],
    name: 'addTokenSupport',
    outputs: [],
    stateMutability: 'nonpayable'
  },
  {
    type: 'function',
    inputs: [
      { name: 'tokenAddress', internalType: 'address', type: 'address' },
      { name: 'tokenAmount', internalType: 'uint256', type: 'uint256' }
    ],
    name: 'calculateCompensation',
    outputs: [{ name: '', internalType: 'uint256', type: 'uint256' }],
    stateMutability: 'view'
  },
  {
    type: 'function',
    inputs: [
      { name: 'tokenAddress', internalType: 'address', type: 'address' },
      { name: 'amount', internalType: 'uint256', type: 'uint256' }
    ],
    name: 'deposit',
    outputs: [],
    stateMutability: 'nonpayable'
  },
  {
    type: 'function',
    inputs: [
      { name: 'tokenAddress', internalType: 'address', type: 'address' },
      { name: 'amount', internalType: 'uint256', type: 'uint256' },
      { name: 'minSherOut', internalType: 'uint256', type: 'uint256' }
    ],
    name: 'depositWithSlippage',
    outputs: [],
    stateMutability: 'nonpayable'
  },
  {
    type: 'function',
    inputs: [],
    name: 'disableDeposits',
    outputs: [],
    stateMutability: 'nonpayable'
  },
  {
    type: 'function',
    inputs: [],
    name: 'enableDeposits',
    outputs: [],
    stateMutability: 'nonpayable'
  },
  {
    type: 'function',
    inputs: [],
    name: 'getDepositsEnabled',
    outputs: [{ name: '', internalType: 'bool', type: 'bool' }],
    stateMutability: 'view'
  },
  {
    type: 'function',
    inputs: [],
    name: 'getMultiplier',
    outputs: [{ name: '', internalType: 'uint256', type: 'uint256' }],
    stateMutability: 'view'
  },
  {
    type: 'function',
    inputs: [],
    name: 'getOfficerAddress',
    outputs: [{ name: '', internalType: 'address', type: 'address' }],
    stateMutability: 'view'
  },
  {
    type: 'function',
    inputs: [],
    name: 'getSafeAddress',
    outputs: [{ name: '', internalType: 'address', type: 'address' }],
    stateMutability: 'view'
  },
  {
    type: 'function',
    inputs: [],
    name: 'getSupportedTokenCount',
    outputs: [{ name: '', internalType: 'uint256', type: 'uint256' }],
    stateMutability: 'view'
  },
  {
    type: 'function',
    inputs: [],
    name: 'getSupportedTokens',
    outputs: [{ name: '', internalType: 'address[]', type: 'address[]' }],
    stateMutability: 'view'
  },
  {
    type: 'function',
    inputs: [{ name: 'token', internalType: 'address', type: 'address' }],
    name: 'getTokenDecimals',
    outputs: [{ name: '', internalType: 'uint8', type: 'uint8' }],
    stateMutability: 'view'
  },
  {
    type: 'function',
    inputs: [
      { name: 'safeAddress', internalType: 'address', type: 'address' },
      { name: 'tokenAddresses', internalType: 'address[]', type: 'address[]' },
      { name: 'multiplier', internalType: 'uint256', type: 'uint256' }
    ],
    name: 'initialize',
    outputs: [],
    stateMutability: 'nonpayable'
  },
  {
    type: 'function',
    inputs: [{ name: 'token', internalType: 'address', type: 'address' }],
    name: 'isTokenSupported',
    outputs: [{ name: '', internalType: 'bool', type: 'bool' }],
    stateMutability: 'view'
  },
  {
    type: 'function',
    inputs: [],
    name: 'owner',
    outputs: [{ name: '', internalType: 'address', type: 'address' }],
    stateMutability: 'view'
  },
  {
    type: 'function',
    inputs: [],
    name: 'pause',
    outputs: [],
    stateMutability: 'nonpayable'
  },
  {
    type: 'function',
    inputs: [],
    name: 'paused',
    outputs: [{ name: '', internalType: 'bool', type: 'bool' }],
    stateMutability: 'view'
  },
  {
    type: 'function',
    inputs: [
      { name: 'token', internalType: 'address', type: 'address' },
      { name: 'amount', internalType: 'uint256', type: 'uint256' }
    ],
    name: 'recoverERC20',
    outputs: [],
    stateMutability: 'nonpayable'
  },
  {
    type: 'function',
    inputs: [{ name: 'tokenAddress', internalType: 'address', type: 'address' }],
    name: 'removeTokenSupport',
    outputs: [],
    stateMutability: 'nonpayable'
  },
  {
    type: 'function',
    inputs: [],
    name: 'renounceOwnership',
    outputs: [],
    stateMutability: 'nonpayable'
  },
  {
    type: 'function',
    inputs: [{ name: 'newMultiplier', internalType: 'uint256', type: 'uint256' }],
    name: 'setMultiplier',
    outputs: [],
    stateMutability: 'nonpayable'
  },
  {
    type: 'function',
    inputs: [{ name: 'newSafe', internalType: 'address', type: 'address' }],
    name: 'setSafeAddress',
    outputs: [],
    stateMutability: 'nonpayable'
  },
  {
    type: 'function',
    inputs: [{ name: 'newOwner', internalType: 'address', type: 'address' }],
    name: 'transferOwnership',
    outputs: [],
    stateMutability: 'nonpayable'
  },
  {
    type: 'function',
    inputs: [],
    name: 'unpause',
    outputs: [],
    stateMutability: 'nonpayable'
  },
  {
    type: 'function',
    inputs: [],
    name: 'version',
    outputs: [{ name: '', internalType: 'string', type: 'string' }],
    stateMutability: 'pure'
  }
] as const

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// Vesting
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

export const vestingAbi = [
  { type: 'constructor', inputs: [], stateMutability: 'nonpayable' },
  { type: 'error', inputs: [], name: 'EnforcedPause' },
  { type: 'error', inputs: [], name: 'ExpectedPause' },
  { type: 'error', inputs: [], name: 'InvalidInitialization' },
  { type: 'error', inputs: [], name: 'NotInitializing' },
  {
    type: 'error',
    inputs: [{ name: 'owner', internalType: 'address', type: 'address' }],
    name: 'OwnableInvalidOwner'
  },
  {
    type: 'error',
    inputs: [{ name: 'account', internalType: 'address', type: 'address' }],
    name: 'OwnableUnauthorizedAccount'
  },
  { type: 'error', inputs: [], name: 'ReentrancyGuardReentrantCall' },
  { type: 'error', inputs: [], name: 'Vesting__CliffExceedsDuration' },
  { type: 'error', inputs: [], name: 'Vesting__IndexOutOfBounds' },
  { type: 'error', inputs: [], name: 'Vesting__InsufficientMinterRole' },
  { type: 'error', inputs: [], name: 'Vesting__InvestorContractNotFound' },
  { type: 'error', inputs: [], name: 'Vesting__NothingToRelease' },
  { type: 'error', inputs: [], name: 'Vesting__OfficerAddressNotSet' },
  { type: 'error', inputs: [], name: 'Vesting__VestingNotActive' },
  { type: 'error', inputs: [], name: 'Vesting__ZeroAddress' },
  { type: 'error', inputs: [], name: 'Vesting__ZeroSender' },
  {
    type: 'event',
    anonymous: false,
    inputs: [
      {
        name: 'version',
        internalType: 'uint64',
        type: 'uint64',
        indexed: false
      }
    ],
    name: 'Initialized'
  },
  {
    type: 'event',
    anonymous: false,
    inputs: [
      {
        name: 'previousOwner',
        internalType: 'address',
        type: 'address',
        indexed: true
      },
      {
        name: 'newOwner',
        internalType: 'address',
        type: 'address',
        indexed: true
      }
    ],
    name: 'OwnershipTransferred'
  },
  {
    type: 'event',
    anonymous: false,
    inputs: [
      {
        name: 'account',
        internalType: 'address',
        type: 'address',
        indexed: false
      }
    ],
    name: 'Paused'
  },
  {
    type: 'event',
    anonymous: false,
    inputs: [
      {
        name: 'member',
        internalType: 'address',
        type: 'address',
        indexed: true
      },
      {
        name: 'index',
        internalType: 'uint256',
        type: 'uint256',
        indexed: false
      },
      {
        name: 'amount',
        internalType: 'uint256',
        type: 'uint256',
        indexed: false
      }
    ],
    name: 'TokensReleased'
  },
  {
    type: 'event',
    anonymous: false,
    inputs: [
      {
        name: 'account',
        internalType: 'address',
        type: 'address',
        indexed: false
      }
    ],
    name: 'Unpaused'
  },
  {
    type: 'event',
    anonymous: false,
    inputs: [
      {
        name: 'member',
        internalType: 'address',
        type: 'address',
        indexed: true
      },
      {
        name: 'index',
        internalType: 'uint256',
        type: 'uint256',
        indexed: false
      },
      {
        name: 'amount',
        internalType: 'uint256',
        type: 'uint256',
        indexed: false
      }
    ],
    name: 'VestingCreated'
  },
  {
    type: 'event',
    anonymous: false,
    inputs: [
      {
        name: 'member',
        internalType: 'address',
        type: 'address',
        indexed: true
      },
      {
        name: 'index',
        internalType: 'uint256',
        type: 'uint256',
        indexed: false
      }
    ],
    name: 'VestingStopped'
  },
  {
    type: 'function',
    inputs: [
      { name: 'member', internalType: 'address', type: 'address' },
      { name: 'start', internalType: 'uint64', type: 'uint64' },
      { name: 'duration', internalType: 'uint64', type: 'uint64' },
      { name: 'cliff', internalType: 'uint64', type: 'uint64' },
      { name: 'totalAmount', internalType: 'uint256', type: 'uint256' }
    ],
    name: 'addVesting',
    outputs: [],
    stateMutability: 'nonpayable'
  },
  {
    type: 'function',
    inputs: [],
    name: 'getAllArchivedVestingsFlat',
    outputs: [
      { name: 'archivedMembers', internalType: 'address[]', type: 'address[]' },
      { name: 'indices', internalType: 'uint256[]', type: 'uint256[]' },
      {
        name: 'archivedInfos',
        internalType: 'struct Vesting.VestingInfo[]',
        type: 'tuple[]',
        components: [
          { name: 'start', internalType: 'uint64', type: 'uint64' },
          { name: 'duration', internalType: 'uint64', type: 'uint64' },
          { name: 'cliff', internalType: 'uint64', type: 'uint64' },
          { name: 'totalAmount', internalType: 'uint256', type: 'uint256' },
          { name: 'released', internalType: 'uint256', type: 'uint256' },
          { name: 'active', internalType: 'bool', type: 'bool' }
        ]
      }
    ],
    stateMutability: 'view'
  },
  {
    type: 'function',
    inputs: [],
    name: 'getCurrentTimestamp',
    outputs: [{ name: '', internalType: 'uint256', type: 'uint256' }],
    stateMutability: 'view'
  },
  {
    type: 'function',
    inputs: [{ name: 'account', internalType: 'address', type: 'address' }],
    name: 'getIsMember',
    outputs: [{ name: '', internalType: 'bool', type: 'bool' }],
    stateMutability: 'view'
  },
  {
    type: 'function',
    inputs: [],
    name: 'getMembers',
    outputs: [{ name: '', internalType: 'address[]', type: 'address[]' }],
    stateMutability: 'view'
  },
  {
    type: 'function',
    inputs: [],
    name: 'getOfficerAddress',
    outputs: [{ name: '', internalType: 'address', type: 'address' }],
    stateMutability: 'view'
  },
  {
    type: 'function',
    inputs: [{ name: 'member', internalType: 'address', type: 'address' }],
    name: 'getVestingCount',
    outputs: [{ name: '', internalType: 'uint256', type: 'uint256' }],
    stateMutability: 'view'
  },
  {
    type: 'function',
    inputs: [{ name: 'member', internalType: 'address', type: 'address' }],
    name: 'getVestings',
    outputs: [
      {
        name: '',
        internalType: 'struct Vesting.VestingInfo[]',
        type: 'tuple[]',
        components: [
          { name: 'start', internalType: 'uint64', type: 'uint64' },
          { name: 'duration', internalType: 'uint64', type: 'uint64' },
          { name: 'cliff', internalType: 'uint64', type: 'uint64' },
          { name: 'totalAmount', internalType: 'uint256', type: 'uint256' },
          { name: 'released', internalType: 'uint256', type: 'uint256' },
          { name: 'active', internalType: 'bool', type: 'bool' }
        ]
      }
    ],
    stateMutability: 'view'
  },
  {
    type: 'function',
    inputs: [],
    name: 'getVestingsWithMembers',
    outputs: [
      { name: 'activeMembers', internalType: 'address[]', type: 'address[]' },
      { name: 'indices', internalType: 'uint256[]', type: 'uint256[]' },
      {
        name: 'infos',
        internalType: 'struct Vesting.VestingInfo[]',
        type: 'tuple[]',
        components: [
          { name: 'start', internalType: 'uint64', type: 'uint64' },
          { name: 'duration', internalType: 'uint64', type: 'uint64' },
          { name: 'cliff', internalType: 'uint64', type: 'uint64' },
          { name: 'totalAmount', internalType: 'uint256', type: 'uint256' },
          { name: 'released', internalType: 'uint256', type: 'uint256' },
          { name: 'active', internalType: 'bool', type: 'bool' }
        ]
      }
    ],
    stateMutability: 'view'
  },
  {
    type: 'function',
    inputs: [],
    name: 'initialize',
    outputs: [],
    stateMutability: 'nonpayable'
  },
  {
    type: 'function',
    inputs: [],
    name: 'owner',
    outputs: [{ name: '', internalType: 'address', type: 'address' }],
    stateMutability: 'view'
  },
  {
    type: 'function',
    inputs: [],
    name: 'pause',
    outputs: [],
    stateMutability: 'nonpayable'
  },
  {
    type: 'function',
    inputs: [],
    name: 'paused',
    outputs: [{ name: '', internalType: 'bool', type: 'bool' }],
    stateMutability: 'view'
  },
  {
    type: 'function',
    inputs: [
      { name: 'member', internalType: 'address', type: 'address' },
      { name: 'index', internalType: 'uint256', type: 'uint256' }
    ],
    name: 'releasable',
    outputs: [{ name: '', internalType: 'uint256', type: 'uint256' }],
    stateMutability: 'view'
  },
  {
    type: 'function',
    inputs: [{ name: 'index', internalType: 'uint256', type: 'uint256' }],
    name: 'release',
    outputs: [],
    stateMutability: 'nonpayable'
  },
  {
    type: 'function',
    inputs: [],
    name: 'renounceOwnership',
    outputs: [],
    stateMutability: 'nonpayable'
  },
  {
    type: 'function',
    inputs: [
      { name: 'member', internalType: 'address', type: 'address' },
      { name: 'index', internalType: 'uint256', type: 'uint256' }
    ],
    name: 'stopVesting',
    outputs: [],
    stateMutability: 'nonpayable'
  },
  {
    type: 'function',
    inputs: [{ name: 'newOwner', internalType: 'address', type: 'address' }],
    name: 'transferOwnership',
    outputs: [],
    stateMutability: 'nonpayable'
  },
  {
    type: 'function',
    inputs: [],
    name: 'unpause',
    outputs: [],
    stateMutability: 'nonpayable'
  },
  {
    type: 'function',
    inputs: [],
    name: 'version',
    outputs: [{ name: '', internalType: 'string', type: 'string' }],
    stateMutability: 'pure'
  },
  {
    type: 'function',
    inputs: [
      { name: 'member', internalType: 'address', type: 'address' },
      { name: 'index', internalType: 'uint256', type: 'uint256' }
    ],
    name: 'vestedAmount',
    outputs: [{ name: '', internalType: 'uint256', type: 'uint256' }],
    stateMutability: 'view'
  }
] as const
