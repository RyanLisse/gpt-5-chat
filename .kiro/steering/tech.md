# Technology Stack

## Package Manager
- **Bun**: Primary package manager and runtime (bun@1.1.34)

## Frontend Framework
- **Next.js 15**: App Router with React Server Components
- **React 19 RC**: Latest React with concurrent features
- **TypeScript 5.8.3**: Full type safety throughout the application

## Styling & UI
- **Tailwind CSS**: Utility-first CSS framework with custom design system
- **Radix UI**: Accessible component primitives
- **shadcn/ui**: Pre-built component library based on Radix UI
- **Framer Motion**: Animations and transitions
- **next-themes**: Dark/light theme support
- **Geist Font**: Primary font family (sans and mono variants)

## Backend & API
- **tRPC**: End-to-end typesafe APIs with React Query integration
- **Vercel AI SDK v5**: Unified AI provider integration
- **NextAuth.js v5 Beta**: Authentication with multiple providers
- **Drizzle ORM**: Type-safe database operations
- **PostgreSQL**: Primary database
- **Redis/Upstash**: Caching and real-time features

## AI Integration
- **AI SDK Gateway**: Multi-provider AI access with fallbacks
- **Supported Providers**: OpenAI, Anthropic, Google, xAI
- **E2B Code Interpreter**: Code execution capabilities
- **Firecrawl**: Web scraping and document processing

## Development Tools
- **Biome**: Linting and formatting (replaces ESLint + Prettier)
- **Playwright**: End-to-end testing
- **Vitest**: Unit testing
- **Storybook**: Component development and documentation
- **Drizzle Kit**: Database migrations and management

## Common Commands

### Development
```bash
bun dev              # Start development server with Turbo
bun build            # Build for production (includes DB migration)
bun start            # Start production server
```

### Code Quality
```bash
bun lint             # Run linting with auto-fix
bun format           # Format code with Biome
bun test:types       # Type checking
```

### Database
```bash
bun db:generate      # Generate migration files
bun db:migrate       # Run database migrations
bun db:studio        # Open Drizzle Studio
bun db:push          # Push schema changes to DB
```

### Testing
```bash
bun test             # Run Playwright e2e tests
bun test:unit        # Run unit tests with Vitest
```

### Storybook
```bash
bun storybook        # Start Storybook dev server
bun build:storybook  # Build Storybook for production
```

## Key Configuration Files
- `biome.jsonc`: Code formatting and linting rules
- `drizzle.config.ts`: Database configuration
- `next.config.ts`: Next.js configuration with PPR enabled
- `tailwind.config.ts`: Design system and custom animations
- `components.json`: shadcn/ui configuration