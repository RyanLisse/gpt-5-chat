# Suggested Commands for Sparka AI Development

## Development Commands
- `bun dev` - Start development server
- `bun build` - Build for production
- `bun start` - Start production server

## Testing Commands
- `bun test` - Run all tests with Vitest
- `bun run test:watch` - Run tests in watch mode
- `bun run test:unit` - Run unit tests (excludes performance tests)
- `bun run test:fast` - Run fast tests (excludes performance and integration)
- `bun run test:e2e` - Run Playwright E2E tests
- `bun run test:types` - Run TypeScript type checking
- `bun run test:ci` - Run tests with coverage for CI
- `make test-all` - Run typecheck, lint, and test (comprehensive)

## Performance Testing
- `bun run test:perf` - Run performance tests
- `bun run test:perf:db` - Run database performance tests
- `bun run test:perf:memory` - Run memory performance tests
- `bun run test:perf:chat` - Run chat performance tests

## Code Quality Commands
- `bun run lint` - Run Biome linter with auto-fix
- `bun run format` - Format code with Biome
- `bun run quality:check` - Run qlty quality checks
- `bun run quality:fix` - Auto-fix quality issues
- `bun run legacy:ultracite:check` - Run Ultracite linting
- `bun run legacy:ultracite:fix` - Auto-fix with Ultracite

## Database Commands
- `bun run db:migrate` - Run database migrations
- `bun run db:generate` - Generate Drizzle schema
- `bun run db:studio` - Open Drizzle Studio
- `bun run db:push` - Push schema changes
- `bun run db:pull` - Pull schema from database

## System Commands (Darwin/macOS)
- `ls -la` - List files with details
- `find . -name "*.ts" -type f` - Find TypeScript files
- `grep -r "pattern" .` - Search for patterns in files
- `git status` - Check git status
- `git log --oneline` - View commit history