import gql from 'graphql-tag'

export const GET_CASH_REMUNERATION_EVENTS = gql`
  query GetCashRemunerationEvents($contractAddress: String!, $limit: Int!) {
    cashRemunerationDeposits(
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
    cashRemunerationWithdraws(
      where: { contractAddress: $contractAddress }
      orderBy: "timestamp"
      orderDirection: "desc"
      limit: $limit
    ) {
      items {
        id
        contractAddress
        withdrawer
        amount
        timestamp
      }
    }
    cashRemunerationWithdrawTokens(
      where: { contractAddress: $contractAddress }
      orderBy: "timestamp"
      orderDirection: "desc"
      limit: $limit
    ) {
      items {
        id
        contractAddress
        withdrawer
        tokenAddress
        amount
        timestamp
      }
    }
    cashRemunerationWageClaims(
      where: { contractAddress: $contractAddress }
      orderBy: "timestamp"
      orderDirection: "desc"
      limit: $limit
    ) {
      items {
        id
        contractAddress
        signatureHash
        enabled
        timestamp
      }
    }
    cashRemunerationOwnerTreasuryWithdrawNatives(
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
    cashRemunerationOwnerTreasuryWithdrawTokens(
      where: { contractAddress: $contractAddress }
      orderBy: "timestamp"
      orderDirection: "desc"
      limit: $limit
    ) {
      items {
        id
        contractAddress
        ownerAddress
        tokenAddress
        amount
        timestamp
      }
    }
    cashRemunerationOfficerUpdateds(
      where: { contractAddress: $contractAddress }
      orderBy: "timestamp"
      orderDirection: "desc"
      limit: $limit
    ) {
      items {
        id
        contractAddress
        newOfficerAddress
        timestamp
      }
    }
    cashRemunerationTokenSupportAddeds(
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
    cashRemunerationTokenSupportRemoveds(
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
  }
`
