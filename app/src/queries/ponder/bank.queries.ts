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
    bankOwnershipTransferreds(
      where: { contractAddress: $contractAddress }
      orderBy: "timestamp"
      orderDirection: "desc"
      limit: $limit
    ) {
      items {
        id
        contractAddress
        previousOwner
        newOwner
        timestamp
      }
    }
  }
`

export const GET_INCOMING_BANK_TOKEN_TRANSFERS = gql`
  query GetIncomingBankTokenTransfers($toAddress: String!, $limit: Int!) {
    bankTokenTransfers(
      where: { to: $toAddress }
      orderBy: "timestamp"
      orderDirection: "desc"
      limit: $limit
    ) {
      items {
        id
        contractAddress
        sender
        to
        token
        amount
        timestamp
      }
    }
  }
`
