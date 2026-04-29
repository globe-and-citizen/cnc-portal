import gql from 'graphql-tag'

export const GET_EXPENSE_EVENTS = gql`
  query GetExpenseEvents($contractAddress: String!, $limit: Int!) {
    expenseDeposits(
      where: { contractAddress: $contractAddress }
      orderBy: "timestamp"
      orderDirection: "desc"
      limit: $limit
    ) {
      items {
        id
        contractAddress
        depositor
        amount
        timestamp
      }
    }
    expenseTokenDeposits(
      where: { contractAddress: $contractAddress }
      orderBy: "timestamp"
      orderDirection: "desc"
      limit: $limit
    ) {
      items {
        id
        contractAddress
        depositor
        token
        amount
        timestamp
      }
    }
    expenseTransfers(
      where: { contractAddress: $contractAddress }
      orderBy: "timestamp"
      orderDirection: "desc"
      limit: $limit
    ) {
      items {
        id
        contractAddress
        withdrawer
        to
        amount
        timestamp
      }
    }
    expenseTokenTransfers(
      where: { contractAddress: $contractAddress }
      orderBy: "timestamp"
      orderDirection: "desc"
      limit: $limit
    ) {
      items {
        id
        contractAddress
        withdrawer
        to
        token
        amount
        timestamp
      }
    }
    expenseApprovals(
      where: { contractAddress: $contractAddress }
      orderBy: "timestamp"
      orderDirection: "desc"
      limit: $limit
    ) {
      items {
        id
        contractAddress
        signatureHash
        activated
        timestamp
      }
    }
    expenseOwnerTreasuryWithdrawNatives(
      where: { contractAddress: $contractAddress }
      orderBy: "timestamp"
      orderDirection: "desc"
      limit: $limit
    ) {
      items {
        id
        contractAddress
        ownerAddress
        amount
        timestamp
      }
    }
    expenseOwnerTreasuryWithdrawTokens(
      where: { contractAddress: $contractAddress }
      orderBy: "timestamp"
      orderDirection: "desc"
      limit: $limit
    ) {
      items {
        id
        contractAddress
        ownerAddress
        token
        amount
        timestamp
      }
    }
    expenseTokenSupportAddeds(
      where: { contractAddress: $contractAddress }
      orderBy: "timestamp"
      orderDirection: "desc"
      limit: $limit
    ) {
      items {
        id
        contractAddress
        tokenAddress
        timestamp
      }
    }
    expenseTokenSupportRemoveds(
      where: { contractAddress: $contractAddress }
      orderBy: "timestamp"
      orderDirection: "desc"
      limit: $limit
    ) {
      items {
        id
        contractAddress
        tokenAddress
        timestamp
      }
    }
    expenseTokenAddressChangeds(
      where: { contractAddress: $contractAddress }
      orderBy: "timestamp"
      orderDirection: "desc"
      limit: $limit
    ) {
      items {
        id
        contractAddress
        addressWhoChanged
        tokenSymbol
        oldAddress
        newAddress
        timestamp
      }
    }
  }
`
