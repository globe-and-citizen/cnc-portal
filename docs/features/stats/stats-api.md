# Statistics API Documentation

## Overview

The Statistics API provides comprehensive analytics and metrics for the CNC Portal platform. It offers insights into teams, users, claims, wages, expenses, contracts, board actions, and recent activity across the system.

**Base URL**: `/api/stats`

**Authentication**: All endpoints require JWT authentication via the `Authorization: Bearer <token>` header.

## Table of Contents

1. [Overview Statistics](#overview-statistics)
2. [Team Statistics](#team-statistics)
3. [User Statistics](#user-statistics)
4. [Claims Statistics](#claims-statistics)
5. [Wage Statistics](#wage-statistics)
6. [Expense Statistics](#expense-statistics)
7. [Contract Statistics](#contract-statistics)
8. [Board Actions Statistics](#board-actions-statistics)
9. [Recent Activity](#recent-activity)
10. [Common Parameters](#common-parameters)
11. [Error Responses](#error-responses)

---

## Overview Statistics

Get comprehensive platform-wide statistics including teams, members, claims, expenses, contracts, and growth metrics.

**Endpoint**: `GET /api/stats/overview`

### Query Parameters

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `period` | string | No | `30d` | Time period: `7d`, `30d`, `90d`, `all` |
| `teamId` | integer | No | - | Filter by specific team ID |

### Response

```json
{
  "totalTeams": 45,
  "activeTeams": 32,
  "totalMembers": 156,
  "totalClaims": 892,
  "totalHoursWorked": 3456.5,
  "totalWeeklyClaims": 245,
  "weeklyClaimsByStatus": {
    "pending": 34,
    "approved": 189,
    "rejected": 22
  },
  "totalExpenses": 178,
  "expensesByStatus": {
    "signed": 134,
    "pending": 32,
    "expired": 12
  },
  "totalNotifications": 543,
  "notificationReadRate": 78.45,
  "totalContracts": 67,
  "contractsByType": {
    "InvestorV1": 23,
    "CashRemunerationEIP712": 44
  },
  "totalActions": 89,
  "actionsExecutionRate": 82.35,
  "growthMetrics": {
    "teamsGrowth": 12.5,
    "membersGrowth": 15.8,
    "claimsGrowth": 23.4
  },
  "period": "30d"
}
```

### Response Fields

- **totalTeams**: Total number of teams in the system
- **activeTeams**: Teams with activity in the specified period
- **totalMembers**: Total number of users/members
- **totalClaims**: Total number of claims submitted
- **totalHoursWorked**: Sum of all hours worked across claims
- **totalWeeklyClaims**: Number of weekly claim records
- **weeklyClaimsByStatus**: Count of weekly claims grouped by status
- **totalExpenses**: Total number of expenses
- **expensesByStatus**: Count of expenses grouped by status
- **totalNotifications**: Total number of notifications
- **notificationReadRate**: Percentage of read notifications
- **totalContracts**: Total number of team contracts
- **contractsByType**: Count of contracts grouped by type
- **totalActions**: Total board of director actions
- **actionsExecutionRate**: Percentage of executed actions
- **growthMetrics**: Growth percentages compared to previous period
  - **teamsGrowth**: Percentage change in new teams
  - **membersGrowth**: Percentage change in new members
  - **claimsGrowth**: Percentage change in new claims

---

## Team Statistics

Get detailed statistics about teams including member counts, activity levels, and top teams.

**Endpoint**: `GET /api/stats/teams`

### Query Parameters

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `period` | string | No | `30d` | Time period: `7d`, `30d`, `90d`, `all` |
| `page` | integer | No | `1` | Page number for pagination |
| `limit` | integer | No | `10` | Items per page (max: 100) |

### Response

```json
{
  "totalTeams": 45,
  "activeTeams": 32,
  "avgMembersPerTeam": 3.47,
  "teamsWithOfficer": 28,
  "topTeamsByMembers": [
    {
      "id": 1,
      "name": "Development Team",
      "description": "Core development team",
      "memberCount": 8,
      "createdAt": "2024-01-15T10:30:00.000Z"
    }
  ],
  "period": "30d",
  "pagination": {
    "page": 1,
    "limit": 10,
    "totalPages": 5
  }
}
```

### Response Fields

- **totalTeams**: Total number of teams
- **activeTeams**: Teams with recent activity
- **avgMembersPerTeam**: Average number of members per team
- **teamsWithOfficer**: Number of teams with an assigned officer
- **topTeamsByMembers**: Array of teams sorted by member count
- **pagination**: Pagination information

---

## User Statistics

Get statistics about users including activity levels and team participation.

**Endpoint**: `GET /api/stats/users`

### Query Parameters

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `period` | string | No | `30d` | Time period: `7d`, `30d`, `90d`, `all` |
| `teamId` | integer | No | - | Filter by specific team ID |
| `page` | integer | No | `1` | Page number for pagination |
| `limit` | integer | No | `10` | Items per page (max: 100) |

### Response

```json
{
  "totalUsers": 156,
  "activeUsers": 98,
  "avgTeamsPerUser": 1.8,
  "multiTeamUsers": 42,
  "period": "30d",
  "pagination": {
    "page": 1,
    "limit": 10
  }
}
```

### Response Fields

- **totalUsers**: Total number of users in the system
- **activeUsers**: Users with activity in the period
- **avgTeamsPerUser**: Average number of teams per user
- **multiTeamUsers**: Number of users belonging to multiple teams

---

## Claims Statistics

Get statistics about claims and hours worked across teams.

**Endpoint**: `GET /api/stats/claims`

### Query Parameters

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `period` | string | No | `30d` | Time period: `7d`, `30d`, `90d`, `all` |
| `teamId` | integer | No | - | Filter by specific team ID |

### Response

```json
{
  "totalClaims": 892,
  "totalHoursWorked": 3456.5,
  "avgHoursPerClaim": 3.88,
  "claimsByTeam": [
    {
      "teamId": 1,
      "teamName": "Development Team",
      "claimCount": 234,
      "totalHours": 987.5
    }
  ],
  "period": "30d"
}
```

### Response Fields

- **totalClaims**: Total number of claims in the period
- **totalHoursWorked**: Sum of all hours across claims
- **avgHoursPerClaim**: Average hours per claim
- **claimsByTeam**: Array of claim statistics grouped by team

---

## Wage Statistics

Get statistics about wage rates and distribution across the platform.

**Endpoint**: `GET /api/stats/wages`

### Query Parameters

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `period` | string | No | `30d` | Time period: `7d`, `30d`, `90d`, `all` |
| `teamId` | integer | No | - | Filter by specific team ID |

### Response

```json
{
  "totalWages": 145,
  "averageRates": {
    "cash": 25.50,
    "token": 0.015,
    "usdc": 22.00
  },
  "wageDistribution": {
    "cash": 78,
    "token": 45,
    "usdc": 67
  },
  "membersWithWages": 89,
  "percentageWithWages": 57.05,
  "period": "30d"
}
```

### Response Fields

- **totalWages**: Total number of wage records
- **averageRates**: Average rates per hour for each payment type
  - **cash**: Average cash rate per hour
  - **token**: Average token rate per hour
  - **usdc**: Average USDC rate per hour
- **wageDistribution**: Count of wages by payment type
- **membersWithWages**: Number of members with wage records
- **percentageWithWages**: Percentage of total members with wages

---

## Expense Statistics

Get statistics about expenses including status distribution and team breakdown.

**Endpoint**: `GET /api/stats/expenses`

### Query Parameters

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `period` | string | No | `30d` | Time period: `7d`, `30d`, `90d`, `all` |
| `teamId` | integer | No | - | Filter by specific team ID |
| `page` | integer | No | `1` | Page number for pagination |
| `limit` | integer | No | `10` | Items per page (max: 100) |

### Response

```json
{
  "totalExpenses": 178,
  "expensesByStatus": {
    "signed": 134,
    "pending": 32,
    "expired": 12
  },
  "expensesByTeam": [
    {
      "teamId": 1,
      "teamName": "Development Team",
      "expenseCount": 45,
      "signedCount": 38,
      "expiredCount": 3
    }
  ],
  "period": "30d",
  "pagination": {
    "page": 1,
    "limit": 10
  }
}
```

### Response Fields

- **totalExpenses**: Total number of expenses
- **expensesByStatus**: Count of expenses grouped by status
- **expensesByTeam**: Array of expense statistics per team

---

## Contract Statistics

Get statistics about team contracts including types and distribution.

**Endpoint**: `GET /api/stats/contracts`

### Query Parameters

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `period` | string | No | `30d` | Time period: `7d`, `30d`, `90d`, `all` |
| `teamId` | integer | No | - | Filter by specific team ID |

### Response

```json
{
  "totalContracts": 67,
  "contractsByType": {
    "InvestorV1": 23,
    "CashRemunerationEIP712": 44
  },
  "avgContractsPerTeam": 1.49,
  "period": "30d"
}
```

### Response Fields

- **totalContracts**: Total number of contracts
- **contractsByType**: Count of contracts grouped by type
- **avgContractsPerTeam**: Average number of contracts per team

---

## Board Actions Statistics

Get statistics about board of director actions including execution rates.

**Endpoint**: `GET /api/stats/actions`

### Query Parameters

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `period` | string | No | `30d` | Time period: `7d`, `30d`, `90d`, `all` |
| `teamId` | integer | No | - | Filter by specific team ID |
| `page` | integer | No | `1` | Page number for pagination |
| `limit` | integer | No | `10` | Items per page (max: 100) |

### Response

```json
{
  "totalActions": 89,
  "executedActions": 73,
  "executionRate": 82.02,
  "actionsByTeam": [
    {
      "teamId": 1,
      "teamName": "Development Team",
      "actionCount": 25,
      "executedCount": 22,
      "executionRate": 88.00
    }
  ],
  "period": "30d",
  "pagination": {
    "page": 1,
    "limit": 10
  }
}
```

### Response Fields

- **totalActions**: Total number of board actions
- **executedActions**: Number of executed actions
- **executionRate**: Percentage of actions that were executed
- **actionsByTeam**: Array of action statistics per team

---

## Recent Activity

Get a feed of recent activities across the platform including claims, expenses, actions, and contracts.

**Endpoint**: `GET /api/stats/activity/recent`

### Query Parameters

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `limit` | integer | No | `20` | Number of activities to return (max: 100) |
| `teamId` | integer | No | - | Filter by specific team ID |

### Response

```json
{
  "activities": [
    {
      "type": "claim",
      "id": 567,
      "description": "Weekly claim submitted for 8 hours",
      "user": {
        "address": "0x1234567890abcdef1234567890abcdef12345678",
        "name": "John Doe"
      },
      "team": {
        "id": 1,
        "name": "Development Team"
      },
      "status": "pending",
      "createdAt": "2024-12-07T14:30:00.000Z"
    },
    {
      "type": "expense",
      "id": 123,
      "description": "Expense request for $250",
      "user": {
        "address": "0xabcdef1234567890abcdef1234567890abcdef12",
        "name": "Jane Smith"
      },
      "team": {
        "id": 2,
        "name": "Marketing Team"
      },
      "status": "signed",
      "createdAt": "2024-12-07T13:15:00.000Z"
    }
  ],
  "total": 2
}
```

### Response Fields

- **activities**: Array of recent activity items
  - **type**: Activity type (`claim`, `expense`, `action`, `contract`)
  - **id**: ID of the activity record
  - **description**: Human-readable description
  - **user**: User information
  - **team**: Team information
  - **status**: Current status of the activity
  - **createdAt**: Timestamp of activity creation
- **total**: Total number of activities returned

---

## Common Parameters

### Period Parameter

The `period` parameter is available on most endpoints and accepts the following values:

- `7d`: Last 7 days
- `30d`: Last 30 days (default)
- `90d`: Last 90 days
- `all`: All time

### Pagination Parameters

Endpoints that support pagination accept:

- `page`: Page number (starts at 1)
- `limit`: Items per page (max: 100)

### Team Filter

Most endpoints accept an optional `teamId` parameter to filter results by a specific team.

---

## Error Responses

All endpoints may return the following error responses:

### 400 Bad Request

Invalid query parameters or validation errors.

```json
{
  "message": "Validation error: period must be one of [7d, 30d, 90d, all]",
  "code": 400
}
```

### 401 Unauthorized

Missing or invalid authentication token.

```json
{
  "message": "Unauthorized: Invalid or missing token",
  "code": 401
}
```

### 403 Forbidden

User doesn't have permission to access the resource.

```json
{
  "message": "Access denied",
  "code": 403
}
```

### 500 Internal Server Error

Server-side error occurred.

```json
{
  "message": "Internal Server Error",
  "code": 500
}
```

---

## Usage Examples

### JavaScript/TypeScript (Fetch API)

```javascript
// Get overview statistics for the last 30 days
const response = await fetch('http://localhost:3000/api/stats/overview?period=30d', {
  headers: {
    'Authorization': `Bearer ${token}`
  }
});
const data = await response.json();
console.log(data);
```

### cURL

```bash
# Get team statistics with pagination
curl -X GET "http://localhost:3000/api/stats/teams?period=90d&page=1&limit=20" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### Vue 3 Composable (Nuxt)

```typescript
// Using the useStats composable
const { getOverviewStats } = useStats();

const stats = await getOverviewStats('30d', teamId);
console.log(stats);
```

---

## Rate Limiting

The Statistics API is protected by rate limiting configured at the server level. The default rate limit is 100,000 requests per 15 minutes per IP address.

---

## Best Practices

1. **Cache Results**: Statistics data doesn't change frequently. Consider caching responses for appropriate durations.

2. **Use Appropriate Periods**: Select the smallest period that meets your needs to reduce server load.

3. **Pagination**: For endpoints with large result sets, use pagination to avoid loading unnecessary data.

4. **Team Filtering**: When working with team-specific views, always use the `teamId` parameter to reduce response size.

5. **Error Handling**: Implement proper error handling for network failures and API errors.

6. **Token Management**: Ensure JWT tokens are refreshed before expiration to avoid authentication errors.

---

## Changelog

### Version 1.0.0 (December 2024)

- Initial release of Statistics API
- 9 comprehensive endpoints covering all platform metrics
- JWT authentication required for all endpoints
- Pagination support for large result sets
- Growth metrics and period-based filtering
