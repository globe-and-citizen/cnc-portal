import gql from 'graphql-tag'

export const GET_BANK_EVENTS = gql`
  query GetBankEvents($contractAddress: String!, $limit: Int!) {
    bankDeposits(
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
    bankTokenDeposits(
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
    bankTransfers(
      where: { contractAddress: $contractAddress }
      orderBy: "timestamp"
      orderDirection: "desc"
      limit: $limit
    ) {
      items {
        id
        sender
        to
        amount
        timestamp
      }
    }
    bankTokenTransfers(
      where: { contractAddress: $contractAddress }
      orderBy: "timestamp"
      orderDirection: "desc"
      limit: $limit
    ) {
      items {
        id
        sender
        to
        token
        amount
        timestamp
      }
    }
    bankDividendDistributionTriggereds(
      where: { contractAddress: $contractAddress }
      orderBy: "timestamp"
      orderDirection: "desc"
      limit: $limit
    ) {
      items {
        id
        contractAddress
        investor
        token
        totalAmount
        timestamp
      }
    }
    bankFeePaids(
      where: { contractAddress: $contractAddress }
      orderBy: "timestamp"
      orderDirection: "desc"
      limit: $limit
    ) {
      items {
        id
        contractAddress
        feeCollector
        token
        amount
        timestamp
      }
    }
    rawContractTokenTransfers(
      where: { contractAddress: $contractAddress }
      orderBy: "timestamp"
      orderDirection: "desc"
      limit: $limit
    ) {
      items {
        id
        tokenAddress
        contractAddress
        direction
        from
        to
        amount
        timestamp
      }
    }
  }
`
