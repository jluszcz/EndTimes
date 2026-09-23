# AGENTS.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**EndTimes** is a web application that calculates movie end times including trailer/preview duration. Built as a Cloudflare Workers application with static frontend assets, serverless API backend for TMDB integration, and Cloudflare Access for authentication.

## Repository Structure

- `public/` - Static frontend assets
  - `index.html` - Main application interface, plus the inline anti-FOUC theme script
  - `styles.css` - Responsive styling; monochrome light/dark palette driven by `html[data-theme]`
  - `script.js` - Frontend functionality and API client
- `src/` - Cloudflare Workers backend
  - `index.js` - Simple API proxy for TMDB requests
- `test/` - Vitest suites, split by runtime (see Testing below)
  - `test/worker/` - Worker tests, run in workerd
  - `test/frontend/` - Frontend tests, run in happy-dom
- `vitest.config.mjs` - Two Vitest projects, one per runtime
- `eslint.config.mjs` - ESLint flat config
- `.github/workflows/` - Thin callers of the shared reusable workflows
- `wrangler.toml` - Cloudflare Workers configuration
- `package.json` - Project dependencies and scripts
- `README.md` - User documentation and setup instructions
- `LICENSE` - MIT License (Copyright 2025 Jacob Luszcz)

## Technology Stack

- **Backend**: Cloudflare Workers (JavaScript runtime)
- **Frontend**: Vanilla HTML5, CSS3, JavaScript (ES6+)
- **Authentication**: Cloudflare Access (zero-code, dashboard-configured)
- **API**: The Movie Database (TMDB) for movie data
- **Styling**: CSS Grid, Flexbox, CSS custom properties
- **Build Tools**: Wrangler (Cloudflare Workers CLI)
- **Testing**: Vitest (with `@cloudflare/vitest-pool-workers`)
- **Linting/Formatting**: ESLint (flat config) and Prettier
- **Deployment**: Cloudflare Workers platform

## Development Setup

### Prerequisites

- Node.js and npm
- TMDB API Read Access Token (free from themoviedb.org; the v4 Bearer token, stored in the `TMDB_READ_ACCESS_TOKEN` secret)
- Cloudflare account with Workers and Zero Trust access
- Wrangler CLI (installed as dev dependency)

### Configuration

1. Install dependencies:
   ```bash
   npm install
   ```
2. Set up your TMDB API Read Access Token in Wrangler:
   ```bash
   npx wrangler secret put TMDB_READ_ACCESS_TOKEN
   ```
3. Configure Cloudflare Access (see README.md for detailed steps)
4. Start development server:
   ```bash
   npm run dev
   ```

**Note**: Cloudflare Access only works in production. Local development bypasses authentication.

## Architecture Notes

### Authentication (Cloudflare Access)

- **Zero-code solution** - All authentication handled in Cloudflare dashboard
- **Edge-level protection** - Sits in front of Worker, no application code needed
- **Policy-based access** - Email allowlist configured via dashboard
- **Free tier** - Up to 50 users at no cost
- **No environment variables** - No secrets or configuration in code

### Backend (Cloudflare Workers)

- **Worker Handler** (`src/index.js`) - Minimal API proxy
- **Static Asset Serving** - Serves frontend files from `public/` directory
- **API Routes** - `/api/search` and `/api/movie/{id}` for TMDB integration
- **Protected by Access** - Authentication happens before requests reach Worker
- **Environment Variables** - Only TMDB read access token needed

### Frontend Components

- **MovieEndTimeCalculator class** - Main application controller
- **API Client** - Simple fetch() calls to Worker API routes
- **URL parameter support** - Shareable/bookmarkable searches
- **Responsive design** - Mobile-first CSS approach
- **No auth code** - Cloudflare Access handles all authentication
- **Light/dark theme** - three parts that have to stay in step: the anti-FOUC inline script in
  `public/index.html`, `initTheme()` in `public/script.js`, and the `html[data-theme=...]` blocks in
  `public/styles.css`. `#theme-btn` toggles it and the choice persists in `localStorage`

**Storage access is always guarded.** `localStorage` throws `SecurityError` outright in Safari private mode and
wherever site data is blocked — read _and_ write. `readStoredTheme`/`writeStoredTheme` swallow it, and the inline
script has its own `try`/`catch`. The bootstrap also constructs the calculator _before_ `initTheme()`, so a theme
failure can never leave the page inert. Don't reorder those two.

### Key Features

- Cloudflare Access authentication (dashboard-configured)
- Light/dark theme toggle, following the OS preference until the user overrides it
- Movie search with smart matching: an exact title match wins outright, and only then does the
  year heuristic break ties (TMDB orders by relevance, and sorting everything by year distance
  discarded that)
- Time calculation (start time + trailer duration + runtime)
- URL parameter pre-filling and updating
- Error handling and loading states
- Mobile and desktop responsive design
- Serverless deployment with edge computing benefits

## Development Workflow

### Making Changes

1. Start development server with `npm run dev`
2. Test changes locally (no authentication in dev mode)
3. Ensure responsive design works on mobile
4. Verify API integration through Worker routes
5. Deploy with `npm run deploy` when ready
6. Test authentication in production environment

### Validation

Run these before committing (they are also enforced in CI):

```bash
npm run build         # No-op here, but CI invokes it, so keep it passing
npm test              # Vitest unit tests
npm run lint          # ESLint (npm run lint:fix to auto-fix)
npm run format:check  # Prettier formatting check (npm run format to auto-fix)
```

Configuration lives in `.prettierrc.json` (Prettier), `eslint.config.mjs` (ESLint),
and `.pre-commit-config.yaml` (pre-commit hooks that run the same tools locally).

`npm run build` is a no-op echo. It exists only because the shared CI workflow calls it — don't delete it.

### Testing

`vitest.config.mjs` defines **two projects**, because the two halves of the app need different runtimes:

- `worker` — `test/worker/**`, running in workerd via `@cloudflare/vitest-pool-workers`, with a mock
  `TMDB_READ_ACCESS_TOKEN` binding.
- `frontend` — `test/frontend/**`, running in happy-dom, so `document` and `localStorage` exist.

Everything used to run in the workers pool, where there is no DOM, so the frontend suite could only import pure
helpers and the DOM half of `public/script.js` had no coverage at all. Put a test in the directory matching the
runtime it needs; ESLint grants browser globals to `test/frontend/**` for the same reason.

`public/script.js` exports its pure helpers _and_ `initTheme`/`MovieEndTimeCalculator` so tests can drive them, and
guards its bootstrap with `typeof document !== 'undefined'` so importing the module never starts the app.

`.github/workflows/ci.yml` is a thin caller of
`jluszcz/github-utils/.github/workflows/node-ci.yml` — the steps live in that shared workflow,
not in this repo. It installs with `npm ci` against the lockfile on Node 22, then runs
`npm run build`, `npm test`, `npm run lint`, and `npm run format:check`. Note `npm run build` is
part of the gate and was previously undocumented here.

The triggers are scoped to `main`: pushes to a feature branch do not run CI, only pushes to `main`
and pull requests targeting `main`. A commit must pass all the checks locally before it is
committed — don't rely on CI to catch formatting or lint issues after the fact.

### Code Style

- Modern JavaScript (ES6+ features)
- CSS custom properties for theming
- Semantic HTML structure
- Progressive enhancement approach
- Serverless-first API design
- Minimal backend code (authentication handled by platform)

## Cost Optimization

This application is designed to be **completely free** for single-user personal use:

- **Cloudflare Workers**: Free tier (100,000 requests/day)
- **Cloudflare Access**: Free tier (up to 50 users)
- **TMDB API**: Free tier (sufficient for personal use)

Total monthly cost: **$0**

## Adding Features

When adding new features:

- Frontend changes only require code updates
- Backend remains a simple TMDB API proxy
- Authentication is platform-level (no code changes needed)
- Adding users is done via Cloudflare dashboard only
