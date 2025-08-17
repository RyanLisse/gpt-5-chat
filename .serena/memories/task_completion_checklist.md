# Task Completion Checklist

When completing any development task in Sparka AI, ensure the following steps are completed:

## Code Quality Checks
1. **Linting**: Run `bun run lint` to check and auto-fix code style issues
2. **Type Checking**: Run `bun run test:types` to ensure TypeScript compilation
3. **Quality Checks**: Run `bun run quality:check` for additional quality metrics

## Testing Requirements
1. **Unit Tests**: Run `bun run test:unit` to verify core functionality
2. **Type Safety**: Ensure `bun run test:types` passes without errors
3. **Fast Tests**: Run `bun run test:fast` for quick validation
4. **Full Test Suite**: Run `make test-all` for comprehensive validation

## Performance Considerations
1. **Performance Tests**: Run relevant performance tests if touching performance-critical code
2. **Memory Tests**: Check memory usage patterns if modifying large data structures
3. **Database Performance**: Validate database query performance if modifying data layer

## Final Validation
1. **Build Check**: Ensure `bun build` completes successfully
2. **Development Server**: Verify `bun dev` starts without errors
3. **E2E Tests**: Run `bun run test:e2e` for critical user flows (if applicable)

## Git Workflow
1. **Commit Messages**: Use conventional commit format
2. **Branch Naming**: Use descriptive branch names
3. **Pre-commit Hooks**: Ensure lint-staged hooks pass

## Documentation
1. **Code Comments**: Add JSDoc comments for complex functions
2. **README Updates**: Update documentation if adding new features
3. **Type Definitions**: Ensure proper TypeScript types are defined