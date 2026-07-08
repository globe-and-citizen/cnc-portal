import gql from 'graphql-tag'

export const GET_INVESTOR_EVENTS = gql`
  query GetInvestorEvents($contractAddress: String!, $limit: Int!) {
    investorMints(
      where: { contractAddress: $contractAddress }
      orderBy: "timestamp"
      orderDirection: "desc"
      limit: $limit
    ) {
      items {
        id
        contractAddress
        shareholder
        amount
        timestamp
      }
    }
    investorDividendDistributeds(
      where: { contractAddress: $contractAddress }
      orderBy: "timestamp"
      orderDirection: "desc"
      limit: $limit
    ) {
      items {
        id
        contractAddress
        distributor
        token
        totalAmount
        shareholderCount
        timestamp
      }
    }
    investorDividendPaids(
      where: { contractAddress: $contractAddress }
      orderBy: "timestamp"
      orderDirection: "desc"
      limit: $limit
    ) {
      items {
        id
        contractAddress
        shareholder
        token
        amount
        timestamp
      }
    }
    investorDividendPaymentFaileds(
      where: { contractAddress: $contractAddress }
      orderBy: "timestamp"
      orderDirection: "desc"
      limit: $limit
    ) {
      items {
        id
        contractAddress
        shareholder
        token
        amount
        reason
        timestamp
      }
    }
  }
`
