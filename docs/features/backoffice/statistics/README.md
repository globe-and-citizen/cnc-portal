# Backoffice Statistics

**Scope:** Administrator-facing platform analytics in the Nuxt dashboard

**Documentation state:** Existing references; alignment with the current feature model is due

The dashboard overview and detailed statistics route let administrators inspect platform, team,
user, claim, wage, expense, contract, governance-action, and recent-activity metrics over a selected
period. This directory is nested under Backoffice because statistics are exposed through the
administrator dashboard rather than the client app.

These documents predate the current human-review contract. They provide useful implementation and
product context, but their historical completion claims are not a current acceptance record.

## Documentation

| Document                                                        | Purpose                                 |
| --------------------------------------------------------------- | --------------------------------------- |
| [Functional Specification](./functional-specification.md)       | Historical business and technical scope |
| [API Reference](./stats-api.md)                                 | Statistics endpoints and data shapes    |
| [Dashboard Integration Guide](./stats-dashboard-integration.md) | Dashboard integration patterns          |

## Current Evidence

- [Dashboard overview](../../../../dashboard/app/pages/index.vue)
- [Detailed statistics page](../../../../dashboard/app/pages/stats.vue)
- [Statistics composable](../../../../dashboard/app/composables/useStats.ts)
- [Statistics components](../../../../dashboard/app/components/stats)
- [Backend controller](../../../../backend/src/controllers/statsController.ts)
- [Backend routes](../../../../backend/src/routes/statsRoute.ts)

## Related Documentation

- [Backoffice Feature Inventory](../README.md)
- [Product Feature Inventory](../../README.md)
- [Feature Documentation Guide](../../../platform/feature-specification-guide.md)
