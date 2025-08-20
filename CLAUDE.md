# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**EndTimes** is a web application that calculates movie end times including trailer/preview duration. Built as a Cloudflare Workers application with static frontend assets and serverless API backend for TMDB integration.

## Repository Structure

- `public/` - Static frontend assets
  - `index.html` - Main application interface
  - `styles.css` - Responsive styling with blue/grey theme  
  - `script.js` - Frontend functionality and API client
- `src/` - Cloudflare Workers backend
  - `index.js` - Worker handler with API routes and static asset serving
- `wrangler.toml` - Cloudflare Workers configuration
- `package.json` - Project dependencies and scripts
- `README.md` - User documentation and setup instructions
- `LICENSE` - MIT License (Copyright 2025 Jacob Luszcz)

## Technology Stack

- **Backend**: Cloudflare Workers (JavaScript runtime)
- **Frontend**: Vanilla HTML5, CSS3, JavaScript (ES6+)  
- **API**: The Movie Database (TMDB) for movie data
- **Styling**: CSS Grid, Flexbox, CSS custom properties
- **Build Tools**: Wrangler (Cloudflare Workers CLI)
- **Deployment**: Cloudflare Workers platform

## Development Setup

### Prerequisites
- Node.js and npm
- TMDB API key (free from themoviedb.org)
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
3. Start development server:
   ```bash
   npm run dev
   ```

## Architecture Notes

### Backend (Cloudflare Workers)
- **Worker Handler** (`src/index.js`) - Main request router and API handler
- **Static Asset Serving** - Serves frontend files from `public/` directory
- **API Routes** - `/api/search` and `/api/movie/{id}` for TMDB integration
- **CORS Support** - Handles cross-origin requests with proper headers
- **Environment Variables** - Secure TMDB API key storage via Wrangler secrets

### Frontend Components  
- **MovieEndTimeCalculator class** - Main application controller
- **API Client** - Communicates with Worker API routes (not direct TMDB)
- **URL parameter support** - Shareable/bookmarkable searches
- **Responsive design** - Mobile-first CSS approach

### Key Features
- Movie search with smart matching (prioritizes recent releases)
- Time calculation (start time + trailer duration + runtime)  
- URL parameter pre-filling and updating
- Error handling and loading states
- Mobile and desktop responsive design
- Serverless deployment with edge computing benefits

## Development Workflow

### Making Changes
1. Start development server with `npm run dev`
2. Test changes locally (Wrangler serves on localhost)
3. Ensure responsive design works on mobile  
4. Verify API integration through Worker routes
5. Deploy with `npm run deploy` when ready

### Code Style
- Modern JavaScript (ES6+ features)
- CSS custom properties for theming
- Semantic HTML structure
- Progressive enhancement approach
- Serverless-first API design