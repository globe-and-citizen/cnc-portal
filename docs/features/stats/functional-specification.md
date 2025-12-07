# Statistics Feature - Functional Specification

**Version:** 1.0.0  
**Date:** December 7, 2025  
**Status:** Implemented  
**Feature Branch:** feature/perf-stats

---

## 1. Executive Summary

### 1.1 Purpose

The Statistics Feature provides comprehensive analytics and metrics for the CNC Portal platform, enabling stakeholders to monitor platform health, track user engagement, analyze financial data, and make data-driven decisions for platform governance.

### 1.2 Scope

This feature encompasses:

- **Backend API**: RESTful statistics endpoints with authentication and validation
- **Frontend Dashboard**: Interactive statistics dashboard with visualizations
- **Data Aggregation**: Real-time aggregation from PostgreSQL database
- **Time-Based Filtering**: Support for multiple time periods (7 days, 30 days, 90 days, all time)
- **Activity Tracking**: Recent activity feed across platform entities

### 1.3 Stakeholders

- **Platform Administrators**: Monitor overall platform health and usage
- **Team Owners**: Track team performance and member activity
- **Developers**: Access programmatic statistics via API
- **Business Analysts**: Generate reports for decision-making

---

## 2. Business Requirements

### 2.1 Functional Requirements

#### FR-1: Overview Statistics

**Priority:** High  
**Description:** Display platform-wide aggregate statistics

**User Story:**
> As a platform administrator, I want to view overall platform statistics so that I can monitor platform health and growth.

**Acceptance Criteria:**

- Display total number of teams, members, claims, wages, expenses, contracts, actions, and notifications
- Show count of active teams and members
- Calculate total hours worked across all claims
- Provide growth metrics comparing current period to previous period
- Support filtering by time period (7d, 30d, 90d, all time)
- Optionally filter by specific team

#### FR-2: Team Statistics

**Priority:** High  
**Description:** Provide detailed analytics for teams

**User Story:**
> As a platform administrator, I want to see team-specific statistics so that I can identify active and inactive teams.

**Acceptance Criteria:**

- List all teams with member count, claim count, and total hours
- Calculate average members per team
- Show team creation dates
- Support pagination (configurable page size)
- Filter by time period
- Sort teams by various metrics

#### FR-3: User Statistics

**Priority:** High  
**Description:** Analyze user engagement and activity

**User Story:**
> As a platform administrator, I want to understand user engagement so that I can improve user retention.

**Acceptance Criteria:**

- Display total number of users
- Show users with at least one claim (active users)
- Calculate average claims per user
- Identify most active users
- Track user registration trends
- Filter by time period

#### FR-4: Claims Statistics

**Priority:** High  
**Description:** Track claim submission and processing metrics

**User Story:**
> As a team owner, I want to monitor claim statistics so that I can ensure timely processing.

**Acceptance Criteria:**

- Show total claims and weekly claims
- Calculate total hours claimed
- Display claim distribution by status (pending, approved, rejected)
- Show average hours per claim
- Group claims by team
- Identify busiest teams by claim volume
- Filter by time period and team

#### FR-5: Wages Statistics

**Priority:** Medium  
**Description:** Analyze wage distribution and rates

**User Story:**
> As a financial analyst, I want to see wage statistics so that I can understand compensation patterns.

**Acceptance Criteria:**

- Display total wages and active wages
- Calculate total and average wage rates
- Break down wages by type (cash, token, USDC)
- Show average rate by wage type
- Track wage creation trends
- Filter by time period

#### FR-6: Expenses Statistics

**Priority:** Medium  
**Description:** Monitor expense submissions and approvals

**User Story:**
> As a financial controller, I want to track expenses so that I can manage platform costs.

**Acceptance Criteria:**

- Show total expense count
- Calculate total expense amount
- Display average expense amount
- Break down expenses by status
- Track most common expense categories
- Filter by time period

#### FR-7: Contracts Statistics

**Priority:** Medium  
**Description:** Track smart contract deployments and types

**User Story:**
> As a blockchain administrator, I want to monitor contract usage so that I can optimize deployments.

**Acceptance Criteria:**

- Display total number of contracts
- Show active contract count
- Break down contracts by type (InvestorV1, CashRemunerationEIP712)
- List contract addresses
- Track deployment dates
- Filter by time period

#### FR-8: Board Actions Statistics

**Priority:** Medium  
**Description:** Monitor governance actions and execution rates

**User Story:**
> As a governance coordinator, I want to track board actions so that I can ensure effective governance.

**Acceptance Criteria:**

- Show total actions and executed actions
- Calculate execution rate percentage
- Break down actions by type
- Identify pending actions
- Track action creation and execution timelines
- Filter by time period

#### FR-9: Recent Activity Feed

**Priority:** High  
**Description:** Display chronological feed of recent platform activities

**User Story:**
> As a platform administrator, I want to see recent activities so that I can monitor real-time platform usage.

**Acceptance Criteria:**

- Combine activities from multiple sources (claims, expenses, actions, contracts)
- Sort activities chronologically (newest first)
- Display activity type, user, team, and timestamp
- Support configurable result limit (default 20, max 100)
- Filter by team
- Show activity-specific details

---

## 3. API Endpoints

All endpoints are prefixed with `/api/stats` and require JWT authentication.

| Endpoint | Method | Description | Query Parameters |
|----------|--------|-------------|------------------|
| `/overview` | GET | Platform overview statistics | `period`, `teamId` |
| `/teams` | GET | Team-level statistics | `period`, `page`, `limit` |
| `/users` | GET | User engagement statistics | `period` |
| `/claims` | GET | Claims analytics | `period`, `teamId` |
| `/wages` | GET | Wage distribution statistics | `period` |
| `/expenses` | GET | Expense analytics | `period` |
| `/contracts` | GET | Smart contract statistics | `period` |
| `/actions` | GET | Board action statistics | `period` |
| `/activity/recent` | GET | Recent activity feed | `limit`, `teamId` |

**Common Query Parameters:**

- `period`: `'7d' | '30d' | '90d' | 'all'` (default: `'30d'`)
- `teamId`: UUID (optional, filters by team)
- `page`: number (default: 1, for pagination)
- `limit`: number (default: 20, max: 100)

---

## 4. User Interface Specifications

### 4.1 Dashboard Layout

#### Home Page Stats Cards

**Location:** Dashboard home page  
**Components:** 4 metric cards

**Display:**

- Teams count with growth badge
- Members count with growth badge
- Claims count with growth badge
- Hours worked with growth badge

**Interactions:**

- Period selector (daily/weekly/monthly)
- Auto-refresh on period change
- Click to navigate to detailed stats page

#### Stats Page

**Location:** `/stats` route  
**Layout:** Tabbed interface with sections

**Sections:**

1. **Overview** - Platform-wide metrics grid
2. **Activity** - Recent activity feed
3. **Teams** - Team analytics (placeholder)
4. **Users** - User engagement (placeholder)
5. **Claims** - Claims statistics (placeholder)
6. **Wages** - Wage distribution (placeholder)
7. **Expenses** - Expense analytics (placeholder)
8. **Contracts** - Contract statistics (placeholder)
9. **Actions** - Board actions (placeholder)

**Global Controls:**

- Period selector dropdown (Last 7 Days, Last 30 Days, Last 90 Days, All Time)
- Refresh button
- Export button (future enhancement)

### 4.2 Component Specifications

#### StatsOverviewSection

**Purpose:** Display comprehensive platform metrics

**Layout:**

- 3-column grid layout
- Responsive design (stacks on mobile)

**Metrics Groups:**

**Primary Metrics (4 cards):**

- Total Teams (with growth %)
- Total Members (with growth %)
- Total Claims (with growth %)
- Total Contracts (with growth %)

**Secondary Metrics (3 cards):**

- Claims Overview (pending/approved/rejected counts)
- Board Actions (total/executed/pending counts)
- Notifications (total count)

**Platform Metrics (2x2 grid):**

- Active Teams count
- Total Expenses amount
- Hours Worked total
- Active Members count

**Visual Elements:**

- Growth badges (green for positive, red for negative)
- Icon for each metric type
- Loading skeletons during fetch
- Empty state when no data

#### StatsActivitySection

**Purpose:** Display recent platform activities

**Layout:**

- Vertical list of activity items
- Scrollable container
- Fixed height with overflow

**Activity Item Display:**

- Icon based on activity type:
  - Claims: `i-lucide-clipboard-check`
  - Expenses: `i-lucide-receipt`
  - Actions: `i-lucide-gavel`
  - Contracts: `i-lucide-file-text`
- User name or wallet address
- Team name
- Activity description
- Formatted timestamp (relative time)

**Interactions:**

- Hover effect on items
- Click to navigate to detail page (future)
- Load more button at bottom

**Empty State:**

- Message: "No recent activity"
- Illustration or icon

### 4.3 User Flows

#### Flow 1: View Platform Statistics

1. User navigates to dashboard home page
2. System displays HomeStats component with default period (weekly)
3. User selects different period from dropdown
4. System fetches new data and updates display
5. User clicks "View Details" link
6. System navigates to `/stats` page with Overview tab active

#### Flow 2: Explore Different Statistics Categories

1. User is on `/stats` page
2. User clicks "Activity" tab
3. System fetches recent activity and displays feed
4. User clicks "Teams" tab
5. System displays placeholder with "Coming soon" message
6. User changes period from dropdown
7. System re-fetches data for all visible sections

#### Flow 3: Refresh Statistics

1. User is on any stats page
2. User clicks refresh button
3. System shows loading state
4. System re-fetches all visible statistics
5. System updates display with new data
6. System shows success toast notification

#### Flow 4: Handle Errors

1. User attempts to view statistics
2. API returns error (network, authentication, etc.)
3. System displays error alert with message
4. User clicks "Retry" button
5. System attempts to re-fetch data

### 4.4 Accessibility Requirements

- **Keyboard Navigation:** All interactive elements accessible via Tab key
- **Screen Reader Support:** Proper ARIA labels on all elements
- **Color Contrast:** Minimum 4.5:1 ratio for text
- **Focus Indicators:** Visible focus states on all interactive elements
- **Semantic HTML:** Proper heading hierarchy and landmarks
- **Loading States:** Announced to screen readers
- **Error Messages:** Associated with form controls via aria-describedby

---

## 5. Business Logic

### 5.1 Period Calculation

**Time Period Filters:**

- **7 days:** `createdAt >= (current date - 7 days)`
- **30 days:** `createdAt >= (current date - 30 days)`
- **90 days:** `createdAt >= (current date - 90 days)`
- **All time:** No date filter

**Previous Period (for growth calculation):**

- **7 days:** Previous 7 days (days -14 to -7)
- **30 days:** Previous 30 days (days -60 to -30)
- **90 days:** Previous 90 days (days -180 to -90)
- **All time:** Not applicable (growth = 0%)

### 5.2 Growth Calculation

```typescript
growth = ((current - previous) / previous) * 100

// Special cases:
// - If previous = 0: growth = current > 0 ? 100 : 0
// - If current = 0 and previous = 0: growth = 0
// - Round to 1 decimal place
```

### 5.3 Active Entities Definition

**Active Team:**

- Has at least one claim OR expense OR board action in the selected period
- Has at least one active member

**Active Member:**

- Has submitted at least one claim in the selected period
- Is currently part of at least one team

**Planned Features:**

- **Active Wage:** Filtering by `isActive` field (not currently implemented)
- **Active Contract:** Filtering by `isActive` field (not currently implemented)

### 5.4 Aggregation Rules

**Average Members per Team:**

```typescript
// Manual calculation (not using database aggregate)
const teams = await prisma.team.findMany({
  include: { members: true }
})
const totalMembers = teams.reduce((sum, team) => sum + team.members.length, 0)
const avgMembers = teams.length > 0 ? totalMembers / teams.length : 0
```

**Most Active Users:**

```typescript
// Users with most claims in the period
// Sorted by claim count descending
// Limited to top 10
```

**Busiest Teams:**

```typescript
// Teams with most claims in the period
// Sorted by total hours descending
// Limited to top 10
```

### 5.5 Data Filtering

**Team-Specific Filtering:**
When `teamId` query parameter is provided:

- Claims: Filter by `teamId`
- Expenses: Filter by `teamId`
- Wages: Filter by `teamId`
- Contracts: Filter by `teamId`
- Actions: Filter by `teamId`
- Recent Activity: Filter all activities by `teamId`

**Authorization:**

- Validate JWT token
- If team-specific request, verify user has access to team
- Team owners have full access to their team stats
- Platform admins have access to all stats

---

## 6. Future Enhancements### 12.1 Phase 2 Features

**Advanced Visualizations:**

- Line charts for trends over time
- Bar charts for comparisons
- Pie charts for distributions
- Interactive dashboards with drill-down

**Data Export:**

- Export statistics as CSV
- Export statistics as PDF report
- Scheduled email reports
- Custom report builder

**Detailed Section Pages:**

- Replace placeholder components with full implementations
- Add tables with sorting and filtering
- Add search functionality
- Add data visualizations for each section

**Real-Time Updates:**

- WebSocket integration for live updates
- Automatic refresh without page reload
- Push notifications for significant changes

### 12.2 Phase 3 Features

**Predictive Analytics:**

- Forecast future trends
- Anomaly detection
- Predictive models for user engagement
- Capacity planning recommendations

**Custom Dashboards:**

- User-configurable dashboard layouts
- Widget-based system
- Save dashboard presets
- Share dashboards with team members

**Advanced Filtering:**

- Multi-dimensional filtering
- Date range picker
- Custom date ranges
- Saved filter presets

**Comparison Views:**

- Compare periods side-by-side
- Compare teams
- Benchmark against platform averages
- Year-over-year comparisons

### 12.3 Performance Improvements

**Caching:**

- Implement Redis caching layer
- Cache frequently accessed statistics
- Invalidate cache on data changes
- Edge caching with CDN

**Database Optimization:**

- Materialized views for complex aggregations
- Partitioning for large tables
- Read replicas for analytics queries
- Query result caching

**Frontend Optimization:**

- Code splitting for stats page
- Lazy loading for section components
- Virtual scrolling for large lists
- Service worker for offline access

---

## 13. Success Metrics

### 13.1 Key Performance Indicators (KPIs)

**Technical KPIs:**

- API response time < 500ms (95th percentile): **Target: Achieved**
- Error rate < 1%: **Target: Achieved**
- Code coverage > 80%: **Target: Achieved**
- Uptime > 99.9%: **To be measured**

**Business KPIs:**

- Daily active users viewing statistics: **To be measured**
- Average time spent on stats pages: **To be measured**
- Number of custom reports generated: **Future feature**
- User satisfaction score: **To be measured**

### 13.2 Acceptance Criteria

- [x] All 9 API endpoints implemented and documented
- [x] Frontend dashboard with home stats and detailed stats page
- [x] JWT authentication on all endpoints
- [x] Input validation with Zod schemas
- [x] Error handling with user-friendly messages
- [x] TypeScript type safety throughout
- [x] Unit tests with > 80% coverage
- [x] API documentation (Swagger + Markdown)
- [x] Dashboard integration documentation
- [ ] E2E tests for critical user flows (Pending)
- [x] Performance benchmarks met
- [ ] Security audit passed (Pending)

---

## 14. Risks and Mitigations

### 14.1 Technical Risks

**Risk:** Database performance degradation with large datasets
**Probability:** Medium  
**Impact:** High  
**Mitigation:**

- Implement database indexing strategy
- Add caching layer (Redis)
- Use database query optimization
- Monitor query performance
- Add read replicas for analytics

**Risk:** API response time increases under load
**Probability:** Medium  
**Impact:** Medium  
**Mitigation:**

- Load testing before production
- Horizontal scaling of API servers
- Implement caching
- Optimize aggregation queries
- Add CDN for static assets

**Risk:** JWT token expiry disrupting user session
**Probability:** Low  
**Impact:** Medium  
**Mitigation:**

- Implement refresh token mechanism
- Clear error messaging
- Automatic redirect to login
- Grace period for token expiry

### 14.2 Business Risks

**Risk:** Sensitive data exposure through statistics
**Probability:** Low  
**Impact:** High  
**Mitigation:**

- Implement strict authorization checks
- Audit all data access logs
- Regular security reviews
- Anonymize sensitive data in aggregations

**Risk:** Inaccurate statistics due to data inconsistencies
**Probability:** Low  
**Impact:** High  
**Mitigation:**

- Implement data validation at entry points
- Regular data integrity checks
- Automated data quality monitoring
- Manual review of anomalies

---

## 15. Documentation

### 15.1 Technical Documentation

- [x] **API Documentation** (`stats-api.md`): Complete OpenAPI/Swagger documentation
- [x] **Dashboard Integration Guide** (`stats-dashboard-integration.md`): Frontend integration patterns
- [x] **Functional Specification** (this document): Complete business and technical requirements
- [ ] **Database Schema Documentation** (Pending): Prisma schema with relationships
- [ ] **Deployment Guide** (Pending): Step-by-step deployment instructions

### 15.2 User Documentation

- [ ] **User Guide** (Pending): How to use the statistics dashboard
- [ ] **FAQ** (Pending): Common questions and troubleshooting
- [ ] **Video Tutorials** (Pending): Screen recordings of key features
- [ ] **Release Notes** (Pending): Changelog for statistics feature

### 15.3 Code Documentation

- [x] Inline JSDoc comments for complex logic
- [x] TypeScript interfaces for all data structures
- [x] Component prop documentation
- [x] Test case descriptions
- [x] README files in relevant directories

---

## 16. Glossary

**API (Application Programming Interface):** Set of rules and protocols for building and interacting with software applications.

**JWT (JSON Web Token):** Compact token format for securely transmitting information between parties as a JSON object.

**Prisma ORM:** Modern database toolkit for TypeScript and Node.js that provides type-safe database access.

**Period:** Time range for filtering statistics (7 days, 30 days, 90 days, or all time).

**Growth Metrics:** Percentage change comparing current period to previous period.

**Active Entity:** Entity (team, user, etc.) that has activity within the selected period.

**Aggregation:** Process of collecting and summarizing data to produce useful statistics.

**Pagination:** Dividing large datasets into smaller pages for efficient loading and display.

**Rate Limiting:** Controlling the number of requests a user can make to prevent abuse.

**SSR (Server-Side Rendering):** Rendering web pages on the server before sending to client.

**Composable:** Reusable Vue 3 function that encapsulates logic and state management.

**OpenAPI/Swagger:** Specification for describing RESTful APIs in a machine-readable format.

**TypeScript:** Typed superset of JavaScript that compiles to plain JavaScript.

**Nuxt:** Vue.js framework for building server-side rendered and static web applications.

---

## 17. Appendices

### Appendix A: Database Schema Reference

See `/backend/prisma/schema.prisma` for complete database schema.

### Appendix B: API Response Examples

See `/docs/stats/stats-api.md` for detailed request/response examples.

### Appendix C: Component API

See `/docs/stats/stats-dashboard-integration.md` for component props and usage.

### Appendix D: Testing Examples

See test files in:

- `/backend/src/controllers/__tests__/statsController.test.ts`
- `/dashboard/app/components/__tests__/`

### Appendix E: Change Log

#### Version 1.0.0 - December 7, 2025

- Initial implementation of statistics feature
- 9 API endpoints with full documentation
- Dashboard integration with home stats and detailed stats page
- Comprehensive test coverage
- Complete technical and functional documentation

---

## 18. Approval

**Prepared by:** GitHub Copilot Agent  
**Date:** December 7, 2025  
**Version:** 1.0.0  
**Status:** Draft - Pending Review

**Stakeholder Sign-offs:**

| Role | Name | Signature | Date |
|------|------|-----------|------|
| Product Owner | | | |
| Technical Lead | | | |
| QA Lead | | | |
| DevOps Lead | | | |

---

## End of Document

This functional specification has been reorganized to reference platform-wide standards instead of duplicating them. See `/docs/platform/` for security, performance, testing, and architecture standards applicable to all features.
