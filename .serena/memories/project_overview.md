# Sparka AI - Project Overview

## Purpose
Sparka AI is a multi-provider AI chat application that provides access to 70+ AI models including Claude, GPT-4, Gemini, and Grok through a unified interface. It's an open-source, production-ready chat application with advanced features like document analysis, image generation, and chat branching.

## Tech Stack
- **Frontend**: Next.js 15 (App Router), TypeScript, Tailwind CSS, Radix UI, Framer Motion, Zustand
- **Backend**: Vercel AI SDK, tRPC, Drizzle ORM, PostgreSQL, Redis
- **AI Integration**: AI SDK v5, AI SDK Gateway with multiple provider support
- **Testing**: Vitest, Playwright for E2E
- **Linting**: Biome, Ultracite
- **Package Manager**: Bun

## Key Features
- Multi-model chat with 70+ AI models
- Authentication & sync
- Attachment support (images, PDFs, documents)
- AI-powered image generation
- Syntax highlighting
- Resumable streams
- Chat branching and sharing
- Document creation

## Runtime Requirements
- Node.js 18+ or Bun
- PostgreSQL database
- Redis (optional, for scaling)
- Uses modern array helpers (Array.prototype.at, Array.prototype.findLast)