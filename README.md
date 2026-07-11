# EndTimes

A web application that calculates when your movie will end, including buffer time for previews and credits. Built on Cloudflare Workers with Cloudflare Access authentication.

## Features

- **🔐 Secure Authentication**: Cloudflare Access with email or OAuth login
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
- **Authentication**: Cloudflare Access (zero-code authentication)
- **API**: The Movie Database (TMDB) integration via protected endpoints

## Setup

### Prerequisites

- Node.js and npm
- Cloudflare account with Workers access
- TMDB API Read Access Token

### 1. Get TMDB API Read Access Token

Visit [The Movie Database](https://www.themoviedb.org/settings/api) and:

- Create an account
- Request API access (free)
- Copy the **API Read Access Token** (the long v4 token, not the v3 API key) — it is sent as a Bearer header

### 2. Install Dependencies

```bash
npm install
```

### 3. Configure TMDB API Read Access Token

Store the token in the `TMDB_READ_ACCESS_TOKEN` secret using Wrangler:

```bash
npx wrangler secret put TMDB_READ_ACCESS_TOKEN
```

For local development, create a `.dev.vars` file:

```bash
TMDB_READ_ACCESS_TOKEN="your_tmdb_api_read_access_token"
```

### 4. Configure Cloudflare Access

Cloudflare Access handles all authentication - no code required!

1. **Navigate to Zero Trust** in your Cloudflare Dashboard
2. **Go to Access → Applications → Add an application**
3. **Choose "Self-hosted"**
4. **Configure Application:**
   - **Name**: EndTimes
   - **Session Duration**: 24 hours (or your preference)
   - **Application domain**: Your Workers domain (e.g., `end-times.your-subdomain.workers.dev`)
   - **Path**: Leave empty to protect entire application

5. **Add a Policy:**
   - **Policy name**: "Owner Access"
   - **Action**: Allow
   - **Configure rules**:
     - Rule type: **Emails**
     - Value: Your email address

6. **Save**

That's it! Access will now require login before anyone can reach your application.

### 5. Development

```bash
npm run dev
# Server runs on http://localhost:8787
```

**Note**: Cloudflare Access doesn't run in local development. To test locally without auth, temporarily comment out the Access application in your dashboard or test authentication features only in production.

### 6. Deployment

```bash
npm run deploy
```

After deployment, visit your Workers URL. Cloudflare Access will prompt you to log in before accessing the application.

## Usage

### Getting Started

1. **Authentication**: Visit your app URL - Cloudflare Access will prompt for login
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
?movie=Dune&time=20:00&buffer=25
?movie=Oppenheimer&time=19:30&buffer=20&auto=true
```

After searching, the URL automatically updates so you can bookmark or share your searches.

## How It Works

1. **Authentication**: Cloudflare Access sits in front of your Worker and handles all authentication
2. **Protected Access**: Only authenticated users can reach your application
3. **Movie Search**: API calls to TMDB via your Worker's API proxy
4. **Data Processing**: Calculate start/end times with trailer duration buffering
5. **URL Management**: Automatic URL updating for bookmarking and sharing

## API Endpoints

All API endpoints are automatically protected by Cloudflare Access.

- `GET /api/search?query={title}` - Search movies by title
- `GET /api/movie/{id}` - Get movie details by ID

## Development

### Code Quality

Formatting and linting are enforced in CI (see `.github/workflows/ci.yml`) and available locally:

```bash
npm run format        # Format all files with Prettier
npm run format:check  # Check formatting without writing (CI uses this)
npm run lint          # Lint JavaScript with ESLint
npm run lint:fix      # Lint and auto-fix where possible
npm test              # Run the unit test suite (Vitest)
```

- **Prettier** handles formatting (config in `.prettierrc.json`, ignores in `.prettierignore`).
- **ESLint** handles linting (flat config in `eslint.config.mjs`).
- These checks also run via [pre-commit](https://pre-commit.com/) hooks (`.pre-commit-config.yaml`); install them with `pre-commit install`.

### File Structure

```
├── public/              # Static frontend assets
│   ├── index.html      # Main application interface
│   ├── script.js       # Application logic and API client
│   └── styles.css      # Responsive styling
├── src/
│   └── index.js        # Cloudflare Worker with API routes
├── test/               # Vitest unit tests (frontend + worker)
├── eslint.config.mjs   # ESLint flat config
├── .prettierrc.json    # Prettier formatting config
├── wrangler.toml       # Cloudflare Workers configuration
└── package.json        # Dependencies and scripts
```

### Cost Optimization

This setup is designed to be **free** for single-user applications:

- **Cloudflare Workers**: Free tier includes 100,000 requests/day
- **Cloudflare Access**: Free for up to 50 users
- **TMDB API**: Free tier with sufficient quota for personal use

### Adding More Users

To add more users (up to 50 free users with Access):

1. Go to your Cloudflare Access application
2. Edit the policy rules
3. Add additional email addresses or use email domain matching
4. No code changes needed!

## Attribution

This application uses TMDB and the TMDB APIs but is not endorsed, certified, or otherwise approved by TMDB.

Data and images are provided by [The Movie Database (TMDB)](https://www.themoviedb.org/).

Authentication powered by [Cloudflare Access](https://www.cloudflare.com/zero-trust/products/access/). Hosted on [Cloudflare Workers](https://workers.cloudflare.com/).
