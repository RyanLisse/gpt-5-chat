# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Common Commands

### Development
```bash
# Start development server
bun dev

# Run database migrations
bun run db:migrate

# Build application (includes migration)
bun run build

# Start production server
bun start
```

### Linting & Formatting
```bash
# Lint and auto-fix with Biome + Next.js ESLint
bun run lint

# Format code with Biome
bun run format

# Type checking only
bun run test:types
```

### Testing
```bash
# Run unit tests with Vitest
bun test

# Run E2E tests with Playwright
bun run test:e2e

# Watch mode for unit tests
bun test --watch
```

### Database Operations
```bash
# Generate Drizzle schema migrations
bun run db:generate

# Push schema changes to database
bun run db:push

# View database with Drizzle Studio
bun run db:studio

# Pull schema from existing database
bun run db:pull
```

## Architecture Overview

### Core Structure
- **Next.js 15** app router with React Server Components
- **tRPC** for type-safe API routes with TanStack Query integration
- **Drizzle ORM** with PostgreSQL for data persistence
- **Vercel AI SDK v5** for multi-provider AI chat functionality
- **Zustand** for client-side state management

### Key Directories
- `app/` - Next.js app router pages and API routes
- `lib/db/` - Database schema (`schema.ts`) and queries (`queries.ts`)
- `trpc/` - tRPC routers and configuration
- `components/` - React components organized by feature
- `lib/ai/` - AI provider configuration and tools

### AI Chat Flow
1. User sends message via `app/(chat)/api/chat/route.ts`
2. Message processed by Vercel AI SDK with configured providers
3. AI tools defined in `lib/ai/tools/` can be invoked
4. Responses streamed back to client with resumable stream support

### Database Architecture
- Schema definitions in `lib/db/schema.ts` using Drizzle ORM
- All queries centralized in `lib/db/queries.ts`
- Migrations auto-generated via `bun run db:generate`
- Build process includes migration execution

### tRPC + TanStack Query Pattern
- Routers in `trpc/routers/*.router.ts` registered in `_app.ts`
- Frontend uses `useTRPC()` hook with TanStack Query integration
- All mutations should invalidate related queries
- Use `protectedProcedure` for authenticated routes

## Development Guidelines

### TypeScript Rules
- Avoid `any` types completely
- Use inline interfaces for function parameters
- Never create index barrel files (`index.ts`)
- Always use direct named imports

### Code Style (Biome Configuration)
- 2 spaces indentation
- Single quotes for strings
- Trailing commas required
- Line width: 80 characters
- Semicolons always required

### Authentication
- NextAuth.js v5 beta for authentication
- Auth configuration in `app/(auth)/auth.ts`
- Protected routes use tRPC `protectedProcedure`

### AI Provider Integration
- Multiple providers supported (OpenAI, Anthropic, Google, xAI)
- Provider configuration in `lib/ai/providers.ts`
- Model features defined in `lib/ai/model-features.ts`

### Testing Approach
- Unit tests with Vitest for utilities and components
- E2E tests with Playwright for user flows
- Type checking with `bun test:types` before builds
- No test framework assumptions - check existing test patterns

## Key Files to Understand
- `app/(chat)/api/chat/route.ts` - Main AI chat endpoint
- `lib/db/schema.ts` - Database table definitions
- `lib/db/queries.ts` - All database operations
- `trpc/routers/_app.ts` - Main tRPC router registration
- `lib/ai/tools/tools.ts` - AI tool definitions
- `components/chat.tsx` - Main chat interface component

## Environment Setup
- Uses Bun as package manager
- Requires PostgreSQL database
- Redis optional for scaling
- Environment variables configured in `.env.local`