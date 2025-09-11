# TypeScript Guidelines

## Type Safety

- Use strict TypeScript configuration
- Avoid `any` type - use proper typing or `unknown`
- Define interfaces for all data structures
- Use type guards for runtime type checking

## Import/Export

- Use named imports/exports over default exports
- Group imports: external libraries → internal modules → relative imports
- Use absolute imports with path mapping when available

## Common Patterns

### Interface Definitions

```typescript
interface UserData {
  id: number
  name: string
  email: string
  address?: Address
}
```

### Type Guards

```typescript
function isValidUser(user: unknown): user is UserData {
  return typeof user === 'object' && 
         user !== null && 
         'id' in user && 
         'name' in user
}
```

This file will be expanded with detailed TypeScript guidelines specific to the project.
