import gql from 'graphql-tag'

export const GET_SAFE_DEPOSIT_ROUTER_EVENTS = gql`
  query GetSafeDepositRouterEvents($contractAddress: String!, $limit: Int!) {
    safeDeposits(
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
        tokenAmount
        sherAmount
        timestamp
      }
    }
    safeDepositsEnableds(
      where: { contractAddress: $contractAddress }
      orderBy: "timestamp"
      orderDirection: "desc"
      limit: $limit
    ) {
      items {
        id
        contractAddress
        enabledBy
        timestamp
      }
    }
    safeDepositsDisableds(
      where: { contractAddress: $contractAddress }
      orderBy: "timestamp"
      orderDirection: "desc"
      limit: $limit
    ) {
      items {
        id
        contractAddress
        disabledBy
        timestamp
      }
    }
    safeAddressUpdateds(
      where: { contractAddress: $contractAddress }
      orderBy: "timestamp"
      orderDirection: "desc"
      limit: $limit
    ) {
      items {
        id
        contractAddress
        oldSafe
        newSafe
        timestamp
      }
    }
    safeMultiplierUpdateds(
      where: { contractAddress: $contractAddress }
      orderBy: "timestamp"
      orderDirection: "desc"
      limit: $limit
    ) {
      items {
        id
        contractAddress
        oldMultiplier
        newMultiplier
        timestamp
      }
    }
  }
`
