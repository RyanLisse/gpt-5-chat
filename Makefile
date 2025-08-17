# GPT-5 Chat Development Makefile
# Provides convenient commands for development workflow

# Default values
PORT ?= 3000
DB_PORT ?= 5432
REDIS_PORT ?= 6379

# Colors for output
GREEN := \033[32m
YELLOW := \033[33m
RED := \033[31m
BLUE := \033[34m
RESET := \033[0m

.PHONY: help dev build start test lint format clean kill-ports db-setup db-migrate db-reset install deps analyze perf

# Default target
.DEFAULT_GOAL := help

help: ## Show this help message
	@echo "$(BLUE)GPT-5 Chat Development Commands$(RESET)"
	@echo ""
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | sort | awk 'BEGIN {FS = ":.*?## "}; {printf "$(GREEN)%-20s$(RESET) %s\n", $$1, $$2}'
	@echo ""
	@echo "$(YELLOW)Environment Variables:$(RESET)"
	@echo "  PORT=$(PORT)     - Development server port"
	@echo "  DB_PORT=$(DB_PORT)   - PostgreSQL port"
	@echo "  REDIS_PORT=$(REDIS_PORT) - Redis port"

# Kill processes on common ports
kill-ports: ## Kill processes running on development ports
	@echo "$(YELLOW)Killing processes on ports $(PORT), $(DB_PORT), $(REDIS_PORT)...$(RESET)"
	-@lsof -ti:$(PORT) | xargs kill -9 2>/dev/null || true
	-@lsof -ti:$(DB_PORT) | xargs kill -9 2>/dev/null || true
	-@lsof -ti:$(REDIS_PORT) | xargs kill -9 2>/dev/null || true
	-@pkill -f "next-server" 2>/dev/null || true
	-@pkill -f "node.*next" 2>/dev/null || true
	@echo "$(GREEN)Ports cleared$(RESET)"

# Development commands
dev: kill-ports ## Start development server (kills ports first)
	@echo "$(GREEN)Starting development server on port $(PORT)...$(RESET)"
	bun dev

dev-clean: kill-ports clean ## Clean rebuild and start development server
	@echo "$(GREEN)Clean development start...$(RESET)"
	rm -rf .next node_modules/.cache
	bun install
	bun dev

dev-turbo: kill-ports ## Start development server with Turbopack
	@echo "$(GREEN)Starting development server with Turbopack...$(RESET)"
	bun dev --turbo

# Build commands
build: ## Build for production
	@echo "$(YELLOW)Building for production...$(RESET)"
	bun run build

build-analyze: ## Build with bundle analysis
	@echo "$(YELLOW)Building with bundle analysis...$(RESET)"
	ANALYZE=true bun run build

start: kill-ports build ## Build and start production server
	@echo "$(GREEN)Starting production server...$(RESET)"
	bun start

# Package management
install: ## Install dependencies
	@echo "$(YELLOW)Installing dependencies...$(RESET)"
	bun install

deps: install ## Alias for install

deps-update: ## Update all dependencies
	@echo "$(YELLOW)Updating dependencies...$(RESET)"
	bun update

# Code quality
lint: ## Run linting
	@echo "$(YELLOW)Running linters...$(RESET)"
	bun run lint

lint-fix: ## Run linting with auto-fix
	@echo "$(YELLOW)Running linters with auto-fix...$(RESET)"
	bun run lint --fix

format: ## Format code
	@echo "$(YELLOW)Formatting code...$(RESET)"
	bun run format

typecheck: ## Run TypeScript type checking
	@echo "$(YELLOW)Running TypeScript type checking...$(RESET)"
	bun run test:types

# Testing
test: ## Run unit tests
	@echo "$(YELLOW)Running unit tests...$(RESET)"
	bun test

test-watch: ## Run tests in watch mode
	@echo "$(YELLOW)Running tests in watch mode...$(RESET)"
	bun test --watch

test-e2e: ## Run end-to-end tests
	@echo "$(YELLOW)Running E2E tests...$(RESET)"
	bun run test:e2e

test-all: typecheck lint test ## Run all tests and checks

# Database commands
db-setup: ## Set up local database
	@echo "$(YELLOW)Setting up local database...$(RESET)"
	@if ! command -v createdb >/dev/null 2>&1; then \
		echo "$(RED)PostgreSQL not installed. Please install PostgreSQL first.$(RESET)"; \
		exit 1; \
	fi
	-createdb gpt5chat 2>/dev/null || echo "Database already exists"
	@echo "$(GREEN)Database setup complete$(RESET)"

db-migrate: ## Run database migrations
	@echo "$(YELLOW)Running database migrations...$(RESET)"
	bun run db:migrate

db-generate: ## Generate new migration
	@echo "$(YELLOW)Generating database migration...$(RESET)"
	bun run db:generate

db-studio: ## Open database studio
	@echo "$(GREEN)Opening database studio...$(RESET)"
	bun run db:studio

db-reset: ## Reset database (WARNING: destroys data)
	@echo "$(RED)WARNING: This will destroy all database data!$(RESET)"
	@read -p "Are you sure? (y/N): " confirm && [ "$$confirm" = "y" ]
	-dropdb gpt5chat 2>/dev/null || true
	createdb gpt5chat
	bun run db:migrate
	@echo "$(GREEN)Database reset complete$(RESET)"

# Performance and analysis
analyze: ## Run bundle analysis
	@echo "$(YELLOW)Running bundle analysis...$(RESET)"
	bun run analyze

analyze-server: ## Analyze server bundle
	@echo "$(YELLOW)Analyzing server bundle...$(RESET)"
	bun run analyze:server

analyze-browser: ## Analyze browser bundle
	@echo "$(YELLOW)Analyzing browser bundle...$(RESET)"
	bun run analyze:browser

perf: ## Run performance audit
	@echo "$(YELLOW)Running performance audit...$(RESET)"
	bun run perf:audit

perf-report: ## Generate performance report
	@echo "$(YELLOW)Generating performance report...$(RESET)"
	bun run perf:report

# Cleanup commands
clean: ## Clean build artifacts and caches
	@echo "$(YELLOW)Cleaning build artifacts...$(RESET)"
	rm -rf .next
	rm -rf node_modules/.cache
	rm -rf .cache
	rm -rf dist
	rm -rf build
	@echo "$(GREEN)Clean complete$(RESET)"

clean-all: clean ## Clean everything including node_modules
	@echo "$(YELLOW)Cleaning everything...$(RESET)"
	rm -rf node_modules
	rm -rf bun.lockb
	@echo "$(GREEN)Deep clean complete$(RESET)"

# Utility commands
logs: ## Show application logs
	@echo "$(YELLOW)Showing recent logs...$(RESET)"
	@if [ -f "dev.log" ]; then tail -f dev.log; else echo "No log file found"; fi

status: ## Show development environment status
	@echo "$(BLUE)Development Environment Status$(RESET)"
	@echo ""
	@echo "$(YELLOW)Ports in use:$(RESET)"
	@lsof -i:$(PORT) -i:$(DB_PORT) -i:$(REDIS_PORT) 2>/dev/null || echo "No processes found on monitored ports"
	@echo ""
	@echo "$(YELLOW)Node.js processes:$(RESET)"
	@pgrep -fl node || echo "No Node.js processes found"
	@echo ""
	@echo "$(YELLOW)Environment files:$(RESET)"
	@ls -la .env* 2>/dev/null || echo "No environment files found"

deps-audit: ## Audit dependencies for security issues
	@echo "$(YELLOW)Auditing dependencies...$(RESET)"
	bun audit

# Docker commands (if using Docker)
docker-dev: ## Start development environment with Docker
	@echo "$(GREEN)Starting Docker development environment...$(RESET)"
	docker-compose -f docker-compose.dev.yml up

docker-down: ## Stop Docker development environment
	@echo "$(YELLOW)Stopping Docker development environment...$(RESET)"
	docker-compose -f docker-compose.dev.yml down

# Deployment helpers
deploy-check: test-all build ## Run all checks before deployment
	@echo "$(GREEN)All deployment checks passed!$(RESET)"

# Quick development workflow
quick: kill-ports ## Quick development start (most common workflow)
	@echo "$(GREEN)Quick development start...$(RESET)"
	bun dev

restart: kill-ports dev ## Restart development server

# Git helpers
git-clean: ## Clean git repository
	@echo "$(YELLOW)Cleaning git repository...$(RESET)"
	git clean -fd
	git reset --hard HEAD

# Health check
health: ## Check if all services are healthy
	@echo "$(BLUE)Health Check$(RESET)"
	@echo ""
	@echo "$(YELLOW)Checking development server...$(RESET)"
	@curl -sf http://localhost:$(PORT)/api/health >/dev/null && echo "$(GREEN)✓ Server healthy$(RESET)" || echo "$(RED)✗ Server not responding$(RESET)"
	@echo ""
	@echo "$(YELLOW)Checking database...$(RESET)"
	@pg_isready -p $(DB_PORT) >/dev/null 2>&1 && echo "$(GREEN)✓ Database healthy$(RESET)" || echo "$(RED)✗ Database not responding$(RESET)"

# Backup and restore
backup-db: ## Backup database
	@echo "$(YELLOW)Backing up database...$(RESET)"
	@mkdir -p backups
	pg_dump gpt5chat > backups/backup_$(shell date +%Y%m%d_%H%M%S).sql
	@echo "$(GREEN)Database backup complete$(RESET)"

# Environment setup
env-example: ## Create example environment file
	@echo "$(YELLOW)Creating .env.example...$(RESET)"
	@echo "# Database" > .env.example
	@echo "DATABASE_URL=postgresql://user:password@localhost:5432/gpt5chat" >> .env.example
	@echo "" >> .env.example
	@echo "# OpenAI" >> .env.example
	@echo "OPENAI_API_KEY=your_openai_api_key_here" >> .env.example
	@echo "" >> .env.example
	@echo "# Anthropic" >> .env.example
	@echo "ANTHROPIC_API_KEY=your_anthropic_api_key_here" >> .env.example
	@echo "" >> .env.example
	@echo "# Google AI" >> .env.example
	@echo "GOOGLE_GENERATIVE_AI_API_KEY=your_google_ai_api_key_here" >> .env.example
	@echo "" >> .env.example
	@echo "# NextAuth" >> .env.example
	@echo "NEXTAUTH_SECRET=your-secret-here" >> .env.example
	@echo "NEXTAUTH_URL=http://localhost:3000" >> .env.example
	@echo "" >> .env.example
	@echo "# Redis (optional)" >> .env.example
	@echo "REDIS_URL=redis://localhost:6379" >> .env.example
	@echo "" >> .env.example
	@echo "# Development" >> .env.example
	@echo "NODE_ENV=development" >> .env.example
	@echo "$(GREEN).env.example created$(RESET)"

# IDE integration
vscode: ## Open project in VS Code
	@code .

# Documentation
docs: ## Open documentation
	@echo "$(BLUE)Opening documentation...$(RESET)"
	@echo "Project documentation: README.md"
	@echo "Performance docs: PERFORMANCE_BASELINE.md"
	@echo "Bundle analysis docs: docs/bundle-analysis.md"

# Emergency commands
emergency-reset: kill-ports clean-all install db-reset ## Nuclear option: reset everything
	@echo "$(RED)Emergency reset complete. Starting fresh...$(RESET)"
	bun dev