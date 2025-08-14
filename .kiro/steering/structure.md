# Project Structure

## Root Directory Organization

### Application Code
- `app/` - Next.js App Router pages and API routes
- `components/` - Reusable React components
- `lib/` - Shared utilities, database, and business logic
- `hooks/` - Custom React hooks
- `providers/` - React context providers and model configurations
- `trpc/` - tRPC router definitions and client setup

### Configuration & Tooling
- `scripts/` - Build and utility scripts
- `tests/` - End-to-end and integration tests
- `.storybook/` - Storybook configuration
- `public/` - Static assets and images

## App Directory Structure (Next.js App Router)

### Route Groups
- `app/(auth)/` - Authentication-related pages and API routes
  - `login/`, `register/` - Auth pages
  - `api/auth/` - NextAuth.js API routes
- `app/(chat)/` - Main chat application
  - `chat/[id]/` - Individual chat pages
  - `share/[id]/` - Shared chat pages
  - `api/chat/` - Chat-related API endpoints
- `app/api/` - General API routes (tRPC, utilities)

### Key App Files
- `app/layout.tsx` - Root layout with providers and global styles
- `app/globals.css` - Global CSS and Tailwind imports
- `app/loading.tsx` - Global loading UI

## Components Organization

### UI Components (`components/ui/`)
- shadcn/ui components (button, dialog, input, etc.)
- Follows consistent naming: kebab-case files, PascalCase exports
- Each component exports both component and variants/types

### Feature Components (`components/`)
- Domain-specific components (chat, message, artifact, etc.)
- Organized by feature area when logical
- `components/ai-elements/` - AI-specific UI components
- `components/upgrade-cta/` - Upgrade and authentication CTAs

## Library Structure (`lib/`)

### Core Modules
- `lib/ai/` - AI provider integrations, tools, and utilities
- `lib/db/` - Database schema, queries, and migrations
- `lib/artifacts/` - Document and artifact handling
- `lib/credits/` - Credit system and reservations
- `lib/stores/` - Zustand state management
- `lib/utils/` - General utility functions

### AI Tools (`lib/ai/tools/`)
- Individual tool implementations (web-search, code-interpreter, etc.)
- `lib/ai/tools/deep-research/` - Complex research functionality
- `lib/ai/tools/steps/` - Multi-step tool implementations

## Database Structure (`lib/db/`)
- `schema.ts` - Drizzle schema definitions
- `queries.ts` - Reusable database queries
- `migrations/` - Database migration files (auto-generated)
- `client.ts` - Database connection setup

## tRPC Structure (`trpc/`)
- `init.ts` - tRPC initialization and middleware
- `routers/` - Individual router modules
- `react.tsx` - Client-side tRPC setup
- `server.tsx` - Server-side tRPC setup

## Naming Conventions

### Files and Directories
- **kebab-case** for file and directory names
- **PascalCase** for React component files when they export a single component
- **camelCase** for utility functions and non-component files

### Components
- Component files export the component as default
- Use named exports for related types, variants, or utilities
- Prefer function declarations over arrow functions for components

### Database
- **camelCase** for column names in schema
- **PascalCase** for table names
- Type exports follow pattern: `type TableName = InferSelectModel<typeof tableName>`

## Import Patterns

### Path Aliases
- `@/` - Root directory alias
- `@/components` - Components directory
- `@/lib` - Library directory
- `@/hooks` - Hooks directory

### Import Organization
1. External libraries (React, Next.js, etc.)
2. Internal imports (components, utils, types)
3. Relative imports
4. Type-only imports at the end

## Environment and Configuration
- `.env.local` - Local environment variables
- Configuration files use TypeScript when possible
- Feature flags and configuration in `lib/config.ts` and `lib/features-config.ts`