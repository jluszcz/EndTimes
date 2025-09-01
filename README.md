# EndTimes

A secure web application that calculates when your movie will end, including buffer time for previews and credits. Built on Cloudflare Workers with Auth0 authentication.

## Features

- **🔐 Secure Authentication**: Auth0 integration with JWT verification
- **🎬 Movie Search**: Searches The Movie Database (TMDB) for movies by title
- **🎯 Smart Matching**: Finds the closest match prioritizing recent releases  
- **⏰ Time Calculation**: Calculates end time based on start time + trailer duration + runtime
- **📱 Responsive Design**: Works on both mobile and desktop devices
- **🎭 Trailer Duration**: Configurable trailer time from 0-30 minutes (defaults to 20)
- **🔗 URL Parameters**: Shareable/bookmarkable searches with automatic form pre-filling
- **⚡ Edge Computing**: Powered by Cloudflare Workers for global performance

## Architecture

- **Frontend**: Vanilla HTML5, CSS3, JavaScript (ES6+)
- **Backend**: Cloudflare Workers (serverless JavaScript runtime)
- **Authentication**: Auth0 with JWT verification and secure credential handling
- **API**: The Movie Database (TMDB) integration via protected endpoints
- **Security**: CORS validation, rate limiting, error sanitization, JWKS caching

## Setup

### Prerequisites
- Node.js and npm
- Cloudflare account with Workers access
- Auth0 account and application
- TMDB API key

### 1. Get Required API Keys

**TMDB API Key**:
- Visit [The Movie Database](https://www.themoviedb.org/settings/api)
- Create an account and request an API key

**Auth0 Setup**:
- Create an Auth0 account and application
- Configure your Auth0 application:
  - Application Type: Single Page Application
  - Allowed Callback URLs: `https://your-domain.workers.dev`
  - Allowed Web Origins: `https://your-domain.workers.dev`
  - Allowed Logout URLs: `https://your-domain.workers.dev`

### 2. Install Dependencies
```bash
npm install
```

### 3. Configure Environment Variables
Set up your secrets using Wrangler:

```bash
# TMDB API key
npx wrangler secret put TMDB_API_KEY

# Auth0 configuration
npx wrangler secret put AUTH0_DOMAIN
npx wrangler secret put AUTH0_CLIENT_ID  
npx wrangler secret put AUTH0_AUDIENCE
```

For local development, create a `.dev.vars` file:
```bash
TMDB_API_KEY="your_tmdb_api_key"
ENVIRONMENT="development"
AUTH0_DOMAIN="your-auth0-domain.auth0.com"
AUTH0_CLIENT_ID="your_auth0_client_id"
AUTH0_AUDIENCE="https://your-domain.workers.dev"
```

### 4. Development
```bash
npm run dev
# Server runs on http://localhost:8787
```

### 5. Deployment
```bash
npm run deploy
```

## Usage

### Getting Started
1. **Authentication**: Click "Log In" to authenticate with Auth0
2. **Movie Search**: Enter a movie title in the search field
3. **Set Time**: Choose your desired start time using the time picker
4. **Configure Duration**: Select trailer duration from the dropdown (defaults to 20 minutes)
5. **Calculate**: Click "Go" to search and calculate times
6. **View Results**: See the estimated start time and end time for the movie

### URL Parameters
You can pre-fill the form and auto-search using URL parameters:

**Available parameters:**
- `movie` - Movie title to search for
- `time` - Start time in HH:MM format (e.g., "19:30")
- `buffer` - Trailer duration in minutes (0, 5, 10, 15, 20, 25, or 30)
- `auto` - Set to "true" to automatically search on page load

**Examples:**
```
index.html?movie=Dune&time=20:00&buffer=25
index.html?movie=Oppenheimer&time=19:30&buffer=20&auto=true
```

After searching, the URL automatically updates so you can bookmark or share your searches.

## How It Works

### Application Flow
1. **Authentication**: Secure login via Auth0 with JWT token management
2. **Configuration**: Auth0 settings dynamically loaded from secure API endpoint
3. **Movie Search**: Protected API calls to TMDB with rate limiting and CORS validation
4. **Data Processing**: Calculate start/end times with trailer duration buffering
5. **URL Management**: Automatic URL updating for bookmarking and sharing
6. **Responsive UI**: Clean, mobile-first interface with loading states

### Security Features
- **🔐 JWT Verification**: Full Auth0 token validation with JWKS caching
- **🛡️ CORS Protection**: Origin validation against configured allowlist
- **⚡ Rate Limiting**: 100 requests per minute per IP for authentication endpoints  
- **🔒 Error Sanitization**: Environment-aware error handling prevents information leakage
- **🚫 Input Validation**: Robust frontend parameter validation and type checking
- **🔑 Secure Configuration**: No hardcoded credentials, all secrets via environment variables

## API Endpoints

All API endpoints require authentication via Auth0 JWT tokens.

- `GET /api/config/auth0` - Public endpoint returning Auth0 configuration
- `GET /api/search?query={title}` - Search movies by title (protected)
- `GET /api/movie/{id}` - Get movie details by ID (protected)  
- `GET /api/user` - Get authenticated user information (protected)

### Rate Limits
- Authentication endpoints: 100 requests per minute per IP
- CORS validation: Configured allowlist with regex pattern support
- JWKS caching: 5-minute TTL with stale fallback

## Development

### File Structure
```
├── public/              # Static frontend assets
│   ├── index.html      # Main application interface  
│   ├── auth.js         # Auth0 authentication client
│   ├── script.js       # Application logic and API client
│   └── styles.css      # Responsive styling
├── src/
│   └── index.js        # Cloudflare Worker with API routes
├── wrangler.toml       # Cloudflare Workers configuration
└── package.json        # Dependencies and scripts
```

### Security Considerations
- All secrets stored as Wrangler environment variables
- CORS origins validated against production/development allowlist
- JWT tokens verified against Auth0 JWKS with caching
- Error messages sanitized to prevent information leakage
- Rate limiting prevents authentication abuse

## Attribution

This application uses TMDB and the TMDB APIs but is not endorsed, certified, or otherwise approved by TMDB.

Data and images are provided by [The Movie Database (TMDB)](https://www.themoviedb.org/).

Authentication powered by [Auth0](https://auth0.com/). Hosted on [Cloudflare Workers](https://workers.cloudflare.com/).