# Contribution guidline

## How to contribute

Follow [Development Relationship Validation](./docs/development-guide/relationship-validation.md) at issue scoping, implementation,
independent review, and final validation before merge. Include the affected relationships, evidence, and completion proposals in the
issue/PR templates; inspect consumers outside the changed files when their guarantees may be affected.

1. Fork the repository
2. Clone the repository
3. Create a new branch
4. Make your changes
5. Commit your changes
6. Push to the branch
7. Create a pull request
8. Wait for review
9. Merge your pull request
10. Sync your fork
11. Delete your branch
12. Update your fork

## Command line to run for each folder

- /app

```bash
npm run build
npm run test:unit
npm run type-check
npm run lint
npm run format
```

- /backend

```bash
npm run build
npm run test
npm run lint
npm run format
```

- /contract

```bash
npm run test
npm run lint
npm run format
```
