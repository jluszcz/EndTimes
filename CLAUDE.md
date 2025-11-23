# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**EndTimes** is a web application that calculates movie end times including trailer/preview duration. Built as a Cloudflare Workers application with static frontend assets, serverless API backend for TMDB integration, and Cloudflare Access for authentication.

## Repository Structure

- `public/` - Static frontend assets
  - `index.html` - Main application interface
  - `styles.css` - Responsive styling with blue/grey theme
  - `script.js` - Frontend functionality and API client
- `src/` - Cloudflare Workers backend
  - `index.js` - Simple API proxy for TMDB requests
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
- **Deployment**: Cloudflare Workers platform

## Development Setup

### Prerequisites
- Node.js and npm
- TMDB API key (free from themoviedb.org)
- Cloudflare account with Workers and Zero Trust access
- Wrangler CLI (installed as dev dependency)

### Configuration
1. Install dependencies:
   ```bash
   npm install
   ```
2. Set up your TMDB API key in Wrangler:
   ```bash
   npx wrangler secret put TMDB_API_KEY
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
- **Worker Handler** (`src/index.js`) - Minimal API proxy (~105 lines)
- **Static Asset Serving** - Serves frontend files from `public/` directory
- **API Routes** - `/api/search` and `/api/movie/{id}` for TMDB integration
- **Protected by Access** - Authentication happens before requests reach Worker
- **Environment Variables** - Only TMDB API key needed

### Frontend Components
- **MovieEndTimeCalculator class** - Main application controller
- **API Client** - Simple fetch() calls to Worker API routes
- **URL parameter support** - Shareable/bookmarkable searches
- **Responsive design** - Mobile-first CSS approach
- **No auth code** - Cloudflare Access handles all authentication

### Key Features
- Cloudflare Access authentication (dashboard-configured)
- Movie search with smart matching (prioritizes recent releases)
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
