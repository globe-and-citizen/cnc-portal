# Statistics Feature Documentation

This folder contains comprehensive documentation for the CNC Portal Statistics feature.

## 📚 Documentation Index

### 1. [Functional Specification](./functional-specification.md)

**Audience:** Product managers, stakeholders, developers  
**Purpose:** Complete business and technical requirements

**Contents:**

- Executive summary and scope
- Business requirements (9 functional requirements)
- Non-functional requirements (performance, security, scalability)
- Technical specifications and architecture
- UI/UX specifications
- Business logic and calculations
- Data validation rules
- Error handling strategies
- Performance considerations
- Security specifications
- Testing strategy
- Deployment specifications
- Future enhancements roadmap

**When to use:** Understanding the feature's purpose, requirements, and design decisions.

---

### 2. [API Documentation](./stats-api.md)

**Audience:** Backend developers, API consumers, integration teams  
**Purpose:** Technical reference for all statistics API endpoints

**Contents:**

- Overview of 9 statistics endpoints
- Detailed endpoint documentation with:
  - Request parameters
  - Response schemas
  - Query parameter specifications
  - Error codes and handling
- Usage examples (JavaScript, cURL, Vue composable)
- Common parameters guide
- Authentication requirements
- Rate limiting information
- Best practices
- Changelog

**When to use:** Implementing API integrations, debugging API calls, understanding request/response formats.

---

### 3. [Dashboard Integration Guide](./stats-dashboard-integration.md)

**Audience:** Frontend developers, dashboard developers  
**Purpose:** Frontend integration patterns and component usage

**Contents:**

- Architecture overview
- TypeScript type definitions
- `useStats` composable API
- Component integration patterns
- Existing implementations (HomeStats, Stats page)
- Component library documentation
- Best practices for:
  - Error handling
  - Data formatting
  - Performance optimization
  - Authentication
  - Type safety
- Extension guide for adding new stat types
- Adding charts and visualizations
- Troubleshooting common issues
- Testing patterns

**When to use:** Building UI components that display statistics, integrating stats into new pages, extending the dashboard.

---

## 🚀 Quick Start

### For Backend Developers

1. Read the [Functional Specification](./functional-specification.md) sections 1-3, 5-7
2. Review [API Documentation](./stats-api.md) for endpoint details
3. Check `/backend/src/controllers/statsController.ts` for implementation
4. Run tests: `cd backend && npm test`

### For Frontend Developers

1. Read the [Dashboard Integration Guide](./stats-dashboard-integration.md) sections 1-4
2. Review existing components in `/dashboard/app/components/home/HomeStats.vue`
3. Check composable usage in `/dashboard/app/composables/useStats.ts`
4. Run dashboard: `cd dashboard && npm run dev`

### For Product Managers

1. Read [Functional Specification](./functional-specification.md) sections 1-2, 4, 16-17
2. Review success metrics in section 13
3. Check future enhancements in section 12

### For QA/Testing Teams

1. Read [Functional Specification](./functional-specification.md) section 10 (Testing Strategy)
2. Review acceptance criteria in section 13.2
3. Check test files in `/backend/src/controllers/__tests__/`

---

## 📊 Feature Overview

The Statistics feature provides comprehensive analytics for the CNC Portal platform through:

- **9 API Endpoints:**
  - Overview statistics (platform-wide metrics)
  - Team statistics
  - User statistics
  - Claims analytics
  - Wages distribution
  - Expenses tracking
  - Smart contracts statistics
  - Board actions analytics
  - Recent activity feed

- **Dashboard Integration:**
  - Home page stats cards
  - Detailed statistics page with tabbed interface
  - Real-time data fetching with loading states
  - Period-based filtering (7d, 30d, 90d, all time)
  - Growth metrics and trends

- **Key Features:**
  - JWT authentication
  - Role-based access control
  - Time-based filtering
  - Pagination for large datasets
  - Growth calculations
  - Real-time aggregations
  - Comprehensive error handling

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────┐
│           Nuxt Dashboard (Frontend)         │
│  - Vue 3 Components                         │
│  - useStats Composable                      │
│  - TypeScript Types                         │
└──────────────────┬──────────────────────────┘
                   │ HTTPS/REST + JWT
                   ▼
┌─────────────────────────────────────────────┐
│         Express API (Backend)               │
│  - Stats Routes + Validation                │
│  - Stats Controller + Business Logic        │
│  - Prisma ORM                               │
└──────────────────┬──────────────────────────┘
                   │ SQL Queries
                   ▼
┌─────────────────────────────────────────────┐
│         PostgreSQL Database                 │
│  - 10 Tables (User, Team, Claim, etc.)      │
│  - Indexes for Performance                  │
└─────────────────────────────────────────────┘
```

---

## 🔗 Related Files

### Backend

- `/backend/src/validation/schemas/stats.ts` - Zod validation schemas
- `/backend/src/controllers/statsController.ts` - Business logic
- `/backend/src/routes/statsRoute.ts` - API routes
- `/backend/src/controllers/__tests__/statsController.test.ts` - Tests

### Frontend

- `/dashboard/app/types/index.d.ts` - TypeScript types
- `/dashboard/app/composables/useStats.ts` - API integration
- `/dashboard/app/components/home/HomeStats.vue` - Home page stats
- `/dashboard/app/pages/stats.vue` - Statistics page
- `/dashboard/app/components/stats/` - Stats section components

### Database

- `/backend/prisma/schema.prisma` - Database schema

---

## 🧪 Testing

### Backend Tests

```bash
cd backend
npm test -- statsController.test.ts
```

### Frontend Tests

```bash
cd dashboard
npm run test:unit
```

### E2E Tests

```bash
cd dashboard
npm run test:e2e
```

---

## 📈 Performance Metrics

- **API Response Time:** < 500ms (95th percentile) ✅
- **Code Coverage:** > 80% ✅
- **Concurrent Users:** 100 ✅
- **Rate Limit:** 100,000 requests / 15 minutes

---

## 🔐 Security

- **Authentication:** JWT Bearer tokens required
- **Authorization:** Role-based access control
- **Input Validation:** Zod schemas on all inputs
- **Rate Limiting:** 100k requests per 15 minutes
- **SQL Injection:** Protected via Prisma ORM
- **XSS Prevention:** Vue automatic escaping

---

## 🐛 Troubleshooting

### Common Issues

**Problem:** 401 Unauthorized errors  
**Solution:** Check JWT token validity, ensure user is authenticated

**Problem:** Slow API responses  
**Solution:** Check database indexes, review query performance, consider caching

**Problem:** TypeScript type errors  
**Solution:** Verify types in `/dashboard/app/types/index.d.ts` match API responses

**Problem:** Data not updating  
**Solution:** Check `watch` configuration in `useAsyncData`, verify period changes trigger refetch

See [Dashboard Integration Guide](./stats-dashboard-integration.md#troubleshooting) for detailed troubleshooting.

---

## 🚦 Status

**Current Version:** 1.0.0  
**Status:** ✅ Implemented and Documented  
**Branch:** feature/perf-stats

**Completed:**

- ✅ Backend API implementation (9 endpoints)
- ✅ Frontend dashboard integration
- ✅ Comprehensive documentation
- ✅ Unit tests (>80% coverage)
- ✅ API documentation (Swagger + Markdown)
- ✅ Dashboard integration guide
- ✅ Functional specification

**Pending:**

- ⏳ E2E tests
- ⏳ Security audit
- ⏳ Performance benchmarking in production
- ⏳ User documentation

---

## 📞 Support

For questions or issues related to the statistics feature:

1. Check this documentation first
2. Review test files for usage examples
3. Check existing component implementations
4. Create an issue in the repository with:
   - Problem description
   - Steps to reproduce
   - Expected vs actual behavior
   - Error messages and logs

---

## 📝 Contributing

When contributing to the statistics feature:

1. Follow project coding standards (see `/.github/copilot-instructions/`)
2. Add tests for new functionality
3. Update relevant documentation
4. Follow commit conventions (see `/docs/stats/functional-specification.md#16`)
5. Ensure all tests pass before submitting PR

---

## 📄 License

This documentation is part of the CNC Portal project.

---

**Last Updated:** December 7, 2025  
**Maintained by:** CNC Portal Development Team
