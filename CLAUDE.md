# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Liturgical music management system (partituras/scores) for church repertoires. Full-stack monorepo: ASP.NET Core 9 backend + Next.js 14 frontend + shared `core/` git submodule.

## Commands

### Backend (C# / .NET 9)
```bash
dotnet restore                              # Install dependencies
dotnet run                                  # Dev server on :5000
dotnet watch run                            # Dev server with hot reload
cd backend.tests && dotnet test --configuration Release  # Run all tests
```

### Frontend (Next.js 14 + TypeScript)
```bash
cd frontend
npm install
npm run dev          # Dev server on :3000
npm run build        # Production build (includes type-check)
npm run lint         # ESLint
npm run type-check   # TypeScript validation only
npm test             # Vitest unit tests
npm run test:e2e     # Playwright E2E tests
```

### Full stack (Windows)
```bash
./start-dev.ps1      # Orchestrates Docker + backend + frontend
```

Default credentials: `admin` / `admin123`  
API Swagger: http://localhost:5000/swagger  
Frontend: http://localhost:3000

## Architecture

### Stack
- **Backend**: ASP.NET Core 9 → PostgreSQL (port 5433) via Entity Framework Core + Pomelo
- **Frontend**: Next.js 14 (App Router) + React 18 + TypeScript + Tailwind CSS + shadcn/ui
- **Shared**: `core/` git submodule — provides Core.Auth (RBAC sessions), Core.FileManagement (PDF dedup), Core.Infrastructure (DB, SSE)

### Key concepts
- **Multi-tenancy**: workspace-centric data hierarchy; default workspace "Igreja" is seeded
- **RBAC roles**: `viewer`, `editor`, `uploader`, `admin` — enforced in Core.Auth
- **Migrations**: SQL scripts in `backend/Migrations/` run automatically at startup via `IMigrationService.RunMigrationsAsync()`; scripts are idempotent (`001_add_slug_columns.sql` through `011_create_alert_configurations.sql`)
- **PDF pipeline**: upload → dedup (hash-based in Core.FileManagement) → merge via PdfSharpCore (backend) + pdf-lib (frontend), 50 MB limit
- **Data model**: `AppDbContext` — workspaces → pdf_files, categories, artists, merge_lists, custom_filter_groups, audit_logs, system_metrics; N:N junctions for files↔categories and files↔artists

### Frontend structure
- `app/` — Next.js App Router pages and layouts
- `components/` — React components (heavy use of shadcn/ui + Radix UI)
- `lib/` — API client, auth context, utilities
- State: TanStack Query for server state, React Context for auth
- Forms: React Hook Form + Zod

### CI/CD
GitHub Actions: `test.yml` (runs dotnet tests + frontend build) and `docker-deploy.yml` (SSH deploy to homelab via Cloudflare Tunnel).

---

# Behavioral Guidelines

Behavioral guidelines to reduce common LLM coding mistakes. Merge with project-specific instructions as needed.

**Tradeoff:** These guidelines bias toward caution over speed. For trivial tasks, use judgment.

## 1. Think Before Coding

**Don't assume. Don't hide confusion. Surface tradeoffs.**

Before implementing:
- State your assumptions explicitly. If uncertain, ask.
- If multiple interpretations exist, present them - don't pick silently.
- If a simpler approach exists, say so. Push back when warranted.
- If something is unclear, stop. Name what's confusing. Ask.

## 2. Simplicity First

**Minimum code that solves the problem. Nothing speculative.**

- No features beyond what was asked.
- No abstractions for single-use code.
- No "flexibility" or "configurability" that wasn't requested.
- No error handling for impossible scenarios.
- If you write 200 lines and it could be 50, rewrite it.

Ask yourself: "Would a senior engineer say this is overcomplicated?" If yes, simplify.

## 3. Surgical Changes

**Touch only what you must. Clean up only your own mess.**

When editing existing code:
- Don't "improve" adjacent code, comments, or formatting.
- Don't refactor things that aren't broken.
- Match existing style, even if you'd do it differently.
- If you notice unrelated dead code, mention it - don't delete it.

When your changes create orphans:
- Remove imports/variables/functions that YOUR changes made unused.
- Don't remove pre-existing dead code unless asked.

The test: Every changed line should trace directly to the user's request.

## 4. Goal-Driven Execution

**Define success criteria. Loop until verified.**

Transform tasks into verifiable goals:
- "Add validation" → "Write tests for invalid inputs, then make them pass"
- "Fix the bug" → "Write a test that reproduces it, then make it pass"
- "Refactor X" → "Ensure tests pass before and after"

For multi-step tasks, state a brief plan:
```
1. [Step] → verify: [check]
2. [Step] → verify: [check]
3. [Step] → verify: [check]
```

Strong success criteria let you loop independently. Weak criteria ("make it work") require constant clarification.

---

**These guidelines are working if:** fewer unnecessary changes in diffs, fewer rewrites due to overcomplication, and clarifying questions come before implementation rather than after mistakes.
