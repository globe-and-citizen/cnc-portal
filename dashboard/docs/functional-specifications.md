# CNC Portal Admin Dashboard - Functional Specifications

**Version:** 1.0  
**Date:** November 21, 2025  
**Author:** Development Team

---

## 1. Overview & Purpose

The admin dashboard provides **centralized monitoring and analytics** for the CNC Portal platform, enabling super administrators to:

- View comprehensive platform statistics and metrics
- Monitor team activities and growth
- Track contract deployments and usage
- Analyze contribution patterns and financial flows
- Generate reports and export data

### Key Constraints

- **Read-only**: No contract interactions or state modifications
- **Super Admin Only**: Single role with full view access
- **Minimal Backend Changes**: Leverage existing backend APIs and The Graph subgraph data
- **Analytics Focus**: Emphasis on insights and data visualization

---

## 2. Access Control

### 2.1 Single Role Model

**Super Admin (Platform Level)**

- Full read-only access to all dashboard features
- Can view all teams, members, and contributions
- Can generate and export reports
- **Cannot** modify contracts, teams, or trigger blockchain transactions

### 2.2 Authentication

**Authentication Method:**

- Wallet-based authentication using message signing to verify ownership
- Admin wallet addresses are pre-configured in the backend system

**Session Management:**

- JWT token-based session management
- Automatic logout after 30 minutes of inactivity
- Secure session storage and validation

---

## 3. Dashboard Sections

### 3.1 Overview Dashboard (Home)

**Purpose:** High-level platform metrics and activity summary

#### A. Platform Statistics Cards

**Metrics to Display:**

- Total number of teams on the platform
- Number of active teams (teams with activity in the last 30 days)
- Total number of members across all teams
- Total number of contributions submitted
- Total value distributed across all teams in USD
- Breakdown of distributed value by token (symbol, amount, USD value)

**Display Features:**

- Large metric cards with trend indicators (↑/↓ vs previous period)
- Percentage change from last month
- Visual icons for each metric
- Color coding (green for positive trends, red for negative)

#### B. Activity Timeline (Last 30 Days)

**Activity Metrics:**

- Selectable time periods: 24 hours, 7 days, 30 days, or all time
- Number of new teams created in the period
- Number of new members added
- Number of new contributions submitted
- Total transaction volume in USD
- Average contribution value
- Number of unique active contributors

**Visualization:**

- Line chart showing trends over selected period
- Filterable by time range
- Comparative view (current vs previous period)

#### C. Recent Activity Feed

**Activity Types:**

- Team created
- Member added to team
- Contribution submitted
- Payment sent to member
- Vesting schedule created

**Information Displayed:**

- Timestamp of the activity
- Team ID and name (when applicable)
- Actor's wallet address and ENS name (if available)
- Activity details description
- Amount and token (for financial activities)

**Display Features:**

- Reverse chronological list (most recent first)
- Pagination (20 items per page)
- Filter by activity type
- Click to view details

#### D. Top Performers Section

**Top Teams by Activity:**

- Team ID and name
- Number of contributions
- Number of members
- Sorted by activity level

**Top Contributors:**

- Wallet address and ENS name (if available)
- Number of contributions made
- Total amount earned
- Ranked by contribution count or earnings

**Most Active Tokens:**

- Token contract address and symbol
- Number of transactions
- Total volume transacted
- Ranked by usage frequency or volume

---

### 3.2 Teams Analytics

**Purpose:** Comprehensive team statistics and comparisons

#### A. Teams Overview Grid

**Team Information Displayed:**

- Team ID and name
- Team slug (URL identifier)
- Creation date
- Number of members
- Number of contributions
- Total value distributed to members
- Number of active vesting schedules
- Date of last activity
- Contract addresses (Member Management, Cash Remuneration, Vesting Manager)
- Growth rate (percentage change in contributions)

**Features:**

- Sortable/filterable data table
- Search by team name or slug
- Export to CSV
- Click row to view team details

#### B. Team Detail View

**Team Information Tab:**

_Basic Information:_

- Team name and description
- Team slug
- Creator's wallet address
- Creation date

_Contract Information:_

- Member Management contract address
- Cash Remuneration contract address
- Vesting Manager contract address
- Contract deployment date

_Statistics:_

- Total number of members
- Total number of contributions
- Total value distributed
- Average contribution value
- Contribution frequency (contributions per month)

**Members Tab:**

- List of all team members with roles
- Join dates and contribution counts
- Export member list

**Activity Timeline:**

- Chronological view of team events
- Filterable by event type
- Contribution history with amounts

**Financial Overview:**

_Treasury Information:_

- Token contract addresses and symbols
- Current balance for each token
- USD value of each token balance

_Distribution History:_

- Date of distribution
- Amount distributed
- Token used
- Recipient wallet address
- Distribution type (direct payment or vesting)

_Vesting Schedules:_

- Schedule ID
- Recipient wallet address
- Total vesting amount
- Start date, cliff date, and end date
- Amount already released
- Schedule status (active or completed)

**Charts:**

- Contribution trends over time
- Distribution by token pie chart
- Member growth chart
- Activity heatmap (contributions by day/week)

---

### 3.3 Members Analytics

**Purpose:** User and contribution tracking

#### A. Members Overview

**Member Information Displayed:**

- Wallet address
- ENS name (if available)
- Profile avatar (if available)
- Number of teams the member belongs to
- List of teams with:
  - Team ID and name
  - Date joined
  - Role (owner, admin, or member)
- Contribution statistics:
  - Total contributions
  - Approved contributions
  - Pending contributions
  - Total amount earned
- Date of first activity
- Date of last activity
- Activity score (calculated metric based on participation)

**Features:**

- Search by address or ENS name
- Filter by team membership
- Sort by various metrics
- Export filtered results

#### B. Member Detail View

**Identity Information:**

- Wallet address
- ENS name (if available)
- Profile avatar (if available)

**Team Memberships:**

- Team ID and name
- Role in each team
- Date joined
- Number of contributions to that team
- Amount earned from that team

**Contributions List:**

- Contribution ID
- Team name
- Amount
- Token used
- Description
- Submission date
- Status (pending, approved, distributed)

**Vesting Schedules:**

- Team name
- Total vesting amount
- Start and end dates
- Amount already released
- Remaining amount to be released

**Member Statistics:**

- Total number of contributions
- Total amount earned across all teams
- Average contribution value
- Number of teams participated in
- Member since date
- Date of last contribution

**Visualizations:**

- Contribution timeline chart
- Earnings by team pie chart
- Activity calendar heatmap
- Vesting schedule progress bars

---

### 3.4 Contributions Analytics

**Purpose:** Track and analyze all platform contributions

#### A. Contributions Overview

**Contribution Information Displayed:**

- Contribution ID
- Submission timestamp
- Team ID and name
- Contributor's wallet address
- Contributor's ENS name (if available)
- Contribution amount
- Token contract address and symbol
- Description of the contribution
- Category
- Status (pending, approved, or distributed)
- Approver's address (if approved)
- Approval date (if approved)
- Distribution date (if distributed)
- Transaction hash (if distributed)

**Features:**

- Advanced filtering:
  - By team
  - By contributor
  - By token
  - By date range
  - By status
  - By amount range
- Sort by any column
- Pagination (50 items per page)
- Export to CSV with applied filters

#### B. Contribution Statistics

**Statistics by Status:**

- Number of pending contributions
- Number of approved contributions
- Number of distributed contributions

**Statistics by Team:**

- Team ID and name
- Contribution count per team
- Total value of contributions per team

**Statistics by Token:**

- Token symbol
- Number of contributions using each token
- Total volume per token

**Statistics by Category:**

- Contribution category
- Number of contributions per category
- Percentage of total contributions per category

**Trend Analysis:**

- Daily trends: date, count, and value
- Weekly trends: week identifier, count, and value
- Monthly trends: month identifier, count, and value

**Visualizations:**

- Contribution status distribution (pie chart)
- Contribution value trends (line chart)
- Top contributors (bar chart)
- Category distribution (donut chart)
- Time-to-approval metrics (histogram)

---

### 3.5 Financial Analytics

**Purpose:** Platform-wide financial overview

#### A. Treasury Overview

**Overall Treasury Metrics:**

- Total Value Locked (TVL) across all teams in USD

**Breakdown by Token:**

- Token contract address and symbol
- Current balance of each token
- USD value of each token
- Percentage of total treasury

**Breakdown by Team:**

- Team ID and name
- List of tokens held by each team with:
  - Token symbol
  - Balance
  - USD value
- Total USD value per team

**Historical Data:**

- Historical Total Value Locked over time (date and USD value)

**Visualizations:**

- Total Value Locked (TVL) chart over time
- Token distribution pie chart
- Team treasury comparison bar chart

#### B. Payment Analytics

**Overall Payment Metrics:**

- Total number of payments made
- Total volume of payments
- Average payment size

**Payments by Type:**

- Number of direct payments
- Number of vesting payments

**Payment History:**

- Payment date
- Team ID and name
- Recipient wallet address
- Payment amount
- Token used
- Payment type (direct or vesting)
- Transaction hash

**Payment Trends:**

- Volume over time (date and volume)
- Frequency over time (date and count)

#### C. Vesting Analytics

**Vesting Overview:**

- Number of active vesting schedules
- Number of completed vesting schedules
- Total amount currently vested
- Total amount already released

**Vesting Schedule Details:**

- Schedule ID
- Team ID and name
- Recipient wallet address
- Total vesting amount
- Token used
- Start date
- Cliff date (when vesting begins releasing)
- End date (when vesting completes)
- Amount already released
- Remaining amount to be released
- Status (active or completed)

**Upcoming Releases:**

- Release date
- Schedule ID
- Amount to be released
- Recipient wallet address

**Visualizations:**

- Vesting schedule timeline (Gantt chart)
- Released vs remaining funds (stacked bar chart)
- Upcoming releases calendar view

---

### 3.6 Smart Contracts Analytics

**Purpose:** Monitor deployed contracts

#### A. Contract Registry

**Contract Information Displayed:**

- Contract type (Member Management, Cash Remuneration, or Vesting Manager)
- Contract address
- Team ID and name that owns the contract
- Deployment date
- Deployer's wallet address
- Contract version
- Status (active or deprecated)

**Contract Statistics:**

- Total number of interactions with the contract
- Date of last interaction
- Total gas used by the contract
- Number of errors/failed transactions

**Features:**

- List all deployed contracts
- Filter by type and team
- View contract details on block explorer
- Show deployment history

#### B. Contract Usage Statistics

**Interactions by Contract:**

- Contract address
- Contract type
- Total number of interactions
- Number of unique users who interacted
- Total gas used

**Interactions by Function:**

- Function name
- Number of times called
- Average gas used per call
- Success rate (percentage of successful calls)

**Usage Trends Over Time:**

- Date
- Number of interactions
- Gas used

**Visualizations:**

- Contract interactions timeline
- Function call distribution pie chart
- Gas usage trends
- Error rate monitoring

---

### 3.7 Reports & Analytics

**Purpose:** Generate comprehensive reports

#### A. Report Types

**Report Configuration Options:**

- Report type: Platform, Team, Member, Financial, or Custom
- Date range: Start and end dates for data inclusion
- Filters:
  - Specific team IDs
  - Specific member addresses
  - Specific token addresses
  - Specific contribution categories
- Export format: CSV, PDF, or JSON

**Generated Report Information:**

- Unique report ID
- Report type
- Generation timestamp
- Generator's wallet address
- Download URL
- Expiration date

**Available Reports:**

1. **Platform Summary Report**
   - Overall platform statistics
   - Growth metrics
   - Top performers
   - Financial summary

2. **Team Performance Report**
   - Per-team statistics
   - Member contributions
   - Financial breakdown
   - Activity timeline

3. **Member Activity Report**
   - Individual member statistics
   - Cross-team participation
   - Earnings breakdown
   - Contribution history

4. **Financial Report**
   - Treasury status
   - Payment history
   - Vesting schedules
   - Token distribution

5. **Custom Report Builder**
   - Select specific metrics
   - Apply custom filters
   - Choose visualization types
   - Export in preferred format

---

## 4. Data Sources

### 4.1 Backend API Endpoints

**Leverage existing endpoints:**

- Get all teams: `/api/teams`
- Get team by ID: `/api/teams/:id`
- Get team members: `/api/teams/:id/members`
- Get team contributions: `/api/teams/:id/contributions`
- Get member by address: `/api/members/:address`
- Get all contributions: `/api/contributions`

**New read-only endpoints needed:**

_Dashboard Statistics:_

- Get overview statistics: `/api/admin/stats/overview`
- Get teams statistics: `/api/admin/stats/teams`
- Get members statistics: `/api/admin/stats/members`
- Get contributions statistics: `/api/admin/stats/contributions`
- Get financial statistics: `/api/admin/stats/financial`

_Activity Feed:_

- Get recent activity: `/api/admin/activity/recent?limit=20&page=1`

_Reports:_

- Generate predefined report: `/api/admin/reports/generate`
- Generate custom report: `/api/admin/reports/custom` (POST)
- Download generated report: `/api/admin/reports/:id/download`

### 4.2 The Graph Subgraph Queries

**Leverage existing subgraph for blockchain data:**

**Team Analytics Query:**

- Query team data by team ID
- Retrieved data includes:
  - Team ID and name
  - Member count
  - Total contributions count
  - Total value distributed
  - Contract addresses (Member Management, Cash Remuneration, Vesting Manager)
  - List of contributions with ID, amount, token, timestamp, and contributor
  - List of vesting schedules with ID, amount, released amount, and status

**Platform Statistics Query:**

- Query platform-wide statistics
- Retrieved data includes:
  - Total number of teams
  - Total number of members
  - Total number of contributions
  - Total value locked
  - List of tokens with address, symbol, and total volume

**Contract Events Query:**

- Query contract interaction events by contract address
- Retrieved data includes:
  - Event ID
  - Function name that was called
  - Caller's address
  - Timestamp
  - Gas used
- Results are ordered by timestamp in descending order (most recent first)

---

## 5. Technical Architecture

### 5.1 Frontend Stack

**Technology:**

- Nuxt 3 (Vue 3 framework)
- TypeScript
- Pinia for state management
- Vue Router (built-in with Nuxt)
- Chart.js or ApexCharts for visualizations
- TailwindCSS + DaisyUI for styling
- Viem for Ethereum address handling
- Apollo Client for GraphQL queries

### 5.2 File Structure

**Main Dashboard Application Directory (`dashboard/app/`):**

**Components:**

- Admin components organized by category:
  - Layout: Sidebar, Header, Breadcrumb navigation
  - Charts: Line, Pie, Bar, Heatmap, and Gantt chart components
  - Cards: Stats, Trend, and Metric display cards
  - Tables: Data table, Sortable table, Exportable table components
  - Filters: Date range picker, Multi-select, Filter panel components
  - Widgets: Activity feed, Top performers, Recent activity widgets

**Pages:**

- Admin pages organized by feature:
  - Dashboard home (index)
  - Teams section: Teams list and individual team details pages
  - Members section: Members list and individual member profile pages
  - Contributions analytics page
  - Financial analytics page
  - Smart contracts monitoring page
  - Reports generation page

**Layouts:**

- Admin layout wrapper that provides consistent structure across all admin pages

**State Management (Stores):**

- Admin authentication store
- Dashboard data store
- Teams analytics store
- Members analytics store
- Contributions analytics store
- Reports store

**Composables:**

- Reusable composition functions for:
  - Admin authentication logic
  - Dashboard data fetching
  - Chart data preparation
  - Data export functionality
  - Report generation

**Type Definitions:**

- TypeScript type definitions for:
  - Admin-related types
  - Analytics data structures
  - Report configurations

**Middleware:**

- Route protection middleware for admin authentication

**Documentation:**

- Functional specifications
- Technical architecture documentation
- API documentation

**Configuration Files:**

- Nuxt configuration
- Tailwind CSS configuration
- TypeScript configuration
- Package dependencies

### 5.3 Navigation Structure

**Sidebar Menu:**

- **Dashboard**
  - Overview (Home page)

- **Teams**
  - All Teams (list view)
  - Team Details (individual team pages)

- **Members**
  - All Members (list view)
  - Member Profile (individual member pages)

- **Contributions**
  - Contributions analytics

- **Financial**
  - Treasury overview
  - Payments analytics
  - Vesting schedules

- **Contracts**
  - Smart contracts monitoring

- **Reports**
  - Report generation and download

---

## 6. User Interface Guidelines

### 6.1 Design Principles

**Layout:**

- Responsive design (desktop-first, mobile-compatible)
- Consistent spacing using Tailwind's spacing scale
- Maximum content width: 1400px
- Sidebar: 240px width (collapsible on mobile)

**Colors:**

- Primary: Use project's primary color
- Success: Green (#10B981)
- Warning: Yellow (#F59E0B)
- Error: Red (#EF4444)
- Neutral: Gray scale (#6B7280 - #F9FAFB)

**Typography:**

- Headings: Use semantic heading tags (h1-h6)
- Body: 16px base font size
- Monospace for addresses: `font-mono`

**Components:**

- Metric cards with icons and trend indicators
- Data tables with sorting and filtering
- Charts with responsive behavior
- Modal dialogs for detailed views
- Toast notifications for user feedback

### 6.2 Accessibility

- Keyboard navigation support
- ARIA labels for interactive elements
- Sufficient color contrast (WCAG AA)
- Screen reader friendly
- Focus management in modals
- All interactive elements have `data-test` attributes

---

## 7. Implementation Phases

### Phase 1: Foundation (Week 1-2)

- [ ] Set up Nuxt 3 project structure
- [ ] Authentication system (wallet-based)
- [ ] Admin dashboard layout and navigation
- [ ] Overview dashboard with basic stats
- [ ] Backend API endpoints for statistics

### Phase 2: Teams & Members (Week 3-4)

- [ ] Teams analytics view
- [ ] Team detail pages
- [ ] Members analytics view
- [ ] Member profile pages
- [ ] Data export functionality

### Phase 3: Contributions & Financial (Week 5-6)

- [ ] Contributions analytics
- [ ] Financial analytics
- [ ] Chart components and visualizations
- [ ] Advanced filtering
- [ ] The Graph integration

### Phase 4: Contracts & Reports (Week 7-8)

- [ ] Contract analytics
- [ ] Report generation system
- [ ] Custom report builder
- [ ] Performance optimization
- [ ] Comprehensive testing
- [ ] Documentation

---

## 8. Testing Requirements

### 8.1 Unit Tests

- All Pinia stores
- All utility functions
- Composables
- Data transformation logic

### 8.2 Component Tests

- All dashboard components
- Chart rendering
- Data table interactions
- Filter functionality
- Export functionality

### 8.3 Integration Tests

- API integration
- Authentication flows
- GraphQL queries
- Report generation

### 8.4 E2E Tests

- Critical admin workflows
- Navigation and routing
- Data visualization
- Export operations

---

## 9. Performance Requirements

- Dashboard metrics should load in < 2 seconds
- Data tables should support pagination (20-50 items per page)
- Charts should render smoothly with large datasets
- Efficient caching for frequently accessed data
- Lazy loading for heavy components and routes
- Optimized bundle size with code splitting

---

## 10. Security Requirements

- All admin endpoints require authentication
- Wallet signature verification for admin access
- Session management with JWT tokens
- Rate limiting on API endpoints
- Input validation and sanitization
- CSRF protection on state-changing operations
- No sensitive data in client-side storage

---

## 11. Open Questions

1. **Data Refresh Strategy**: Should we implement real-time updates (WebSocket) or periodic polling?
2. **Historical Data**: How far back should historical data be retained and displayed?
3. **Export Limits**: Should there be limits on report size or date ranges?
4. **Caching Strategy**: What caching mechanisms should we implement for better performance?
5. **Admin Management**: How should super admin addresses be managed (database, config file, smart contract)?
6. **Multi-Network**: Should the dashboard support viewing data from multiple blockchain networks?
7. **Data Retention**: What's the data retention policy for exported reports?
8. **Notifications**: Should there be email/push notifications for significant platform events?

---

## 12. Future Enhancements (Out of Scope for v1)

- Multi-language support
- Advanced AI-powered analytics and predictions
- Custom dashboard widgets
- Automated alert system
- Public-facing statistics page
- Mobile native app
- Integration with third-party analytics tools
- Automated scheduled reports via email

---

## Appendix A: Example API Responses

### Platform Statistics Example

**Sample data structure for platform statistics:**

- Total teams: 42
- Active teams: 38
- Total members: 256
- Total contributions: 1,847
- Total value distributed: $1,250,000 USD
- Breakdown by token:
  - ETH: 500 tokens, valued at $1,000,000
  - USDC: 250,000 tokens, valued at $250,000
- Growth trends:
  - Teams growth: 15.5%
  - Members growth: 22.3%
  - Contributions growth: 18.7%

### Activity Feed Item Example

**Sample activity feed entry:**

- Activity ID: "activity-123"
- Type: Contribution made
- Timestamp: November 21, 2025 at 10:30 AM UTC
- Team ID: 5
- Team name: "DeFi Builders"
- Actor address: 0x1234...7890
- Actor ENS: builder.eth
- Details: "Submitted contribution for smart contract development"
- Amount: 5 ETH
- Token: ETH

---

**Document Status:** Draft v1.0  
**Last Updated:** November 21, 2025  
**Approved By:** _Pending_
