// This file is generated from contract/versions/V2/abi by contract/scripts/versioned-abi-modules.mjs. Do not edit it manually.

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// AdCampaignManager
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

export const adCampaignManagerAbi = [
  {
    inputs: [
      {
        internalType: 'uint256',
        name: 'costPerClick',
        type: 'uint256'
      },
      {
        internalType: 'uint256',
        name: 'costPerImpression',
        type: 'uint256'
      },
      {
        internalType: 'address',
        name: 'bankContractAddress',
        type: 'address'
      }
    ],
    stateMutability: 'nonpayable',
    type: 'constructor'
  },
  {
    inputs: [],
    name: 'AdCampaignManager__AdvertiserTransferFailed',
    type: 'error'
  },
  {
    inputs: [
      {
        internalType: 'address',
        name: 'admin',
        type: 'address'
      }
    ],
    name: 'AdCampaignManager__AlreadyAdmin',
    type: 'error'
  },
  {
    inputs: [],
    name: 'AdCampaignManager__BankTransferFailed',
    type: 'error'
  },
  {
    inputs: [],
    name: 'AdCampaignManager__CampaignNotActive',
    type: 'error'
  },
  {
    inputs: [
      {
        internalType: 'uint256',
        name: 'required',
        type: 'uint256'
      },
      {
        internalType: 'uint256',
        name: 'available',
        type: 'uint256'
      }
    ],
    name: 'AdCampaignManager__InsufficientContractBalance',
    type: 'error'
  },
  {
    inputs: [],
    name: 'AdCampaignManager__InvalidCampaignCode',
    type: 'error'
  },
  {
    inputs: [
      {
        internalType: 'address',
        name: 'caller',
        type: 'address'
      }
    ],
    name: 'AdCampaignManager__NotAdminOrOwner',
    type: 'error'
  },
  {
    inputs: [
      {
        internalType: 'address',
        name: 'admin',
        type: 'address'
      }
    ],
    name: 'AdCampaignManager__NotAnAdmin',
    type: 'error'
  },
  {
    inputs: [
      {
        internalType: 'address',
        name: 'caller',
        type: 'address'
      }
    ],
    name: 'AdCampaignManager__NotAuthorizedWithdrawer',
    type: 'error'
  },
  {
    inputs: [],
    name: 'AdCampaignManager__SpentLessThanClaimed',
    type: 'error'
  },
  {
    inputs: [],
    name: 'AdCampaignManager__ZeroAddress',
    type: 'error'
  },
  {
    inputs: [],
    name: 'AdCampaignManager__ZeroAmount',
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
    anonymous: false,
    inputs: [
      {
        indexed: false,
        internalType: 'string',
        name: 'campaignCode',
        type: 'string'
      },
      {
        indexed: false,
        internalType: 'uint256',
        name: 'budget',
        type: 'uint256'
      }
    ],
    name: 'AdCampaignCreated',
    type: 'event'
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: 'address',
        name: 'admin',
        type: 'address'
      }
    ],
    name: 'AdminAdded',
    type: 'event'
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: 'address',
        name: 'admin',
        type: 'address'
      }
    ],
    name: 'AdminRemoved',
    type: 'event'
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: false,
        internalType: 'string',
        name: 'campaignCode',
        type: 'string'
      },
      {
        indexed: false,
        internalType: 'address',
        name: 'advertiser',
        type: 'address'
      },
      {
        indexed: false,
        internalType: 'uint256',
        name: 'amount',
        type: 'uint256'
      }
    ],
    name: 'BudgetWithdrawn',
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
        indexed: false,
        internalType: 'string',
        name: 'campaignCode',
        type: 'string'
      },
      {
        indexed: false,
        internalType: 'uint256',
        name: 'paymentAmount',
        type: 'uint256'
      }
    ],
    name: 'PaymentReleased',
    type: 'event'
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: false,
        internalType: 'string',
        name: 'campaignCode',
        type: 'string'
      },
      {
        indexed: false,
        internalType: 'uint256',
        name: 'paymentAmount',
        type: 'uint256'
      }
    ],
    name: 'PaymentReleasedOnWithdrawApproval',
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
        internalType: 'address',
        name: 'admin',
        type: 'address'
      }
    ],
    name: 'addAdmin',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function'
  },
  {
    inputs: [
      {
        internalType: 'string',
        name: 'campaignCode',
        type: 'string'
      },
      {
        internalType: 'uint256',
        name: 'currentAmountSpent',
        type: 'uint256'
      }
    ],
    name: 'claimPayment',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function'
  },
  {
    inputs: [],
    name: 'createAdCampaign',
    outputs: [],
    stateMutability: 'payable',
    type: 'function'
  },
  {
    inputs: [
      {
        internalType: 'string',
        name: 'campaignCode',
        type: 'string'
      }
    ],
    name: 'getAdCampaignByCode',
    outputs: [
      {
        components: [
          {
            internalType: 'uint256',
            name: 'budget',
            type: 'uint256'
          },
          {
            internalType: 'uint256',
            name: 'amountSpent',
            type: 'uint256'
          },
          {
            internalType: 'enum AdCampaignManager.CampaignStatus',
            name: 'status',
            type: 'uint8'
          },
          {
            internalType: 'string',
            name: 'campaignCode',
            type: 'string'
          },
          {
            internalType: 'address',
            name: 'advertiser',
            type: 'address'
          }
        ],
        internalType: 'struct AdCampaignManager.AdCampaign',
        name: '',
        type: 'tuple'
      }
    ],
    stateMutability: 'view',
    type: 'function'
  },
  {
    inputs: [],
    name: 'getAdCampaignCount',
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
        name: 'campaignId',
        type: 'uint256'
      }
    ],
    name: 'getAdCampaigns',
    outputs: [
      {
        components: [
          {
            internalType: 'uint256',
            name: 'budget',
            type: 'uint256'
          },
          {
            internalType: 'uint256',
            name: 'amountSpent',
            type: 'uint256'
          },
          {
            internalType: 'enum AdCampaignManager.CampaignStatus',
            name: 'status',
            type: 'uint8'
          },
          {
            internalType: 'string',
            name: 'campaignCode',
            type: 'string'
          },
          {
            internalType: 'address',
            name: 'advertiser',
            type: 'address'
          }
        ],
        internalType: 'struct AdCampaignManager.AdCampaign',
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
        internalType: 'address',
        name: 'account',
        type: 'address'
      }
    ],
    name: 'getAdminIndex',
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
    inputs: [],
    name: 'getAdminList',
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
        internalType: 'address',
        name: 'account',
        type: 'address'
      }
    ],
    name: 'getAdmins',
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
    name: 'getBankContractAddress',
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
        internalType: 'string',
        name: 'campaignCode',
        type: 'string'
      }
    ],
    name: 'getCampaignCodesToId',
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
    inputs: [],
    name: 'getCostPerClick',
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
    inputs: [],
    name: 'getCostPerImpression',
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
        name: 'admin',
        type: 'address'
      }
    ],
    name: 'removeAdmin',
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
        internalType: 'string',
        name: 'campaignCode',
        type: 'string'
      },
      {
        internalType: 'uint256',
        name: 'currentAmountSpent',
        type: 'uint256'
      }
    ],
    name: 'requestAndApproveWithdrawal',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function'
  },
  {
    inputs: [
      {
        internalType: 'address',
        name: 'bankContractAddress',
        type: 'address'
      }
    ],
    name: 'setBankContractAddress',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function'
  },
  {
    inputs: [
      {
        internalType: 'uint256',
        name: 'costPerClick',
        type: 'uint256'
      }
    ],
    name: 'setCostPerClick',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function'
  },
  {
    inputs: [
      {
        internalType: 'uint256',
        name: 'costPerImpression',
        type: 'uint256'
      }
    ],
    name: 'setCostPerImpression',
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
    inputs: [],
    name: 'version',
    outputs: [
      {
        internalType: 'string',
        name: '',
        type: 'string'
      }
    ],
    stateMutability: 'pure',
    type: 'function'
  },
  {
    stateMutability: 'payable',
    type: 'receive'
  }
] as const

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// Bank
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

export const bankAbi = [
  {
    inputs: [],
    stateMutability: 'nonpayable',
    type: 'constructor'
  },
  {
    inputs: [],
    name: 'Bank__FeeCollectorNotConfigured',
    type: 'error'
  },
  {
    inputs: [],
    name: 'Bank__FixedReturnContractNotFound',
    type: 'error'
  },
  {
    inputs: [
      {
        internalType: 'uint256',
        name: 'required',
        type: 'uint256'
      },
      {
        internalType: 'uint256',
        name: 'available',
        type: 'uint256'
      }
    ],
    name: 'Bank__InsufficientBalance',
    type: 'error'
  },
  {
    inputs: [
      {
        internalType: 'uint16',
        name: 'feeBps',
        type: 'uint16'
      }
    ],
    name: 'Bank__InvalidFeeBps',
    type: 'error'
  },
  {
    inputs: [],
    name: 'Bank__InvestorContractNotFound',
    type: 'error'
  },
  {
    inputs: [],
    name: 'Bank__OfficerAddressNotSet',
    type: 'error'
  },
  {
    inputs: [],
    name: 'Bank__TransferFailed',
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
    name: 'Bank__UnsupportedToken',
    type: 'error'
  },
  {
    inputs: [],
    name: 'Bank__ZeroAddress',
    type: 'error'
  },
  {
    inputs: [],
    name: 'Bank__ZeroAmount',
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
    inputs: [
      {
        internalType: 'address',
        name: 'token',
        type: 'address'
      }
    ],
    name: 'TokenSupport__AlreadyAdded',
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
    name: 'TokenSupport__NotFound',
    type: 'error'
  },
  {
    inputs: [],
    name: 'TokenSupport__ZeroAddress',
    type: 'error'
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
    inputs: [
      {
        indexed: true,
        internalType: 'address',
        name: 'investor',
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
        name: 'totalAmount',
        type: 'uint256'
      }
    ],
    name: 'DividendDistributionTriggered',
    type: 'event'
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: 'address',
        name: 'fixedReturn',
        type: 'address'
      },
      {
        indexed: true,
        internalType: 'uint256',
        name: 'offerId',
        type: 'uint256'
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
    name: 'FixedReturnRepaymentFunded',
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
        name: 'tokenAddress',
        type: 'address'
      }
    ],
    name: 'TokenSupportAdded',
    type: 'event'
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: 'address',
        name: 'tokenAddress',
        type: 'address'
      }
    ],
    name: 'TokenSupportRemoved',
    type: 'event'
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: 'address',
        name: 'sender',
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
        name: 'sender',
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
        internalType: 'address',
        name: 'tokenAddress',
        type: 'address'
      }
    ],
    name: 'addTokenSupport',
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
    inputs: [
      {
        internalType: 'uint256',
        name: 'amount',
        type: 'uint256'
      }
    ],
    name: 'distributeNativeDividends',
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
    name: 'distributeTokenDividends',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function'
  },
  {
    inputs: [
      {
        internalType: 'uint256',
        name: 'offerId',
        type: 'uint256'
      },
      {
        internalType: 'uint256',
        name: 'amount',
        type: 'uint256'
      }
    ],
    name: 'fundFixedReturnRepayment',
    outputs: [],
    stateMutability: 'nonpayable',
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
    inputs: [],
    name: 'getOfficerAddress',
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
    name: 'getSupportedTokenCount',
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
    inputs: [],
    name: 'getSupportedTokens',
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
        internalType: 'address[]',
        name: 'tokenAddresses',
        type: 'address[]'
      },
      {
        internalType: 'address',
        name: 'sender',
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
        internalType: 'address',
        name: 'token',
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
    inputs: [
      {
        internalType: 'address',
        name: 'tokenAddress',
        type: 'address'
      }
    ],
    name: 'removeTokenSupport',
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
        name: 'to',
        type: 'address'
      },
      {
        internalType: 'uint256',
        name: 'amount',
        type: 'uint256'
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
    inputs: [
      {
        internalType: 'address',
        name: 'token',
        type: 'address'
      },
      {
        internalType: 'address',
        name: 'to',
        type: 'address'
      },
      {
        internalType: 'uint256',
        name: 'amount',
        type: 'uint256'
      }
    ],
    name: 'transferToken',
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
    inputs: [],
    name: 'version',
    outputs: [
      {
        internalType: 'string',
        name: '',
        type: 'string'
      }
    ],
    stateMutability: 'pure',
    type: 'function'
  },
  {
    stateMutability: 'payable',
    type: 'receive'
  }
] as const

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// BoardOfDirectors
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

export const boardOfDirectorsAbi = [
  {
    inputs: [],
    stateMutability: 'nonpayable',
    type: 'constructor'
  },
  {
    inputs: [
      {
        internalType: 'uint256',
        name: 'actionId',
        type: 'uint256'
      }
    ],
    name: 'BoardOfDirectors__ActionAlreadyExecuted',
    type: 'error'
  },
  {
    inputs: [],
    name: 'BoardOfDirectors__AlreadyApproved',
    type: 'error'
  },
  {
    inputs: [
      {
        internalType: 'address',
        name: 'target',
        type: 'address'
      }
    ],
    name: 'BoardOfDirectors__CallFailed',
    type: 'error'
  },
  {
    inputs: [],
    name: 'BoardOfDirectors__EmptyList',
    type: 'error'
  },
  {
    inputs: [],
    name: 'BoardOfDirectors__NotApproved',
    type: 'error'
  },
  {
    inputs: [
      {
        internalType: 'address',
        name: 'caller',
        type: 'address'
      }
    ],
    name: 'BoardOfDirectors__NotBoardMember',
    type: 'error'
  },
  {
    inputs: [
      {
        internalType: 'address',
        name: 'caller',
        type: 'address'
      }
    ],
    name: 'BoardOfDirectors__NotOwner',
    type: 'error'
  },
  {
    inputs: [],
    name: 'BoardOfDirectors__NotSelf',
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
    name: 'BoardOfDirectors__OwnerAlreadyExists',
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
    name: 'BoardOfDirectors__OwnerNotFound',
    type: 'error'
  },
  {
    inputs: [],
    name: 'BoardOfDirectors__ZeroAddress',
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
    inputs: [],
    name: 'ReentrancyGuardReentrantCall',
    type: 'error'
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: 'uint256',
        name: 'id',
        type: 'uint256'
      },
      {
        indexed: true,
        internalType: 'address',
        name: 'target',
        type: 'address'
      },
      {
        indexed: false,
        internalType: 'string',
        name: 'description',
        type: 'string'
      },
      {
        indexed: false,
        internalType: 'bytes',
        name: 'data',
        type: 'bytes'
      }
    ],
    name: 'ActionAdded',
    type: 'event'
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: 'uint256',
        name: 'id',
        type: 'uint256'
      },
      {
        indexed: true,
        internalType: 'address',
        name: 'target',
        type: 'address'
      },
      {
        indexed: false,
        internalType: 'string',
        name: 'description',
        type: 'string'
      },
      {
        indexed: false,
        internalType: 'bytes',
        name: 'data',
        type: 'bytes'
      }
    ],
    name: 'ActionExecuted',
    type: 'event'
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: 'uint256',
        name: 'id',
        type: 'uint256'
      },
      {
        indexed: true,
        internalType: 'address',
        name: 'approver',
        type: 'address'
      }
    ],
    name: 'Approval',
    type: 'event'
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: false,
        internalType: 'address[]',
        name: 'boardOfDirectors',
        type: 'address[]'
      }
    ],
    name: 'BoardOfDirectorsChanged',
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
        indexed: false,
        internalType: 'address[]',
        name: 'owners',
        type: 'address[]'
      }
    ],
    name: 'OwnersChanged',
    type: 'event'
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: 'uint256',
        name: 'id',
        type: 'uint256'
      },
      {
        indexed: true,
        internalType: 'address',
        name: 'approver',
        type: 'address'
      }
    ],
    name: 'Revocation',
    type: 'event'
  },
  {
    inputs: [
      {
        internalType: 'address',
        name: 'target',
        type: 'address'
      },
      {
        internalType: 'string',
        name: 'description',
        type: 'string'
      },
      {
        internalType: 'bytes',
        name: 'data',
        type: 'bytes'
      }
    ],
    name: 'addAction',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function'
  },
  {
    inputs: [
      {
        internalType: 'address',
        name: 'owner',
        type: 'address'
      }
    ],
    name: 'addOwner',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function'
  },
  {
    inputs: [
      {
        internalType: 'uint256',
        name: 'actionId',
        type: 'uint256'
      }
    ],
    name: 'approvalCount',
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
        name: 'actionId',
        type: 'uint256'
      }
    ],
    name: 'approve',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function'
  },
  {
    inputs: [],
    name: 'getActionCount',
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
        name: 'actionId',
        type: 'uint256'
      }
    ],
    name: 'getActions',
    outputs: [
      {
        internalType: 'uint256',
        name: 'id',
        type: 'uint256'
      },
      {
        internalType: 'address',
        name: 'target',
        type: 'address'
      },
      {
        internalType: 'string',
        name: 'description',
        type: 'string'
      },
      {
        internalType: 'uint8',
        name: 'approvalCount_',
        type: 'uint8'
      },
      {
        internalType: 'bool',
        name: 'isExecuted',
        type: 'bool'
      },
      {
        internalType: 'bytes',
        name: 'data',
        type: 'bytes'
      },
      {
        internalType: 'address',
        name: 'createdBy',
        type: 'address'
      }
    ],
    stateMutability: 'view',
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
    inputs: [],
    name: 'getOwners',
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
        internalType: 'address[]',
        name: 'owners',
        type: 'address[]'
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
        internalType: 'uint256',
        name: 'actionId',
        type: 'uint256'
      }
    ],
    name: 'isActionExecuted',
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
        internalType: 'uint256',
        name: 'actionId',
        type: 'uint256'
      },
      {
        internalType: 'address',
        name: 'account',
        type: 'address'
      }
    ],
    name: 'isApproved',
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
        name: 'account',
        type: 'address'
      }
    ],
    name: 'isMember',
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
        name: 'owner',
        type: 'address'
      }
    ],
    name: 'removeOwner',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function'
  },
  {
    inputs: [
      {
        internalType: 'uint256',
        name: 'actionId',
        type: 'uint256'
      }
    ],
    name: 'revoke',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function'
  },
  {
    inputs: [
      {
        internalType: 'address[]',
        name: 'boardOfDirectors',
        type: 'address[]'
      }
    ],
    name: 'setBoardOfDirectors',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function'
  },
  {
    inputs: [
      {
        internalType: 'address[]',
        name: 'owners',
        type: 'address[]'
      }
    ],
    name: 'setOwners',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function'
  },
  {
    inputs: [],
    name: 'version',
    outputs: [
      {
        internalType: 'string',
        name: '',
        type: 'string'
      }
    ],
    stateMutability: 'pure',
    type: 'function'
  }
] as const

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// CashRemunerationEIP712
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

export const cashRemunerationEip712Abi = [
  {
    inputs: [],
    stateMutability: 'nonpayable',
    type: 'constructor'
  },
  {
    inputs: [],
    name: 'CashRemunerationEIP712__BankContractNotFound',
    type: 'error'
  },
  {
    inputs: [
      {
        internalType: 'bytes32',
        name: 'signatureHash',
        type: 'bytes32'
      }
    ],
    name: 'CashRemunerationEIP712__ClaimIsDisabled',
    type: 'error'
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
        name: 'required',
        type: 'uint256'
      },
      {
        internalType: 'uint256',
        name: 'available',
        type: 'uint256'
      }
    ],
    name: 'CashRemunerationEIP712__InsufficientTokenBalance',
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
        name: 'actual',
        type: 'address'
      }
    ],
    name: 'CashRemunerationEIP712__NotClaimOwner',
    type: 'error'
  },
  {
    inputs: [],
    name: 'CashRemunerationEIP712__OfficerAddressNotSet',
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
    name: 'CashRemunerationEIP712__TokenNotSupported',
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
    name: 'CashRemunerationEIP712__TokenTransferFailed',
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
    name: 'CashRemunerationEIP712__UnauthorizedAccess',
    type: 'error'
  },
  {
    inputs: [
      {
        internalType: 'bytes32',
        name: 'signatureHash',
        type: 'bytes32'
      }
    ],
    name: 'CashRemunerationEIP712__WageAlreadyPaid',
    type: 'error'
  },
  {
    inputs: [],
    name: 'CashRemunerationEIP712__ZeroAddress',
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
        name: 'token',
        type: 'address'
      }
    ],
    name: 'TokenSupport__AlreadyAdded',
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
    name: 'TokenSupport__NotFound',
    type: 'error'
  },
  {
    inputs: [],
    name: 'TokenSupport__ZeroAddress',
    type: 'error'
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
        name: 'newOfficerAddress',
        type: 'address'
      }
    ],
    name: 'OfficerAddressUpdated',
    type: 'event'
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: 'address',
        name: 'ownerAddress',
        type: 'address'
      },
      {
        indexed: false,
        internalType: 'uint256',
        name: 'amount',
        type: 'uint256'
      }
    ],
    name: 'OwnerTreasuryWithdrawNative',
    type: 'event'
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: 'address',
        name: 'ownerAddress',
        type: 'address'
      },
      {
        indexed: true,
        internalType: 'address',
        name: 'tokenAddress',
        type: 'address'
      },
      {
        indexed: false,
        internalType: 'uint256',
        name: 'amount',
        type: 'uint256'
      }
    ],
    name: 'OwnerTreasuryWithdrawToken',
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
        name: 'tokenAddress',
        type: 'address'
      }
    ],
    name: 'TokenSupportAdded',
    type: 'event'
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: 'address',
        name: 'tokenAddress',
        type: 'address'
      }
    ],
    name: 'TokenSupportRemoved',
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
        internalType: 'bytes32',
        name: 'signatureHash',
        type: 'bytes32'
      }
    ],
    name: 'WageClaimDisabled',
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
    name: 'WageClaimEnabled',
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
        indexed: false,
        internalType: 'uint256',
        name: 'amount',
        type: 'uint256'
      }
    ],
    name: 'Withdraw',
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
        name: 'tokenAddress',
        type: 'address'
      },
      {
        indexed: false,
        internalType: 'uint256',
        name: 'amount',
        type: 'uint256'
      }
    ],
    name: 'WithdrawToken',
    type: 'event'
  },
  {
    inputs: [
      {
        internalType: 'address',
        name: 'tokenAddress',
        type: 'address'
      }
    ],
    name: 'addTokenSupport',
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
    name: 'disableClaim',
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
        name: 'signatureHash',
        type: 'bytes32'
      }
    ],
    name: 'enableClaim',
    outputs: [],
    stateMutability: 'nonpayable',
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
        internalType: 'bytes32',
        name: 'signatureHash',
        type: 'bytes32'
      }
    ],
    name: 'getDisabledWageClaim',
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
    name: 'getOfficerAddress',
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
        internalType: 'bytes32',
        name: 'signatureHash',
        type: 'bytes32'
      }
    ],
    name: 'getPaidWageClaim',
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
    name: 'getSupportedTokenCount',
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
    inputs: [],
    name: 'getSupportedTokens',
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
        internalType: 'address',
        name: 'initialOwner',
        type: 'address'
      },
      {
        internalType: 'address[]',
        name: 'tokenAddresses',
        type: 'address[]'
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
        internalType: 'address',
        name: 'token',
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
    name: 'ownerWithdrawAllToBank',
    outputs: [],
    stateMutability: 'nonpayable',
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
        name: 'tokenAddress',
        type: 'address'
      }
    ],
    name: 'removeTokenSupport',
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
    inputs: [],
    name: 'version',
    outputs: [
      {
        internalType: 'string',
        name: '',
        type: 'string'
      }
    ],
    stateMutability: 'pure',
    type: 'function'
  },
  {
    inputs: [
      {
        components: [
          {
            internalType: 'address',
            name: 'employeeAddress',
            type: 'address'
          },
          {
            internalType: 'uint16',
            name: 'minutesWorked',
            type: 'uint16'
          },
          {
            components: [
              {
                internalType: 'uint256',
                name: 'hourlyRate',
                type: 'uint256'
              },
              {
                internalType: 'address',
                name: 'tokenAddress',
                type: 'address'
              }
            ],
            internalType: 'struct CashRemunerationEIP712.Wage[]',
            name: 'wages',
            type: 'tuple[]'
          },
          {
            internalType: 'uint256',
            name: 'date',
            type: 'uint256'
          }
        ],
        internalType: 'struct CashRemunerationEIP712.WageClaim',
        name: 'wageClaim',
        type: 'tuple'
      },
      {
        internalType: 'bytes',
        name: 'signature',
        type: 'bytes'
      }
    ],
    name: 'withdraw',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function'
  },
  {
    stateMutability: 'payable',
    type: 'receive'
  }
] as const

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// Elections
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

export const electionsAbi = [
  {
    inputs: [],
    stateMutability: 'nonpayable',
    type: 'constructor'
  },
  {
    inputs: [],
    name: 'ElectionUtils__DuplicateCandidates',
    type: 'error'
  },
  {
    inputs: [],
    name: 'ElectionUtils__DuplicateVoters',
    type: 'error'
  },
  {
    inputs: [],
    name: 'ElectionUtils__InsufficientCandidates',
    type: 'error'
  },
  {
    inputs: [],
    name: 'ElectionUtils__InvalidCandidate',
    type: 'error'
  },
  {
    inputs: [],
    name: 'ElectionUtils__InvalidDates',
    type: 'error'
  },
  {
    inputs: [],
    name: 'ElectionUtils__InvalidSeatCount',
    type: 'error'
  },
  {
    inputs: [],
    name: 'ElectionUtils__NoEligibleVoters',
    type: 'error'
  },
  {
    inputs: [],
    name: 'Elections__AlreadyVoted',
    type: 'error'
  },
  {
    inputs: [],
    name: 'Elections__BoardOfDirectorsNotFound',
    type: 'error'
  },
  {
    inputs: [],
    name: 'Elections__ElectionEnded',
    type: 'error'
  },
  {
    inputs: [],
    name: 'Elections__ElectionIsOngoing',
    type: 'error'
  },
  {
    inputs: [],
    name: 'Elections__ElectionNotActive',
    type: 'error'
  },
  {
    inputs: [],
    name: 'Elections__ElectionNotFound',
    type: 'error'
  },
  {
    inputs: [],
    name: 'Elections__NotEligibleVoter',
    type: 'error'
  },
  {
    inputs: [],
    name: 'Elections__OfficerAddressNotSet',
    type: 'error'
  },
  {
    inputs: [],
    name: 'Elections__ResultsAlreadyPublished',
    type: 'error'
  },
  {
    inputs: [],
    name: 'Elections__ResultsNotReady',
    type: 'error'
  },
  {
    inputs: [],
    name: 'Elections__Unauthorized',
    type: 'error'
  },
  {
    inputs: [],
    name: 'Elections__ZeroSender',
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
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: 'uint256',
        name: 'electionId',
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
        name: 'createdBy',
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
      },
      {
        indexed: false,
        internalType: 'uint256',
        name: 'seatCount',
        type: 'uint256'
      }
    ],
    name: 'ElectionCreated',
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
        internalType: 'uint256',
        name: 'electionId',
        type: 'uint256'
      },
      {
        indexed: false,
        internalType: 'address[]',
        name: 'winners',
        type: 'address[]'
      }
    ],
    name: 'ResultsPublished',
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
        internalType: 'uint256',
        name: 'electionId',
        type: 'uint256'
      },
      {
        indexed: true,
        internalType: 'address',
        name: 'voter',
        type: 'address'
      },
      {
        indexed: true,
        internalType: 'address',
        name: 'candidate',
        type: 'address'
      }
    ],
    name: 'VoteSubmitted',
    type: 'event'
  },
  {
    inputs: [
      {
        internalType: 'uint256',
        name: 'electionId',
        type: 'uint256'
      },
      {
        internalType: 'address',
        name: 'candidate',
        type: 'address'
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
        internalType: 'uint256',
        name: 'seatCount',
        type: 'uint256'
      },
      {
        internalType: 'address[]',
        name: 'candidates',
        type: 'address[]'
      },
      {
        internalType: 'address[]',
        name: 'eligibleVoters',
        type: 'address[]'
      }
    ],
    name: 'createElection',
    outputs: [
      {
        internalType: 'uint256',
        name: 'electionId',
        type: 'uint256'
      }
    ],
    stateMutability: 'nonpayable',
    type: 'function'
  },
  {
    inputs: [
      {
        internalType: 'uint256',
        name: 'electionId',
        type: 'uint256'
      }
    ],
    name: 'getElection',
    outputs: [
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
        internalType: 'address',
        name: 'createdBy',
        type: 'address'
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
        internalType: 'uint256',
        name: 'seatCount',
        type: 'uint256'
      },
      {
        internalType: 'bool',
        name: 'resultsPublished',
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
        name: 'electionId',
        type: 'uint256'
      }
    ],
    name: 'getElectionCandidates',
    outputs: [
      {
        internalType: 'address[]',
        name: 'candidates',
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
        name: 'electionId',
        type: 'uint256'
      }
    ],
    name: 'getElectionEligibleVoters',
    outputs: [
      {
        internalType: 'address[]',
        name: 'voters',
        type: 'address[]'
      }
    ],
    stateMutability: 'view',
    type: 'function'
  },
  {
    inputs: [],
    name: 'getElectionIds',
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
    inputs: [
      {
        internalType: 'uint256',
        name: 'electionId',
        type: 'uint256'
      }
    ],
    name: 'getElectionResults',
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
        name: 'electionId',
        type: 'uint256'
      }
    ],
    name: 'getElectionWinners',
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
    inputs: [],
    name: 'getNextElectionId',
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
    inputs: [],
    name: 'getOfficerAddress',
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
        internalType: 'uint256',
        name: 'electionId',
        type: 'uint256'
      }
    ],
    name: 'getVoteCount',
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
        name: 'electionId',
        type: 'uint256'
      },
      {
        internalType: 'address',
        name: 'candidate',
        type: 'address'
      }
    ],
    name: 'getVoteCounts',
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
        name: 'electionId',
        type: 'uint256'
      },
      {
        internalType: 'address',
        name: 'voter',
        type: 'address'
      }
    ],
    name: 'getVoterChoice',
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
        internalType: 'uint256',
        name: 'electionId',
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
        name: 'ownerAddress',
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
        internalType: 'uint256',
        name: 'electionId',
        type: 'uint256'
      },
      {
        internalType: 'address',
        name: 'voter',
        type: 'address'
      }
    ],
    name: 'isEligibleVoter',
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
        internalType: 'uint256',
        name: 'electionId',
        type: 'uint256'
      }
    ],
    name: 'publishResults',
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
    inputs: [],
    name: 'version',
    outputs: [
      {
        internalType: 'string',
        name: '',
        type: 'string'
      }
    ],
    stateMutability: 'pure',
    type: 'function'
  }
] as const

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// ExpenseAccountEIP712
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

export const expenseAccountEip712Abi = [
  {
    inputs: [],
    stateMutability: 'nonpayable',
    type: 'constructor'
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
    name: 'ExpenseAccountEIP712__AmountExceedsBudgetLimit',
    type: 'error'
  },
  {
    inputs: [],
    name: 'ExpenseAccountEIP712__AmountExceedsPeriodBudget',
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
    name: 'ExpenseAccountEIP712__AmountPerPeriodExceeded',
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
    name: 'ExpenseAccountEIP712__AmountPerTransactionExceeded',
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
    name: 'ExpenseAccountEIP712__ApprovalExpired',
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
    name: 'ExpenseAccountEIP712__ApprovalNotActive',
    type: 'error'
  },
  {
    inputs: [],
    name: 'ExpenseAccountEIP712__BankContractNotFound',
    type: 'error'
  },
  {
    inputs: [
      {
        internalType: 'uint256',
        name: 'required',
        type: 'uint256'
      },
      {
        internalType: 'uint256',
        name: 'available',
        type: 'uint256'
      }
    ],
    name: 'ExpenseAccountEIP712__InsufficientNativeBalance',
    type: 'error'
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
        name: 'required',
        type: 'uint256'
      },
      {
        internalType: 'uint256',
        name: 'available',
        type: 'uint256'
      }
    ],
    name: 'ExpenseAccountEIP712__InsufficientTokenBalance',
    type: 'error'
  },
  {
    inputs: [],
    name: 'ExpenseAccountEIP712__InvalidCustomFrequency',
    type: 'error'
  },
  {
    inputs: [],
    name: 'ExpenseAccountEIP712__InvalidFrequencyType',
    type: 'error'
  },
  {
    inputs: [],
    name: 'ExpenseAccountEIP712__OfficerAddressNotSet',
    type: 'error'
  },
  {
    inputs: [],
    name: 'ExpenseAccountEIP712__OneTimeBudgetAlreadyUsed',
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
        name: 'actual',
        type: 'address'
      }
    ],
    name: 'ExpenseAccountEIP712__SignerNotAuthorized',
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
        name: 'actual',
        type: 'address'
      }
    ],
    name: 'ExpenseAccountEIP712__SpenderNotApproved',
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
    name: 'ExpenseAccountEIP712__TokenNotSupported',
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
    name: 'ExpenseAccountEIP712__TokenTransferFailed',
    type: 'error'
  },
  {
    inputs: [],
    name: 'ExpenseAccountEIP712__TransferNotAllowed',
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
    name: 'ExpenseAccountEIP712__UnauthorizedAccess',
    type: 'error'
  },
  {
    inputs: [],
    name: 'ExpenseAccountEIP712__ZeroAddress',
    type: 'error'
  },
  {
    inputs: [],
    name: 'ExpenseAccountEIP712__ZeroAmount',
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
        name: 'token',
        type: 'address'
      }
    ],
    name: 'TokenSupport__AlreadyAdded',
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
    name: 'TokenSupport__NotFound',
    type: 'error'
  },
  {
    inputs: [],
    name: 'TokenSupport__ZeroAddress',
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
        name: 'ownerAddress',
        type: 'address'
      },
      {
        indexed: false,
        internalType: 'uint256',
        name: 'amount',
        type: 'uint256'
      }
    ],
    name: 'OwnerTreasuryWithdrawNative',
    type: 'event'
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: 'address',
        name: 'ownerAddress',
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
    name: 'OwnerTreasuryWithdrawToken',
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
        name: 'tokenAddress',
        type: 'address'
      }
    ],
    name: 'TokenSupportAdded',
    type: 'event'
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: 'address',
        name: 'tokenAddress',
        type: 'address'
      }
    ],
    name: 'TokenSupportRemoved',
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
        internalType: 'address',
        name: 'tokenAddress',
        type: 'address'
      }
    ],
    name: 'addTokenSupport',
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
        internalType: 'bytes32',
        name: 'signatureHash',
        type: 'bytes32'
      }
    ],
    name: 'getExpenseBalance',
    outputs: [
      {
        components: [
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
        internalType: 'struct ExpenseAccountEIP712.ExpenseBalance',
        name: '',
        type: 'tuple'
      }
    ],
    stateMutability: 'view',
    type: 'function'
  },
  {
    inputs: [],
    name: 'getOfficerAddress',
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
    inputs: [],
    name: 'getSupportedTokenCount',
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
    inputs: [],
    name: 'getSupportedTokens',
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
        internalType: 'address[]',
        name: 'tokenAddresses',
        type: 'address[]'
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
        name: 'token',
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
    name: 'ownerWithdrawAllToBank',
    outputs: [],
    stateMutability: 'nonpayable',
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
        name: 'tokenAddress',
        type: 'address'
      }
    ],
    name: 'removeTokenSupport',
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
        name: 'officerAddress',
        type: 'address'
      }
    ],
    name: 'setOfficerAddress',
    outputs: [],
    stateMutability: 'nonpayable',
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
    inputs: [],
    name: 'version',
    outputs: [
      {
        internalType: 'string',
        name: '',
        type: 'string'
      }
    ],
    stateMutability: 'pure',
    type: 'function'
  },
  {
    stateMutability: 'payable',
    type: 'receive'
  }
] as const

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// FactoryBeacon
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

export const factoryBeaconAbi = [
  {
    inputs: [
      {
        internalType: 'address',
        name: 'implementationAddress',
        type: 'address'
      }
    ],
    stateMutability: 'nonpayable',
    type: 'constructor'
  },
  {
    inputs: [
      {
        internalType: 'address',
        name: 'implementation',
        type: 'address'
      }
    ],
    name: 'BeaconInvalidImplementation',
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
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: 'address',
        name: 'proxy',
        type: 'address'
      },
      {
        indexed: true,
        internalType: 'address',
        name: 'deployer',
        type: 'address'
      }
    ],
    name: 'BeaconProxyCreated',
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
        indexed: true,
        internalType: 'address',
        name: 'implementation',
        type: 'address'
      }
    ],
    name: 'Upgraded',
    type: 'event'
  },
  {
    inputs: [
      {
        internalType: 'bytes',
        name: 'data',
        type: 'bytes'
      }
    ],
    name: 'createBeaconProxy',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function'
  },
  {
    inputs: [],
    name: 'implementation',
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
    name: 'renounceOwnership',
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
    inputs: [
      {
        internalType: 'address',
        name: 'newImplementation',
        type: 'address'
      }
    ],
    name: 'upgradeTo',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function'
  }
] as const

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// FeeCollector
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

export const feeCollectorAbi = [
  {
    inputs: [],
    stateMutability: 'nonpayable',
    type: 'constructor'
  },
  {
    inputs: [
      {
        internalType: 'string',
        name: 'contractType',
        type: 'string'
      }
    ],
    name: 'FeeCollector__DuplicateContractType',
    type: 'error'
  },
  {
    inputs: [],
    name: 'FeeCollector__EmptyContractType',
    type: 'error'
  },
  {
    inputs: [
      {
        internalType: 'uint16',
        name: 'feeBps',
        type: 'uint16'
      }
    ],
    name: 'FeeCollector__InvalidBps',
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
    name: 'FeeCollector__TokenNotSupported',
    type: 'error'
  },
  {
    inputs: [],
    name: 'FeeCollector__WithdrawalFailed',
    type: 'error'
  },
  {
    inputs: [],
    name: 'FeeCollector__ZeroAddress',
    type: 'error'
  },
  {
    inputs: [],
    name: 'FeeCollector__ZeroAmount',
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
    inputs: [
      {
        internalType: 'address',
        name: 'token',
        type: 'address'
      }
    ],
    name: 'TokenSupport__AlreadyAdded',
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
    name: 'TokenSupport__NotFound',
    type: 'error'
  },
  {
    inputs: [],
    name: 'TokenSupport__ZeroAddress',
    type: 'error'
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: 'address',
        name: 'previous',
        type: 'address'
      },
      {
        indexed: true,
        internalType: 'address',
        name: 'current',
        type: 'address'
      }
    ],
    name: 'FeeBeneficiaryUpdated',
    type: 'event'
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: 'string',
        name: 'contractType',
        type: 'string'
      },
      {
        indexed: false,
        internalType: 'uint16',
        name: 'feeBps',
        type: 'uint16'
      }
    ],
    name: 'FeeConfigUpdated',
    type: 'event'
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: 'string',
        name: 'contractType',
        type: 'string'
      },
      {
        indexed: true,
        internalType: 'address',
        name: 'payer',
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
    name: 'FeePaid',
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
        indexed: true,
        internalType: 'address',
        name: 'tokenAddress',
        type: 'address'
      }
    ],
    name: 'TokenSupportAdded',
    type: 'event'
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: 'address',
        name: 'tokenAddress',
        type: 'address'
      }
    ],
    name: 'TokenSupportRemoved',
    type: 'event'
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: 'address',
        name: 'recipient',
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
    name: 'TokenWithdrawn',
    type: 'event'
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: 'address',
        name: 'recipient',
        type: 'address'
      },
      {
        indexed: false,
        internalType: 'uint256',
        name: 'amount',
        type: 'uint256'
      }
    ],
    name: 'Withdrawn',
    type: 'event'
  },
  {
    inputs: [
      {
        internalType: 'address',
        name: 'tokenAddress',
        type: 'address'
      }
    ],
    name: 'addTokenSupport',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function'
  },
  {
    inputs: [],
    name: 'getAllFeeConfigs',
    outputs: [
      {
        components: [
          {
            internalType: 'string',
            name: 'contractType',
            type: 'string'
          },
          {
            internalType: 'uint16',
            name: 'feeBps',
            type: 'uint16'
          }
        ],
        internalType: 'struct FeeCollector.FeeConfig[]',
        name: '',
        type: 'tuple[]'
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
    inputs: [],
    name: 'getFeeBeneficiary',
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
        internalType: 'string',
        name: 'contractType',
        type: 'string'
      }
    ],
    name: 'getFeeFor',
    outputs: [
      {
        internalType: 'uint16',
        name: '',
        type: 'uint16'
      }
    ],
    stateMutability: 'view',
    type: 'function'
  },
  {
    inputs: [],
    name: 'getSupportedTokenCount',
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
    inputs: [],
    name: 'getSupportedTokens',
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
        name: 'initialOwner',
        type: 'address'
      },
      {
        components: [
          {
            internalType: 'string',
            name: 'contractType',
            type: 'string'
          },
          {
            internalType: 'uint16',
            name: 'feeBps',
            type: 'uint16'
          }
        ],
        internalType: 'struct FeeCollector.FeeConfig[]',
        name: 'configs',
        type: 'tuple[]'
      },
      {
        internalType: 'address[]',
        name: 'tokenAddresses',
        type: 'address[]'
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
        internalType: 'address',
        name: 'token',
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
    inputs: [
      {
        internalType: 'string',
        name: 'contractType',
        type: 'string'
      }
    ],
    name: 'payFee',
    outputs: [],
    stateMutability: 'payable',
    type: 'function'
  },
  {
    inputs: [
      {
        internalType: 'string',
        name: 'contractType',
        type: 'string'
      },
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
    name: 'payFeeToken',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function'
  },
  {
    inputs: [
      {
        internalType: 'address',
        name: 'tokenAddress',
        type: 'address'
      }
    ],
    name: 'removeTokenSupport',
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
        internalType: 'string',
        name: 'contractType',
        type: 'string'
      },
      {
        internalType: 'uint16',
        name: 'feeBps',
        type: 'uint16'
      }
    ],
    name: 'setFee',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function'
  },
  {
    inputs: [
      {
        internalType: 'address',
        name: 'beneficiary',
        type: 'address'
      }
    ],
    name: 'setFeeBeneficiary',
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
    name: 'version',
    outputs: [
      {
        internalType: 'string',
        name: '',
        type: 'string'
      }
    ],
    stateMutability: 'pure',
    type: 'function'
  },
  {
    inputs: [],
    name: 'withdraw',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function'
  },
  {
    stateMutability: 'payable',
    type: 'receive'
  }
] as const

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// FixedReturn
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

export const fixedReturnAbi = [
  {
    inputs: [],
    stateMutability: 'nonpayable',
    type: 'constructor'
  },
  {
    inputs: [],
    name: 'FixedReturn__AllocationSumBelowFundingTarget',
    type: 'error'
  },
  {
    inputs: [],
    name: 'FixedReturn__BankContractNotFound',
    type: 'error'
  },
  {
    inputs: [],
    name: 'FixedReturn__DeadlineNotPassed',
    type: 'error'
  },
  {
    inputs: [],
    name: 'FixedReturn__DepositExceedsAllocation',
    type: 'error'
  },
  {
    inputs: [],
    name: 'FixedReturn__DepositExceedsLenderCap',
    type: 'error'
  },
  {
    inputs: [],
    name: 'FixedReturn__DuplicateWhitelistAddress',
    type: 'error'
  },
  {
    inputs: [],
    name: 'FixedReturn__ExceedsRepaymentObligation',
    type: 'error'
  },
  {
    inputs: [],
    name: 'FixedReturn__FundingTargetReached',
    type: 'error'
  },
  {
    inputs: [],
    name: 'FixedReturn__InvalidDeadline',
    type: 'error'
  },
  {
    inputs: [],
    name: 'FixedReturn__InvalidTermDuration',
    type: 'error'
  },
  {
    inputs: [],
    name: 'FixedReturn__LenderCapExceedsFundingTarget',
    type: 'error'
  },
  {
    inputs: [],
    name: 'FixedReturn__NoFundsRaised',
    type: 'error'
  },
  {
    inputs: [
      {
        internalType: 'address',
        name: 'caller',
        type: 'address'
      }
    ],
    name: 'FixedReturn__NotBank',
    type: 'error'
  },
  {
    inputs: [],
    name: 'FixedReturn__NotWhitelisted',
    type: 'error'
  },
  {
    inputs: [],
    name: 'FixedReturn__OfferNotFunded',
    type: 'error'
  },
  {
    inputs: [],
    name: 'FixedReturn__OfferNotOpen',
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
    name: 'FixedReturn__TokenNotSupportedByBank',
    type: 'error'
  },
  {
    inputs: [],
    name: 'FixedReturn__WhitelistLengthMismatch',
    type: 'error'
  },
  {
    inputs: [],
    name: 'FixedReturn__ZeroAddress',
    type: 'error'
  },
  {
    inputs: [],
    name: 'FixedReturn__ZeroAmount',
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
    inputs: [
      {
        internalType: 'address',
        name: 'token',
        type: 'address'
      }
    ],
    name: 'TokenSupport__AlreadyAdded',
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
    name: 'TokenSupport__NotFound',
    type: 'error'
  },
  {
    inputs: [],
    name: 'TokenSupport__ZeroAddress',
    type: 'error'
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: 'uint256',
        name: 'offerId',
        type: 'uint256'
      },
      {
        indexed: true,
        internalType: 'address',
        name: 'lender',
        type: 'address'
      },
      {
        indexed: false,
        internalType: 'uint256',
        name: 'amount',
        type: 'uint256'
      }
    ],
    name: 'FundsLent',
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
        internalType: 'uint256',
        name: 'offerId',
        type: 'uint256'
      },
      {
        indexed: true,
        internalType: 'address',
        name: 'lender',
        type: 'address'
      },
      {
        indexed: false,
        internalType: 'uint256',
        name: 'amount',
        type: 'uint256'
      }
    ],
    name: 'LenderRepaid',
    type: 'event'
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: 'uint256',
        name: 'offerId',
        type: 'uint256'
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
        name: 'fundingTarget',
        type: 'uint256'
      },
      {
        indexed: false,
        internalType: 'uint256',
        name: 'interestRateBps',
        type: 'uint256'
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
        name: 'subscriptionDeadline',
        type: 'uint256'
      },
      {
        indexed: false,
        internalType: 'enum FixedReturn.FundingAccess',
        name: 'fundingAccess',
        type: 'uint8'
      }
    ],
    name: 'LendingOfferCreated',
    type: 'event'
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: 'uint256',
        name: 'offerId',
        type: 'uint256'
      }
    ],
    name: 'LendingOfferFunded',
    type: 'event'
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: 'uint256',
        name: 'offerId',
        type: 'uint256'
      }
    ],
    name: 'LendingOfferRefundable',
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
        indexed: true,
        internalType: 'uint256',
        name: 'offerId',
        type: 'uint256'
      },
      {
        indexed: false,
        internalType: 'uint256',
        name: 'totalFunded',
        type: 'uint256'
      },
      {
        indexed: false,
        internalType: 'uint256',
        name: 'fundingTarget',
        type: 'uint256'
      }
    ],
    name: 'PartialFundingAccepted',
    type: 'event'
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: 'uint256',
        name: 'offerId',
        type: 'uint256'
      },
      {
        indexed: true,
        internalType: 'address',
        name: 'lender',
        type: 'address'
      },
      {
        indexed: false,
        internalType: 'uint256',
        name: 'amount',
        type: 'uint256'
      }
    ],
    name: 'PrincipalRefunded',
    type: 'event'
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: 'uint256',
        name: 'offerId',
        type: 'uint256'
      },
      {
        indexed: false,
        internalType: 'uint256',
        name: 'totalAmount',
        type: 'uint256'
      }
    ],
    name: 'RefundsDistributed',
    type: 'event'
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: 'uint256',
        name: 'offerId',
        type: 'uint256'
      },
      {
        indexed: false,
        internalType: 'uint256',
        name: 'totalAmount',
        type: 'uint256'
      }
    ],
    name: 'RepaymentDistributed',
    type: 'event'
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: 'address',
        name: 'tokenAddress',
        type: 'address'
      }
    ],
    name: 'TokenSupportAdded',
    type: 'event'
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: 'address',
        name: 'tokenAddress',
        type: 'address'
      }
    ],
    name: 'TokenSupportRemoved',
    type: 'event'
  },
  {
    inputs: [],
    name: 'UNCAPPED_ALLOCATION',
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
        name: 'offerId',
        type: 'uint256'
      }
    ],
    name: 'acceptPartialFunding',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function'
  },
  {
    inputs: [
      {
        internalType: 'address',
        name: 'tokenAddress',
        type: 'address'
      }
    ],
    name: 'addTokenSupport',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function'
  },
  {
    inputs: [
      {
        components: [
          {
            internalType: 'address',
            name: 'token',
            type: 'address'
          },
          {
            internalType: 'uint256',
            name: 'fundingTarget',
            type: 'uint256'
          },
          {
            internalType: 'uint256',
            name: 'interestRateBps',
            type: 'uint256'
          },
          {
            internalType: 'uint16',
            name: 'termDuration',
            type: 'uint16'
          },
          {
            internalType: 'enum FixedReturn.TermUnit',
            name: 'termUnit',
            type: 'uint8'
          },
          {
            internalType: 'uint256',
            name: 'startDate',
            type: 'uint256'
          },
          {
            internalType: 'uint256',
            name: 'subscriptionDeadline',
            type: 'uint256'
          },
          {
            internalType: 'enum FixedReturn.FundingAccess',
            name: 'fundingAccess',
            type: 'uint8'
          },
          {
            internalType: 'bool',
            name: 'isCapEnabled',
            type: 'bool'
          },
          {
            internalType: 'uint256',
            name: 'lenderCap',
            type: 'uint256'
          },
          {
            internalType: 'address[]',
            name: 'whitelistAddrs',
            type: 'address[]'
          },
          {
            internalType: 'uint256[]',
            name: 'allocations',
            type: 'uint256[]'
          }
        ],
        internalType: 'struct FixedReturn.CreateOfferParams',
        name: 'params',
        type: 'tuple'
      }
    ],
    name: 'createLendingOffer',
    outputs: [
      {
        internalType: 'uint256',
        name: 'offerId',
        type: 'uint256'
      }
    ],
    stateMutability: 'nonpayable',
    type: 'function'
  },
  {
    inputs: [
      {
        internalType: 'uint256',
        name: 'offerId',
        type: 'uint256'
      },
      {
        internalType: 'address',
        name: 'lender',
        type: 'address'
      }
    ],
    name: 'getHasDeposited',
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
        internalType: 'uint256',
        name: 'offerId',
        type: 'uint256'
      },
      {
        internalType: 'address',
        name: 'lender',
        type: 'address'
      }
    ],
    name: 'getLenderAllocation',
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
        name: 'offerId',
        type: 'uint256'
      },
      {
        internalType: 'address',
        name: 'lender',
        type: 'address'
      }
    ],
    name: 'getLenderDeposits',
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
        name: 'offerId',
        type: 'uint256'
      }
    ],
    name: 'getLendingOffer',
    outputs: [
      {
        components: [
          {
            internalType: 'address',
            name: 'token',
            type: 'address'
          },
          {
            internalType: 'uint256',
            name: 'fundingTarget',
            type: 'uint256'
          },
          {
            internalType: 'uint256',
            name: 'interestRateBps',
            type: 'uint256'
          },
          {
            internalType: 'uint16',
            name: 'termDuration',
            type: 'uint16'
          },
          {
            internalType: 'enum FixedReturn.TermUnit',
            name: 'termUnit',
            type: 'uint8'
          },
          {
            internalType: 'uint256',
            name: 'startDate',
            type: 'uint256'
          },
          {
            internalType: 'uint256',
            name: 'subscriptionDeadline',
            type: 'uint256'
          },
          {
            internalType: 'enum FixedReturn.FundingAccess',
            name: 'fundingAccess',
            type: 'uint8'
          },
          {
            internalType: 'bool',
            name: 'isCapEnabled',
            type: 'bool'
          },
          {
            internalType: 'uint256',
            name: 'lenderCap',
            type: 'uint256'
          },
          {
            internalType: 'uint256',
            name: 'totalFunded',
            type: 'uint256'
          },
          {
            internalType: 'uint256',
            name: 'totalRepaidByIssuer',
            type: 'uint256'
          },
          {
            internalType: 'enum FixedReturn.OfferState',
            name: 'state',
            type: 'uint8'
          }
        ],
        internalType: 'struct FixedReturn.LendingOffer',
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
        name: 'offerId',
        type: 'uint256'
      }
    ],
    name: 'getOfferLenders',
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
    inputs: [],
    name: 'getOfficerAddress',
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
    name: 'getSupportedTokenCount',
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
    inputs: [],
    name: 'getSupportedTokens',
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
    inputs: [],
    name: 'getTotalOfferings',
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
        name: 'offerId',
        type: 'uint256'
      },
      {
        internalType: 'address',
        name: 'lender',
        type: 'address'
      }
    ],
    name: 'getTotalPaidToLender',
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
        internalType: 'address[]',
        name: 'tokenAddresses',
        type: 'address[]'
      },
      {
        internalType: 'address',
        name: 'ownerAddress',
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
        internalType: 'address',
        name: 'token',
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
    inputs: [
      {
        internalType: 'uint256',
        name: 'offerId',
        type: 'uint256'
      },
      {
        internalType: 'uint256',
        name: 'amount',
        type: 'uint256'
      }
    ],
    name: 'lendFunds',
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
    inputs: [
      {
        internalType: 'uint256',
        name: 'offerId',
        type: 'uint256'
      }
    ],
    name: 'refundLenders',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function'
  },
  {
    inputs: [
      {
        internalType: 'address',
        name: 'tokenAddress',
        type: 'address'
      }
    ],
    name: 'removeTokenSupport',
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
        internalType: 'uint256',
        name: 'offerId',
        type: 'uint256'
      },
      {
        internalType: 'uint256',
        name: 'amount',
        type: 'uint256'
      }
    ],
    name: 'repayLenders',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function'
  },
  {
    inputs: [
      {
        internalType: 'uint256',
        name: 'offerId',
        type: 'uint256'
      },
      {
        internalType: 'address',
        name: 'lender',
        type: 'address'
      }
    ],
    name: 'totalEntitlementOf',
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
    name: 'version',
    outputs: [
      {
        internalType: 'string',
        name: '',
        type: 'string'
      }
    ],
    stateMutability: 'pure',
    type: 'function'
  }
] as const

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// InvestorV1
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

export const investorAbi = [
  {
    inputs: [],
    stateMutability: 'nonpayable',
    type: 'constructor'
  },
  {
    inputs: [],
    name: 'AccessControlBadConfirmation',
    type: 'error'
  },
  {
    inputs: [
      {
        internalType: 'address',
        name: 'account',
        type: 'address'
      },
      {
        internalType: 'bytes32',
        name: 'neededRole',
        type: 'bytes32'
      }
    ],
    name: 'AccessControlUnauthorizedAccount',
    type: 'error'
  },
  {
    inputs: [
      {
        internalType: 'address',
        name: 'spender',
        type: 'address'
      },
      {
        internalType: 'uint256',
        name: 'allowance',
        type: 'uint256'
      },
      {
        internalType: 'uint256',
        name: 'needed',
        type: 'uint256'
      }
    ],
    name: 'ERC20InsufficientAllowance',
    type: 'error'
  },
  {
    inputs: [
      {
        internalType: 'address',
        name: 'sender',
        type: 'address'
      },
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
    name: 'ERC20InsufficientBalance',
    type: 'error'
  },
  {
    inputs: [
      {
        internalType: 'address',
        name: 'approver',
        type: 'address'
      }
    ],
    name: 'ERC20InvalidApprover',
    type: 'error'
  },
  {
    inputs: [
      {
        internalType: 'address',
        name: 'receiver',
        type: 'address'
      }
    ],
    name: 'ERC20InvalidReceiver',
    type: 'error'
  },
  {
    inputs: [
      {
        internalType: 'address',
        name: 'sender',
        type: 'address'
      }
    ],
    name: 'ERC20InvalidSender',
    type: 'error'
  },
  {
    inputs: [
      {
        internalType: 'address',
        name: 'spender',
        type: 'address'
      }
    ],
    name: 'ERC20InvalidSpender',
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
    name: 'InvestorV1__BankContractNotFound',
    type: 'error'
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
        name: 'required',
        type: 'uint256'
      },
      {
        internalType: 'uint256',
        name: 'available',
        type: 'uint256'
      }
    ],
    name: 'InvestorV1__InsufficientFundedTokenBalance',
    type: 'error'
  },
  {
    inputs: [
      {
        internalType: 'uint256',
        name: 'expected',
        type: 'uint256'
      },
      {
        internalType: 'uint256',
        name: 'actual',
        type: 'uint256'
      }
    ],
    name: 'InvestorV1__InvalidNativeFunding',
    type: 'error'
  },
  {
    inputs: [
      {
        internalType: 'address',
        name: 'to',
        type: 'address'
      }
    ],
    name: 'InvestorV1__NativeTransferFailed',
    type: 'error'
  },
  {
    inputs: [],
    name: 'InvestorV1__NoShareholders',
    type: 'error'
  },
  {
    inputs: [],
    name: 'InvestorV1__NoTokensMinted',
    type: 'error'
  },
  {
    inputs: [
      {
        internalType: 'address',
        name: 'caller',
        type: 'address'
      }
    ],
    name: 'InvestorV1__NotBank',
    type: 'error'
  },
  {
    inputs: [],
    name: 'InvestorV1__OfficerAddressNotSet',
    type: 'error'
  },
  {
    inputs: [],
    name: 'InvestorV1__ZeroAddress',
    type: 'error'
  },
  {
    inputs: [],
    name: 'InvestorV1__ZeroAmount',
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
        indexed: true,
        internalType: 'address',
        name: 'owner',
        type: 'address'
      },
      {
        indexed: true,
        internalType: 'address',
        name: 'spender',
        type: 'address'
      },
      {
        indexed: false,
        internalType: 'uint256',
        name: 'value',
        type: 'uint256'
      }
    ],
    name: 'Approval',
    type: 'event'
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: 'address',
        name: 'distributor',
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
        name: 'totalAmount',
        type: 'uint256'
      },
      {
        indexed: false,
        internalType: 'uint256',
        name: 'shareholderCount',
        type: 'uint256'
      }
    ],
    name: 'DividendDistributed',
    type: 'event'
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: 'address',
        name: 'shareholder',
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
    name: 'DividendPaid',
    type: 'event'
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: 'address',
        name: 'shareholder',
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
      },
      {
        indexed: false,
        internalType: 'string',
        name: 'reason',
        type: 'string'
      }
    ],
    name: 'DividendPaymentFailed',
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
        name: 'shareholder',
        type: 'address'
      },
      {
        indexed: false,
        internalType: 'uint256',
        name: 'amount',
        type: 'uint256'
      }
    ],
    name: 'Minted',
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
        internalType: 'bytes32',
        name: 'role',
        type: 'bytes32'
      },
      {
        indexed: true,
        internalType: 'bytes32',
        name: 'previousAdminRole',
        type: 'bytes32'
      },
      {
        indexed: true,
        internalType: 'bytes32',
        name: 'newAdminRole',
        type: 'bytes32'
      }
    ],
    name: 'RoleAdminChanged',
    type: 'event'
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: 'bytes32',
        name: 'role',
        type: 'bytes32'
      },
      {
        indexed: true,
        internalType: 'address',
        name: 'account',
        type: 'address'
      },
      {
        indexed: true,
        internalType: 'address',
        name: 'sender',
        type: 'address'
      }
    ],
    name: 'RoleGranted',
    type: 'event'
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: 'bytes32',
        name: 'role',
        type: 'bytes32'
      },
      {
        indexed: true,
        internalType: 'address',
        name: 'account',
        type: 'address'
      },
      {
        indexed: true,
        internalType: 'address',
        name: 'sender',
        type: 'address'
      }
    ],
    name: 'RoleRevoked',
    type: 'event'
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: 'address',
        name: 'from',
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
        name: 'value',
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
    inputs: [],
    name: 'DEFAULT_ADMIN_ROLE',
    outputs: [
      {
        internalType: 'bytes32',
        name: '',
        type: 'bytes32'
      }
    ],
    stateMutability: 'view',
    type: 'function'
  },
  {
    inputs: [],
    name: 'MINTER_ROLE',
    outputs: [
      {
        internalType: 'bytes32',
        name: '',
        type: 'bytes32'
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
        name: 'spender',
        type: 'address'
      }
    ],
    name: 'allowance',
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
        name: 'spender',
        type: 'address'
      },
      {
        internalType: 'uint256',
        name: 'value',
        type: 'uint256'
      }
    ],
    name: 'approve',
    outputs: [
      {
        internalType: 'bool',
        name: '',
        type: 'bool'
      }
    ],
    stateMutability: 'nonpayable',
    type: 'function'
  },
  {
    inputs: [
      {
        internalType: 'address',
        name: 'account',
        type: 'address'
      }
    ],
    name: 'balanceOf',
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
    inputs: [],
    name: 'decimals',
    outputs: [
      {
        internalType: 'uint8',
        name: '',
        type: 'uint8'
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
            internalType: 'address',
            name: 'shareholder',
            type: 'address'
          },
          {
            internalType: 'uint256',
            name: 'amount',
            type: 'uint256'
          }
        ],
        internalType: 'struct InvestorV1.Shareholder[]',
        name: 'shareholders',
        type: 'tuple[]'
      }
    ],
    name: 'distributeMint',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function'
  },
  {
    inputs: [
      {
        internalType: 'uint256',
        name: 'amount',
        type: 'uint256'
      }
    ],
    name: 'distributeNativeDividends',
    outputs: [],
    stateMutability: 'payable',
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
    name: 'distributeTokenDividends',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function'
  },
  {
    inputs: [],
    name: 'getOfficerAddress',
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
        internalType: 'bytes32',
        name: 'role',
        type: 'bytes32'
      }
    ],
    name: 'getRoleAdmin',
    outputs: [
      {
        internalType: 'bytes32',
        name: '',
        type: 'bytes32'
      }
    ],
    stateMutability: 'view',
    type: 'function'
  },
  {
    inputs: [],
    name: 'getShareholderSet',
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
    inputs: [],
    name: 'getShareholders',
    outputs: [
      {
        components: [
          {
            internalType: 'address',
            name: 'shareholder',
            type: 'address'
          },
          {
            internalType: 'uint256',
            name: 'amount',
            type: 'uint256'
          }
        ],
        internalType: 'struct InvestorV1.Shareholder[]',
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
        internalType: 'bytes32',
        name: 'role',
        type: 'bytes32'
      },
      {
        internalType: 'address',
        name: 'account',
        type: 'address'
      }
    ],
    name: 'grantRole',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function'
  },
  {
    inputs: [
      {
        internalType: 'bytes32',
        name: 'role',
        type: 'bytes32'
      },
      {
        internalType: 'address',
        name: 'account',
        type: 'address'
      }
    ],
    name: 'hasRole',
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
        name: 'shareholder',
        type: 'address'
      },
      {
        internalType: 'uint256',
        name: 'amount',
        type: 'uint256'
      }
    ],
    name: 'individualMint',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function'
  },
  {
    inputs: [
      {
        internalType: 'string',
        name: 'tokenName',
        type: 'string'
      },
      {
        internalType: 'string',
        name: 'tokenSymbol',
        type: 'string'
      },
      {
        internalType: 'address',
        name: 'initialOwner',
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
    name: 'name',
    outputs: [
      {
        internalType: 'string',
        name: '',
        type: 'string'
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
        internalType: 'bytes32',
        name: 'role',
        type: 'bytes32'
      },
      {
        internalType: 'address',
        name: 'callerConfirmation',
        type: 'address'
      }
    ],
    name: 'renounceRole',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function'
  },
  {
    inputs: [
      {
        internalType: 'bytes32',
        name: 'role',
        type: 'bytes32'
      },
      {
        internalType: 'address',
        name: 'account',
        type: 'address'
      }
    ],
    name: 'revokeRole',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function'
  },
  {
    inputs: [
      {
        internalType: 'bytes4',
        name: 'interfaceId',
        type: 'bytes4'
      }
    ],
    name: 'supportsInterface',
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
    name: 'symbol',
    outputs: [
      {
        internalType: 'string',
        name: '',
        type: 'string'
      }
    ],
    stateMutability: 'view',
    type: 'function'
  },
  {
    inputs: [],
    name: 'totalSupply',
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
        name: 'to',
        type: 'address'
      },
      {
        internalType: 'uint256',
        name: 'value',
        type: 'uint256'
      }
    ],
    name: 'transfer',
    outputs: [
      {
        internalType: 'bool',
        name: '',
        type: 'bool'
      }
    ],
    stateMutability: 'nonpayable',
    type: 'function'
  },
  {
    inputs: [
      {
        internalType: 'address',
        name: 'from',
        type: 'address'
      },
      {
        internalType: 'address',
        name: 'to',
        type: 'address'
      },
      {
        internalType: 'uint256',
        name: 'value',
        type: 'uint256'
      }
    ],
    name: 'transferFrom',
    outputs: [
      {
        internalType: 'bool',
        name: '',
        type: 'bool'
      }
    ],
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
    inputs: [],
    name: 'version',
    outputs: [
      {
        internalType: 'string',
        name: '',
        type: 'string'
      }
    ],
    stateMutability: 'pure',
    type: 'function'
  },
  {
    stateMutability: 'payable',
    type: 'receive'
  }
] as const

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// Officer
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

export const officerAbi = [
  {
    inputs: [
      {
        internalType: 'address',
        name: 'feeCollector',
        type: 'address'
      }
    ],
    stateMutability: 'nonpayable',
    type: 'constructor'
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
    name: 'NotInitializing',
    type: 'error'
  },
  {
    inputs: [
      {
        internalType: 'string',
        name: 'contractType',
        type: 'string'
      }
    ],
    name: 'Officer__BeaconNotConfigured',
    type: 'error'
  },
  {
    inputs: [],
    name: 'Officer__BodMustBeDeployedViaElections',
    type: 'error'
  },
  {
    inputs: [
      {
        internalType: 'string',
        name: 'beaconType',
        type: 'string'
      }
    ],
    name: 'Officer__DuplicateBeaconType',
    type: 'error'
  },
  {
    inputs: [],
    name: 'Officer__EmptyBeaconType',
    type: 'error'
  },
  {
    inputs: [],
    name: 'Officer__EmptyContractType',
    type: 'error'
  },
  {
    inputs: [
      {
        internalType: 'string',
        name: 'contractType',
        type: 'string'
      }
    ],
    name: 'Officer__MissingInitializerData',
    type: 'error'
  },
  {
    inputs: [],
    name: 'Officer__NotOwnerOrInitializing',
    type: 'error'
  },
  {
    inputs: [],
    name: 'Officer__Unauthorized',
    type: 'error'
  },
  {
    inputs: [],
    name: 'Officer__ZeroAddress',
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
    anonymous: false,
    inputs: [
      {
        indexed: false,
        internalType: 'string',
        name: 'contractType',
        type: 'string'
      },
      {
        indexed: false,
        internalType: 'address',
        name: 'beaconAddress',
        type: 'address'
      }
    ],
    name: 'BeaconConfigured',
    type: 'event'
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: false,
        internalType: 'address[]',
        name: 'beaconProxies',
        type: 'address[]'
      }
    ],
    name: 'BeaconProxiesDeployed',
    type: 'event'
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: false,
        internalType: 'string',
        name: 'contractType',
        type: 'string'
      },
      {
        indexed: false,
        internalType: 'address',
        name: 'deployedAddress',
        type: 'address'
      }
    ],
    name: 'ContractDeployed',
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
        internalType: 'string',
        name: 'contractType',
        type: 'string'
      },
      {
        internalType: 'address',
        name: 'beaconAddress',
        type: 'address'
      }
    ],
    name: 'configureBeacon',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function'
  },
  {
    inputs: [
      {
        components: [
          {
            internalType: 'string',
            name: 'contractType',
            type: 'string'
          },
          {
            internalType: 'bytes',
            name: 'initializerData',
            type: 'bytes'
          }
        ],
        internalType: 'struct DeploymentData[]',
        name: 'deployments',
        type: 'tuple[]'
      }
    ],
    name: 'deployAllContracts',
    outputs: [
      {
        internalType: 'address[]',
        name: '',
        type: 'address[]'
      }
    ],
    stateMutability: 'nonpayable',
    type: 'function'
  },
  {
    inputs: [
      {
        internalType: 'string',
        name: 'contractType',
        type: 'string'
      },
      {
        internalType: 'bytes',
        name: 'initializerData',
        type: 'bytes'
      }
    ],
    name: 'deployBeaconProxy',
    outputs: [
      {
        internalType: 'address',
        name: '',
        type: 'address'
      }
    ],
    stateMutability: 'nonpayable',
    type: 'function'
  },
  {
    inputs: [
      {
        internalType: 'string',
        name: 'contractType',
        type: 'string'
      }
    ],
    name: 'findDeployedContract',
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
    name: 'getBodContract',
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
    name: 'getConfiguredContractTypes',
    outputs: [
      {
        internalType: 'string[]',
        name: '',
        type: 'string[]'
      }
    ],
    stateMutability: 'view',
    type: 'function'
  },
  {
    inputs: [
      {
        internalType: 'string',
        name: 'contractType',
        type: 'string'
      }
    ],
    name: 'getContractBeacon',
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
    name: 'getContractTypes',
    outputs: [
      {
        internalType: 'string[]',
        name: '',
        type: 'string[]'
      }
    ],
    stateMutability: 'view',
    type: 'function'
  },
  {
    inputs: [],
    name: 'getDeployedContracts',
    outputs: [
      {
        components: [
          {
            internalType: 'string',
            name: 'contractType',
            type: 'string'
          },
          {
            internalType: 'address',
            name: 'contractAddress',
            type: 'address'
          }
        ],
        internalType: 'struct Officer.DeployedContract[]',
        name: '',
        type: 'tuple[]'
      }
    ],
    stateMutability: 'view',
    type: 'function'
  },
  {
    inputs: [],
    name: 'getFeeCollector',
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
        internalType: 'string',
        name: 'contractType',
        type: 'string'
      }
    ],
    name: 'getFeeFor',
    outputs: [
      {
        internalType: 'uint16',
        name: '',
        type: 'uint16'
      }
    ],
    stateMutability: 'view',
    type: 'function'
  },
  {
    inputs: [],
    name: 'getTeam',
    outputs: [
      {
        components: [
          {
            internalType: 'string',
            name: 'contractType',
            type: 'string'
          },
          {
            internalType: 'address',
            name: 'contractAddress',
            type: 'address'
          }
        ],
        internalType: 'struct Officer.DeployedContract[]',
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
        name: 'ownerAddress',
        type: 'address'
      },
      {
        components: [
          {
            internalType: 'string',
            name: 'beaconType',
            type: 'string'
          },
          {
            internalType: 'address',
            name: 'beaconAddress',
            type: 'address'
          }
        ],
        internalType: 'struct Officer.BeaconConfig[]',
        name: 'beaconConfigs',
        type: 'tuple[]'
      },
      {
        components: [
          {
            internalType: 'string',
            name: 'contractType',
            type: 'string'
          },
          {
            internalType: 'bytes',
            name: 'initializerData',
            type: 'bytes'
          }
        ],
        internalType: 'struct DeploymentData[]',
        name: 'deployments',
        type: 'tuple[]'
      },
      {
        internalType: 'bool',
        name: 'isDeployAllContracts',
        type: 'bool'
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
        internalType: 'address',
        name: 'tokenAddress',
        type: 'address'
      }
    ],
    name: 'isFeeCollectorToken',
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
    inputs: [],
    name: 'version',
    outputs: [
      {
        internalType: 'string',
        name: '',
        type: 'string'
      }
    ],
    stateMutability: 'pure',
    type: 'function'
  }
] as const

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// Proposals
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

export const proposalsAbi = [
  {
    inputs: [],
    stateMutability: 'nonpayable',
    type: 'constructor'
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
    name: 'ProposalUtils__InvalidProposalContent',
    type: 'error'
  },
  {
    inputs: [],
    name: 'ProposalUtils__InvalidProposalDates',
    type: 'error'
  },
  {
    inputs: [],
    name: 'Proposals__BoardOfDirectorAddressNotSet',
    type: 'error'
  },
  {
    inputs: [],
    name: 'Proposals__BoardOfDirectorsNotFound',
    type: 'error'
  },
  {
    inputs: [],
    name: 'Proposals__InvalidVote',
    type: 'error'
  },
  {
    inputs: [],
    name: 'Proposals__NoBoardMembers',
    type: 'error'
  },
  {
    inputs: [],
    name: 'Proposals__NotAllowed',
    type: 'error'
  },
  {
    inputs: [],
    name: 'Proposals__OfficerAddressNotSet',
    type: 'error'
  },
  {
    inputs: [],
    name: 'Proposals__OnlyBoardMember',
    type: 'error'
  },
  {
    inputs: [],
    name: 'Proposals__ProposalAlreadyVoted',
    type: 'error'
  },
  {
    inputs: [],
    name: 'Proposals__ProposalNotFound',
    type: 'error'
  },
  {
    inputs: [],
    name: 'Proposals__ProposalVotingEnded',
    type: 'error'
  },
  {
    inputs: [],
    name: 'Proposals__ProposalVotingNotStarted',
    type: 'error'
  },
  {
    inputs: [],
    name: 'Proposals__ZeroSender',
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
    inputs: [],
    name: 'getNextProposalId',
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
    inputs: [],
    name: 'getOfficerAddress',
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
        name: 'ownerAddress',
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
  },
  {
    inputs: [],
    name: 'version',
    outputs: [
      {
        internalType: 'string',
        name: '',
        type: 'string'
      }
    ],
    stateMutability: 'pure',
    type: 'function'
  }
] as const

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// SafeDepositRouter
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

export const safeDepositRouterAbi = [
  {
    inputs: [],
    stateMutability: 'nonpayable',
    type: 'constructor'
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
    inputs: [],
    name: 'SafeDepositRouter__DepositsNotEnabled',
    type: 'error'
  },
  {
    inputs: [],
    name: 'SafeDepositRouter__InsufficientMinterRole',
    type: 'error'
  },
  {
    inputs: [],
    name: 'SafeDepositRouter__InvalidInvestorAddress',
    type: 'error'
  },
  {
    inputs: [],
    name: 'SafeDepositRouter__InvalidOwner',
    type: 'error'
  },
  {
    inputs: [],
    name: 'SafeDepositRouter__InvalidSafeAddress',
    type: 'error'
  },
  {
    inputs: [],
    name: 'SafeDepositRouter__InvalidTokenAddress',
    type: 'error'
  },
  {
    inputs: [],
    name: 'SafeDepositRouter__InvalidTokenDecimals',
    type: 'error'
  },
  {
    inputs: [],
    name: 'SafeDepositRouter__InvestorContractNotFound',
    type: 'error'
  },
  {
    inputs: [],
    name: 'SafeDepositRouter__MultiplierTooLow',
    type: 'error'
  },
  {
    inputs: [],
    name: 'SafeDepositRouter__OfficerAddressNotSet',
    type: 'error'
  },
  {
    inputs: [
      {
        internalType: 'uint256',
        name: 'expected',
        type: 'uint256'
      },
      {
        internalType: 'uint256',
        name: 'actual',
        type: 'uint256'
      }
    ],
    name: 'SafeDepositRouter__SlippageExceeded',
    type: 'error'
  },
  {
    inputs: [],
    name: 'SafeDepositRouter__TokenAlreadySupported',
    type: 'error'
  },
  {
    inputs: [],
    name: 'SafeDepositRouter__TokenNotSupported',
    type: 'error'
  },
  {
    inputs: [],
    name: 'SafeDepositRouter__ZeroAmount',
    type: 'error'
  },
  {
    inputs: [],
    name: 'SafeDepositRouter__ZeroSender',
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
    inputs: [
      {
        internalType: 'address',
        name: 'token',
        type: 'address'
      }
    ],
    name: 'TokenSupport__AlreadyAdded',
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
    name: 'TokenSupport__NotFound',
    type: 'error'
  },
  {
    inputs: [],
    name: 'TokenSupport__ZeroAddress',
    type: 'error'
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
        name: 'tokenAmount',
        type: 'uint256'
      },
      {
        indexed: false,
        internalType: 'uint256',
        name: 'sherAmount',
        type: 'uint256'
      },
      {
        indexed: false,
        internalType: 'uint256',
        name: 'timestamp',
        type: 'uint256'
      }
    ],
    name: 'Deposited',
    type: 'event'
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: 'address',
        name: 'disabledBy',
        type: 'address'
      }
    ],
    name: 'DepositsDisabled',
    type: 'event'
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: 'address',
        name: 'enabledBy',
        type: 'address'
      }
    ],
    name: 'DepositsEnabled',
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
        indexed: false,
        internalType: 'uint256',
        name: 'oldMultiplier',
        type: 'uint256'
      },
      {
        indexed: false,
        internalType: 'uint256',
        name: 'newMultiplier',
        type: 'uint256'
      }
    ],
    name: 'MultiplierUpdated',
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
        name: 'oldSafe',
        type: 'address'
      },
      {
        indexed: true,
        internalType: 'address',
        name: 'newSafe',
        type: 'address'
      }
    ],
    name: 'SafeAddressUpdated',
    type: 'event'
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: 'address',
        name: 'tokenAddress',
        type: 'address'
      },
      {
        indexed: false,
        internalType: 'uint8',
        name: 'decimals',
        type: 'uint8'
      }
    ],
    name: 'TokenSupportAdded',
    type: 'event'
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: 'address',
        name: 'tokenAddress',
        type: 'address'
      }
    ],
    name: 'TokenSupportAdded',
    type: 'event'
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: 'address',
        name: 'tokenAddress',
        type: 'address'
      }
    ],
    name: 'TokenSupportRemoved',
    type: 'event'
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: 'address',
        name: 'token',
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
    name: 'TokensRecovered',
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
    inputs: [],
    name: 'MIN_MULTIPLIER',
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
        name: 'tokenAddress',
        type: 'address'
      }
    ],
    name: 'addTokenSupport',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function'
  },
  {
    inputs: [
      {
        internalType: 'address',
        name: 'tokenAddress',
        type: 'address'
      },
      {
        internalType: 'uint256',
        name: 'tokenAmount',
        type: 'uint256'
      }
    ],
    name: 'calculateCompensation',
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
        name: 'tokenAddress',
        type: 'address'
      },
      {
        internalType: 'uint256',
        name: 'amount',
        type: 'uint256'
      }
    ],
    name: 'deposit',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function'
  },
  {
    inputs: [
      {
        internalType: 'address',
        name: 'tokenAddress',
        type: 'address'
      },
      {
        internalType: 'uint256',
        name: 'amount',
        type: 'uint256'
      },
      {
        internalType: 'uint256',
        name: 'minSherOut',
        type: 'uint256'
      }
    ],
    name: 'depositWithSlippage',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function'
  },
  {
    inputs: [],
    name: 'disableDeposits',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function'
  },
  {
    inputs: [],
    name: 'enableDeposits',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function'
  },
  {
    inputs: [],
    name: 'getDepositsEnabled',
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
    name: 'getMultiplier',
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
    inputs: [],
    name: 'getOfficerAddress',
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
    name: 'getSafeAddress',
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
    name: 'getSupportedTokenCount',
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
    inputs: [],
    name: 'getSupportedTokens',
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
        internalType: 'address',
        name: 'token',
        type: 'address'
      }
    ],
    name: 'getTokenDecimals',
    outputs: [
      {
        internalType: 'uint8',
        name: '',
        type: 'uint8'
      }
    ],
    stateMutability: 'view',
    type: 'function'
  },
  {
    inputs: [
      {
        internalType: 'address',
        name: 'safeAddress',
        type: 'address'
      },
      {
        internalType: 'address[]',
        name: 'tokenAddresses',
        type: 'address[]'
      },
      {
        internalType: 'uint256',
        name: 'multiplier',
        type: 'uint256'
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
        internalType: 'address',
        name: 'token',
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
    name: 'recoverERC20',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function'
  },
  {
    inputs: [
      {
        internalType: 'address',
        name: 'tokenAddress',
        type: 'address'
      }
    ],
    name: 'removeTokenSupport',
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
        internalType: 'uint256',
        name: 'newMultiplier',
        type: 'uint256'
      }
    ],
    name: 'setMultiplier',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function'
  },
  {
    inputs: [
      {
        internalType: 'address',
        name: 'newSafe',
        type: 'address'
      }
    ],
    name: 'setSafeAddress',
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
    inputs: [],
    name: 'version',
    outputs: [
      {
        internalType: 'string',
        name: '',
        type: 'string'
      }
    ],
    stateMutability: 'pure',
    type: 'function'
  }
] as const

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// Vesting
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

export const vestingAbi = [
  {
    inputs: [],
    stateMutability: 'nonpayable',
    type: 'constructor'
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
    inputs: [],
    name: 'Vesting__CliffExceedsDuration',
    type: 'error'
  },
  {
    inputs: [],
    name: 'Vesting__IndexOutOfBounds',
    type: 'error'
  },
  {
    inputs: [],
    name: 'Vesting__InsufficientMinterRole',
    type: 'error'
  },
  {
    inputs: [],
    name: 'Vesting__InvestorContractNotFound',
    type: 'error'
  },
  {
    inputs: [],
    name: 'Vesting__NothingToRelease',
    type: 'error'
  },
  {
    inputs: [],
    name: 'Vesting__OfficerAddressNotSet',
    type: 'error'
  },
  {
    inputs: [],
    name: 'Vesting__VestingNotActive',
    type: 'error'
  },
  {
    inputs: [],
    name: 'Vesting__ZeroAddress',
    type: 'error'
  },
  {
    inputs: [],
    name: 'Vesting__ZeroSender',
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
        indexed: false,
        internalType: 'uint256',
        name: 'index',
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
        indexed: false,
        internalType: 'uint256',
        name: 'index',
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
        indexed: false,
        internalType: 'uint256',
        name: 'index',
        type: 'uint256'
      }
    ],
    name: 'VestingStopped',
    type: 'event'
  },
  {
    inputs: [
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
      }
    ],
    name: 'addVesting',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function'
  },
  {
    inputs: [],
    name: 'getAllArchivedVestingsFlat',
    outputs: [
      {
        internalType: 'address[]',
        name: 'archivedMembers',
        type: 'address[]'
      },
      {
        internalType: 'uint256[]',
        name: 'indices',
        type: 'uint256[]'
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
        internalType: 'address',
        name: 'account',
        type: 'address'
      }
    ],
    name: 'getIsMember',
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
    name: 'getMembers',
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
    inputs: [],
    name: 'getOfficerAddress',
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
        name: 'member',
        type: 'address'
      }
    ],
    name: 'getVestingCount',
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
      }
    ],
    name: 'getVestings',
    outputs: [
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
    inputs: [],
    name: 'getVestingsWithMembers',
    outputs: [
      {
        internalType: 'address[]',
        name: 'activeMembers',
        type: 'address[]'
      },
      {
        internalType: 'uint256[]',
        name: 'indices',
        type: 'uint256[]'
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
        name: 'infos',
        type: 'tuple[]'
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
        name: 'index',
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
        name: 'index',
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
        name: 'index',
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
    inputs: [],
    name: 'version',
    outputs: [
      {
        internalType: 'string',
        name: '',
        type: 'string'
      }
    ],
    stateMutability: 'pure',
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
        name: 'index',
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
  }
] as const

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// Voting
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

export const votingAbi = [
  {
    inputs: [],
    stateMutability: 'nonpayable',
    type: 'constructor'
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
    inputs: [],
    name: 'Voting__BoardOfDirectorsNotFound',
    type: 'error'
  },
  {
    inputs: [],
    name: 'Voting__CandidateNotFound',
    type: 'error'
  },
  {
    inputs: [],
    name: 'Voting__EmptyTitle',
    type: 'error'
  },
  {
    inputs: [],
    name: 'Voting__InvalidTieWinner',
    type: 'error'
  },
  {
    inputs: [
      {
        internalType: 'uint256',
        name: 'vote',
        type: 'uint256'
      }
    ],
    name: 'Voting__InvalidVote',
    type: 'error'
  },
  {
    inputs: [],
    name: 'Voting__NoCandidates',
    type: 'error'
  },
  {
    inputs: [],
    name: 'Voting__NoTieToResolve',
    type: 'error'
  },
  {
    inputs: [],
    name: 'Voting__OfficerAddressNotSet',
    type: 'error'
  },
  {
    inputs: [],
    name: 'Voting__OnlyFounder',
    type: 'error'
  },
  {
    inputs: [],
    name: 'Voting__ProposalNotActive',
    type: 'error'
  },
  {
    inputs: [
      {
        internalType: 'uint256',
        name: 'proposalId',
        type: 'uint256'
      }
    ],
    name: 'Voting__ProposalNotFound',
    type: 'error'
  },
  {
    inputs: [],
    name: 'Voting__VoterAlreadyVoted',
    type: 'error'
  },
  {
    inputs: [],
    name: 'Voting__VoterNotEligible',
    type: 'error'
  },
  {
    inputs: [
      {
        internalType: 'address',
        name: 'voter',
        type: 'address'
      }
    ],
    name: 'Voting__VoterNotRegistered',
    type: 'error'
  },
  {
    inputs: [],
    name: 'Voting__WrongTieBreakOption',
    type: 'error'
  },
  {
    inputs: [],
    name: 'Voting__ZeroSender',
    type: 'error'
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: false,
        internalType: 'address[]',
        name: 'boardOfDirectors',
        type: 'address[]'
      }
    ],
    name: 'BoardOfDirectorsSet',
    type: 'event'
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: 'address',
        name: 'voter',
        type: 'address'
      },
      {
        indexed: true,
        internalType: 'uint256',
        name: 'proposalId',
        type: 'uint256'
      },
      {
        indexed: false,
        internalType: 'uint256',
        name: 'vote',
        type: 'uint256'
      }
    ],
    name: 'DirectiveVoted',
    type: 'event'
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: 'address',
        name: 'voter',
        type: 'address'
      },
      {
        indexed: true,
        internalType: 'uint256',
        name: 'proposalId',
        type: 'uint256'
      },
      {
        indexed: true,
        internalType: 'address',
        name: 'candidateAddress',
        type: 'address'
      }
    ],
    name: 'ElectionVoted',
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
        indexed: false,
        internalType: 'string',
        name: 'description',
        type: 'string'
      }
    ],
    name: 'ProposalAdded',
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
        internalType: 'bool',
        name: 'isActive',
        type: 'bool'
      }
    ],
    name: 'ProposalConcluded',
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
        internalType: 'address[]',
        name: 'candidates',
        type: 'address[]'
      }
    ],
    name: 'RunoffElectionStarted',
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
        internalType: 'enum Types.TieBreakOption',
        name: 'option',
        type: 'uint8'
      }
    ],
    name: 'TieBreakOptionSelected',
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
        internalType: 'address[]',
        name: 'tiedCandidates',
        type: 'address[]'
      }
    ],
    name: 'TieDetected',
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
        internalType: 'bool',
        name: 'isElection',
        type: 'bool'
      },
      {
        internalType: 'uint256',
        name: 'winnerCount',
        type: 'uint256'
      },
      {
        internalType: 'address[]',
        name: 'voters',
        type: 'address[]'
      },
      {
        internalType: 'address[]',
        name: 'candidates',
        type: 'address[]'
      }
    ],
    name: 'addProposal',
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
    name: 'concludeProposal',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function'
  },
  {
    inputs: [],
    name: 'getOfficerAddress',
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
        internalType: 'uint256',
        name: 'proposalId',
        type: 'uint256'
      }
    ],
    name: 'getProposalById',
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
            internalType: 'address',
            name: 'draftedBy',
            type: 'address'
          },
          {
            internalType: 'bool',
            name: 'isElection',
            type: 'bool'
          },
          {
            internalType: 'bool',
            name: 'isActive',
            type: 'bool'
          },
          {
            internalType: 'uint256',
            name: 'winnerCount',
            type: 'uint256'
          },
          {
            components: [
              {
                internalType: 'uint256',
                name: 'yes',
                type: 'uint256'
              },
              {
                internalType: 'uint256',
                name: 'no',
                type: 'uint256'
              },
              {
                internalType: 'uint256',
                name: 'abstain',
                type: 'uint256'
              }
            ],
            internalType: 'struct Types.DirectiveVotes',
            name: 'votes',
            type: 'tuple'
          },
          {
            components: [
              {
                internalType: 'address',
                name: 'candidateAddress',
                type: 'address'
              },
              {
                internalType: 'uint256',
                name: 'votes',
                type: 'uint256'
              }
            ],
            internalType: 'struct Types.Candidate[]',
            name: 'candidates',
            type: 'tuple[]'
          },
          {
            components: [
              {
                internalType: 'bool',
                name: 'isEligible',
                type: 'bool'
              },
              {
                internalType: 'bool',
                name: 'isVoted',
                type: 'bool'
              },
              {
                internalType: 'address',
                name: 'memberAddress',
                type: 'address'
              }
            ],
            internalType: 'struct Types.Member[]',
            name: 'voters',
            type: 'tuple[]'
          },
          {
            internalType: 'bool',
            name: 'hasTie',
            type: 'bool'
          },
          {
            internalType: 'address[]',
            name: 'tiedCandidates',
            type: 'address[]'
          },
          {
            internalType: 'enum Types.TieBreakOption',
            name: 'selectedTieBreakOption',
            type: 'uint8'
          }
        ],
        internalType: 'struct Types.Proposal',
        name: '',
        type: 'tuple'
      }
    ],
    stateMutability: 'view',
    type: 'function'
  },
  {
    inputs: [],
    name: 'getProposalCount',
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
        name: 'proposalId',
        type: 'uint256'
      }
    ],
    name: 'getProposalsById',
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
            internalType: 'address',
            name: 'draftedBy',
            type: 'address'
          },
          {
            internalType: 'bool',
            name: 'isElection',
            type: 'bool'
          },
          {
            internalType: 'bool',
            name: 'isActive',
            type: 'bool'
          },
          {
            internalType: 'uint256',
            name: 'winnerCount',
            type: 'uint256'
          },
          {
            components: [
              {
                internalType: 'uint256',
                name: 'yes',
                type: 'uint256'
              },
              {
                internalType: 'uint256',
                name: 'no',
                type: 'uint256'
              },
              {
                internalType: 'uint256',
                name: 'abstain',
                type: 'uint256'
              }
            ],
            internalType: 'struct Types.DirectiveVotes',
            name: 'votes',
            type: 'tuple'
          },
          {
            components: [
              {
                internalType: 'address',
                name: 'candidateAddress',
                type: 'address'
              },
              {
                internalType: 'uint256',
                name: 'votes',
                type: 'uint256'
              }
            ],
            internalType: 'struct Types.Candidate[]',
            name: 'candidates',
            type: 'tuple[]'
          },
          {
            components: [
              {
                internalType: 'bool',
                name: 'isEligible',
                type: 'bool'
              },
              {
                internalType: 'bool',
                name: 'isVoted',
                type: 'bool'
              },
              {
                internalType: 'address',
                name: 'memberAddress',
                type: 'address'
              }
            ],
            internalType: 'struct Types.Member[]',
            name: 'voters',
            type: 'tuple[]'
          },
          {
            internalType: 'bool',
            name: 'hasTie',
            type: 'bool'
          },
          {
            internalType: 'address[]',
            name: 'tiedCandidates',
            type: 'address[]'
          },
          {
            internalType: 'enum Types.TieBreakOption',
            name: 'selectedTieBreakOption',
            type: 'uint8'
          }
        ],
        internalType: 'struct Types.Proposal',
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
        internalType: 'address',
        name: 'sender',
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
        internalType: 'uint256',
        name: 'proposalId',
        type: 'uint256'
      },
      {
        internalType: 'enum Types.TieBreakOption',
        name: 'option',
        type: 'uint8'
      }
    ],
    name: 'resolveTie',
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
      },
      {
        internalType: 'address',
        name: 'winner',
        type: 'address'
      }
    ],
    name: 'selectWinner',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function'
  },
  {
    inputs: [
      {
        internalType: 'address[]',
        name: 'boardMembers',
        type: 'address[]'
      }
    ],
    name: 'setBoardOfDirectors',
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
    inputs: [],
    name: 'version',
    outputs: [
      {
        internalType: 'string',
        name: '',
        type: 'string'
      }
    ],
    stateMutability: 'pure',
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
        internalType: 'uint256',
        name: 'vote',
        type: 'uint256'
      }
    ],
    name: 'voteDirective',
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
      },
      {
        internalType: 'address',
        name: 'candidateAddress',
        type: 'address'
      }
    ],
    name: 'voteElection',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function'
  }
] as const
