# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**EndTimes** is a web application that calculates movie end times including trailer/preview duration. Built as a simple, responsive web app using vanilla HTML, CSS, and JavaScript with The Movie Database (TMDB) API integration.

## Repository Structure

- `index.html` - Main application interface
- `styles.css` - Responsive styling with blue/grey theme
- `script.js` - Core functionality and TMDB API integration
- `README.md` - User documentation and setup instructions
- `LICENSE` - MIT License (Copyright 2025 Jacob Luszcz)

## Technology Stack

- **Frontend**: Vanilla HTML5, CSS3, JavaScript (ES6+)
- **API**: The Movie Database (TMDB) for movie data
- **Styling**: CSS Grid, Flexbox, CSS custom properties
- **No build tools required** - runs directly in browser

## Development Setup

### Prerequisites
- TMDB API key (free from themoviedb.org)
- Modern web browser
- Optional: Local web server for development

### Configuration
1. Copy `config.json.example` to `config.json`
2. Add your TMDB API key to `config.json`:
   ```json
   {
     "tmdbApiKey": "your_actual_api_key_here"
   }
   ```
3. Open `index.html` in browser or serve locally

## Architecture Notes

### Core Components
- **MovieEndTimeCalculator class** - Main application controller
- **TMDB API integration** - Movie search and details fetching
- **URL parameter support** - Shareable/bookmarkable searches
- **Responsive design** - Mobile-first CSS approach

### Key Features
- Movie search with smart matching (prioritizes recent releases)
- Time calculation (start time + trailer duration + runtime)
- URL parameter pre-filling and updating
- Error handling and loading states
- Mobile and desktop responsive design

## Development Workflow

### Making Changes
1. Test changes in browser
2. Ensure responsive design works on mobile
3. Verify TMDB API integration still functions
4. Update documentation if adding new features

### Code Style
- Modern JavaScript (ES6+ features)
- CSS custom properties for theming
- Semantic HTML structure
- Progressive enhancement approach