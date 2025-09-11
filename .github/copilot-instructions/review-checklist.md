# Code Review Checklist

## Pre-Review Checklist

Before submitting code for review, ensure the following items are completed:

### General Code Quality

- [ ] **TypeScript Compilation**: Code compiles without TypeScript errors
- [ ] **Linting**: No ESLint errors or warnings
- [ ] **Formatting**: Code is properly formatted with Prettier
- [ ] **Type Safety**: No `any` types used unless absolutely necessary
- [ ] **Import Organization**: Imports are organized (external → internal → relative)
- [ ] **Console Logs**: No unnecessary console.log statements in production code

### Vue.js Component Standards

- [ ] **Composition API**: Uses `<script setup lang="ts">` syntax
- [ ] **Component Structure**: Follows established component structure pattern
- [ ] **Props Definition**: Props are properly typed with TypeScript interfaces
- [ ] **Event Emissions**: Uses `defineEmits` with proper typing
- [ ] **Data-Test Attributes**: All interactive elements have `data-test` attributes
- [ ] **Reactivity**: Uses appropriate reactivity APIs (`ref`, `reactive`, `computed`)
- [ ] **Component Organization**: Script section follows the standard order

### Web3/Blockchain Integration

- [ ] **Address Validation**: All addresses are validated using `isAddress()` from viem
- [ ] **Error Handling**: Comprehensive error handling for all contract calls
- [ ] **Transaction Confirmations**: Uses `useWaitForTransactionReceipt` for transaction confirmation
- [ ] **Loading States**: Proper loading states during blockchain operations
- [ ] **Gas Handling**: Appropriate gas estimation and error handling
- [ ] **Network Errors**: Graceful handling of network-related errors

### State Management

- [ ] **Pinia Stores**: Stores are properly typed with interfaces
- [ ] **Actions**: Complex state mutations use store actions
- [ ] **Getters**: Computed store values use getters
- [ ] **Store Integration**: Components properly integrate with stores
- [ ] **Store Usage**: Always create a store instance inside `setup()` or a composable (e.g., `const teamStore = useTeamStore()`) and access state, getters, and actions via that instance (e.g., `teamStore.currentTeamId`). Do not access store state directly at the top-level of a module.

### Testing Requirements

- [ ] **Test Coverage**: Minimum 80% code coverage for new components
- [ ] **Test Structure**: Tests are organized in logical describe blocks
- [ ] **Data-Test Usage**: Tests use data-test attributes for element selection
- [ ] **Async Testing**: Proper handling of async operations in tests
- [ ] **Error Testing**: Both success and error scenarios are tested
- [ ] **Mock Management**: Proper mock setup and cleanup
- [ ] **Accessibility Testing**: ARIA attributes and keyboard navigation tested

### Performance Optimization

- [ ] **Reactivity Optimization**: Appropriate use of `shallowRef`, `markRaw` where needed
- [ ] **Code Splitting**: Dynamic imports for route-based splitting where applicable
- [ ] **Bundle Optimization**: No unnecessary dependencies included
- [ ] **Memory Leaks**: Proper cleanup in `onUnmounted` hooks

### Security Considerations

- [ ] **Input Validation**: All user inputs are validated on both client and server
- [ ] **Address Validation**: Ethereum addresses are properly validated
- [ ] **Contract Security**: Smart contract interactions include proper access control checks
- [ ] **Data Sanitization**: User data is sanitized before display
- [ ] **Error Information**: Sensitive information is not exposed in error messages

### Accessibility (a11y)

- [ ] **ARIA Labels**: Proper ARIA labels for interactive elements
- [ ] **Keyboard Navigation**: Full keyboard navigation support
- [ ] **Semantic HTML**: Uses semantic HTML elements where appropriate
- [ ] **Color Contrast**: Sufficient color contrast ratios
- [ ] **Screen Reader Support**: Proper heading hierarchy and alternative text

### Error Handling

- [ ] **Toast Notifications**: User-friendly error messages with toast notifications
- [ ] **Console Logging**: Detailed error logging for debugging
- [ ] **Fallback Behavior**: Graceful degradation when errors occur
- [ ] **Network Errors**: Proper handling of network connectivity issues
- [ ] **Form Validation**: Real-time validation with clear error messages

### Documentation

- [ ] **Code Comments**: Complex business logic is documented with JSDoc
- [ ] **API Documentation**: New API endpoints are documented
- [ ] **Component Documentation**: Component props and usage are documented
- [ ] **Environment Variables**: New environment variables are documented

## Component-Specific Checklists

### Form Components

- [ ] **Form Validation**: Real-time validation with computed properties
- [ ] **Error Display**: Clear error messages for each field
- [ ] **Submit Handling**: Proper form submission with loading states
- [ ] **Reset Functionality**: Form can be reset after submission
- [ ] **Accessibility**: Proper labels and ARIA attributes for form fields

### Modal Components

- [ ] **Focus Management**: Proper focus trapping and restoration
- [ ] **Escape Key**: Modal closes with Escape key
- [ ] **Click Outside**: Modal closes when clicking outside
- [ ] **Backdrop**: Proper backdrop behavior
- [ ] **State Cleanup**: Modal state is cleaned up on close

### Data Display Components

- [ ] **Loading States**: Skeleton loaders during data fetching
- [ ] **Empty States**: Proper handling of empty data
- [ ] **Error States**: User-friendly error display
- [ ] **Pagination**: Efficient pagination for large datasets
- [ ] **Sorting/Filtering**: Proper implementation if applicable

### Navigation Components

- [ ] **Active States**: Current route/selection is highlighted
- [ ] **Keyboard Navigation**: Arrow keys and tab navigation work
- [ ] **ARIA Roles**: Proper navigation roles and states
- [ ] **Mobile Responsiveness**: Works well on mobile devices

## Web3-Specific Checklist

### Contract Interactions

- [ ] **Contract Addresses**: All contract addresses are validated
- [ ] **ABI Validation**: Contract ABIs are properly imported and typed
- [ ] **Function Calls**: Proper function name and parameter validation
- [ ] **Event Handling**: Contract events are properly handled
- [ ] **Gas Estimation**: Gas limits are estimated when needed

### Transaction Handling

- [ ] **Transaction Receipts**: Transaction confirmations are awaited
- [ ] **Error Classification**: Different error types are handled appropriately
- [ ] **User Feedback**: Clear feedback for transaction states
- [ ] **Transaction History**: Transactions are logged/tracked appropriately

### Wallet Integration

- [ ] **Connection States**: Wallet connection states are handled
- [ ] **Network Switching**: Network changes are detected and handled
- [ ] **Account Changes**: Account switching is properly handled
- [ ] **Disconnection**: Wallet disconnection scenarios are handled

## Testing Checklist

### Component Tests

- [ ] **Rendering Tests**: Component renders correctly with different props
- [ ] **Interaction Tests**: User interactions (clicks, keyboard) work correctly
- [ ] **Event Tests**: Component emits correct events with proper payloads
- [ ] **State Tests**: Component state changes are properly tested
- [ ] **Error Tests**: Error scenarios and fallbacks are tested

### Integration Tests

- [ ] **Store Integration**: Component-store interactions work correctly
- [ ] **API Integration**: API calls and responses are properly tested
- [ ] **Route Integration**: Navigation and route changes work correctly

### E2E Tests

- [ ] **User Journeys**: Critical user flows are tested end-to-end
- [ ] **Cross-Browser**: Tests pass on different browsers
- [ ] **Mobile Testing**: Critical flows work on mobile devices

## Performance Checklist

### Bundle Size

- [ ] **Import Analysis**: Only necessary parts of libraries are imported
- [ ] **Tree Shaking**: Unused code is eliminated
- [ ] **Dynamic Imports**: Heavy components are lazy-loaded
- [ ] **Asset Optimization**: Images and assets are optimized

### Runtime Performance

- [ ] **Reactivity**: No unnecessary reactive operations
- [ ] **Watchers**: Watchers are used appropriately and cleaned up
- [ ] **Memory Usage**: No memory leaks from event listeners or intervals
- [ ] **Rendering**: No unnecessary re-renders

## Security Checklist

### Input Validation

- [ ] **Client Validation**: All inputs are validated on the client
- [ ] **Server Validation**: All inputs are validated on the server
- [ ] **XSS Prevention**: User inputs are properly sanitized
- [ ] **Injection Prevention**: SQL/NoSQL injection is prevented

### Authentication & Authorization

- [ ] **Auth Checks**: Proper authentication checks are in place
- [ ] **Role Validation**: User roles and permissions are validated
- [ ] **Token Handling**: Authentication tokens are securely handled
- [ ] **Session Management**: User sessions are properly managed

### Smart Contract Security

- [ ] **Access Control**: Contract functions have proper access control
- [ ] **Input Validation**: Contract inputs are validated
- [ ] **Reentrancy**: Protection against reentrancy attacks
- [ ] **Integer Overflow**: Protection against overflow/underflow

## Final Review Items

### Code Organization

- [ ] **File Structure**: Files are organized logically
- [ ] **Naming Conventions**: Consistent naming throughout
- [ ] **Code Duplication**: No unnecessary code duplication
- [ ] **Separation of Concerns**: Clear separation between different concerns

### Git and Version Control

- [ ] **Commit Messages**: Follow conventional commit format
- [ ] **Branch Naming**: Descriptive branch names
- [ ] **Pull Request**: Clear PR description with context
- [ ] **Conflicts**: No merge conflicts

### Deployment Readiness

- [ ] **Environment Variables**: All required environment variables are documented
- [ ] **Build Process**: Code builds successfully for production
- [ ] **Database Migrations**: Database changes are properly migrated
- [ ] **Configuration**: Production configuration is correct

## Post-Review Actions

After receiving review feedback:

- [ ] **Address Feedback**: All review comments are addressed
- [ ] **Update Tests**: Tests are updated if implementation changes
- [ ] **Update Documentation**: Documentation reflects any changes
- [ ] **Re-test**: All tests pass after changes
- [ ] **Final Verification**: Changes work as expected in development environment

## Common Issues to Watch For

### TypeScript Issues

- Avoid `any` types
- Properly type all function parameters and return values
- Use type guards for runtime type checking
- Define interfaces for all data structures

### Vue.js Issues

- Don't mutate props directly
- Avoid deep watching unless necessary
- Clean up event listeners in `onUnmounted`
- Use proper key attributes in `v-for` loops

### Web3 Issues

- Always validate addresses before use
- Handle all possible error scenarios
- Don't assume wallet is always connected
- Properly handle network switches

### Performance Issues

- Avoid unnecessary computations in templates
- Use `v-memo` for expensive list rendering
- Implement proper caching for API calls
- Optimize component re-renders

### Security Issues

- Validate all user inputs
- Sanitize data before display
- Use proper HTTPS in production
- Implement proper rate limiting

This checklist ensures comprehensive code quality and helps maintain the high standards expected in the CNC Portal project.
