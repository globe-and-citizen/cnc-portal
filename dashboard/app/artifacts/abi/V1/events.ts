// Generated from contract/versions/V1/abi. Do not edit.
export const contractEventsAbi = [
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
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: 'address',
        name: 'beacon',
        type: 'address'
      }
    ],
    name: 'BeaconUpgraded',
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
        name: '_description',
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
        name: '_description',
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
    anonymous: false,
    inputs: [],
    name: 'EIP712DomainChanged',
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
        name: 'from',
        type: 'address'
      },
      {
        indexed: false,
        internalType: 'address[]',
        name: 'teamMembers',
        type: 'address[]'
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
        name: 'amountPerAddress',
        type: 'uint256'
      }
    ],
    name: 'PushTip',
    type: 'event'
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: false,
        internalType: 'address',
        name: 'from',
        type: 'address'
      },
      {
        indexed: false,
        internalType: 'address[]',
        name: 'teamMembers',
        type: 'address[]'
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
        name: 'amountPerAddress',
        type: 'uint256'
      }
    ],
    name: 'SendTip',
    type: 'event'
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: false,
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
    name: 'TipWithdrawal',
    type: 'event'
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: false,
        internalType: 'address',
        name: 'previousAdmin',
        type: 'address'
      },
      {
        indexed: false,
        internalType: 'address',
        name: 'newAdmin',
        type: 'address'
      }
    ],
    name: 'AdminChanged',
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
  }
] as const
