export default {
    async fetch(request, env, ctx) {
        const url = new URL(request.url);

        // Cloudflare Access handles authentication - if request reaches here, user is authenticated
        if (url.pathname.startsWith('/api/')) {
            return this.handleApiRequest(request, env, url);
        }

        // Serve static assets for all other requests
        return env.ASSETS.fetch(request);
    },

    async handleApiRequest(request, env, url) {
        // Check if TMDB API key is available
        if (!env.TMDB_API_KEY) {
            return new Response(JSON.stringify({
                error: 'TMDB API key not configured'
            }), {
                status: 500,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        if (url.pathname === '/api/search') {
            return this.handleMovieSearch(request, env);
        } else if (url.pathname.startsWith('/api/movie/')) {
            return this.handleMovieDetails(request, env, url);
        }

        // Unknown API endpoint
        return new Response(JSON.stringify({
            error: 'Unknown API endpoint'
        }), {
            status: 404,
            headers: { 'Content-Type': 'application/json' }
        });
    },

    async handleMovieSearch(request, env) {
        const url = new URL(request.url);
        const query = url.searchParams.get('query');

        if (!query) {
            return new Response(JSON.stringify({
                error: 'Query parameter is required'
            }), {
                status: 400,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        const tmdbUrl = `https://api.themoviedb.org/3/search/movie?api_key=${env.TMDB_API_KEY}&query=${encodeURIComponent(query)}`;
        const response = await fetch(tmdbUrl);

        if (!response.ok) {
            return new Response(JSON.stringify({
                error: 'Failed to search movies',
                message: 'TMDB API temporarily unavailable'
            }), {
                status: response.status >= 500 ? 503 : 400,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        const data = await response.json();

        return new Response(JSON.stringify(data), {
            headers: { 'Content-Type': 'application/json' }
        });
    },

    async handleMovieDetails(request, env, url) {
        const pathParts = url.pathname.split('/');
        const movieId = pathParts[3]; // /api/movie/{id}

        if (!movieId) {
            return new Response(JSON.stringify({
                error: 'Movie ID is required'
            }), {
                status: 400,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        const tmdbUrl = `https://api.themoviedb.org/3/movie/${movieId}?api_key=${env.TMDB_API_KEY}`;
        const response = await fetch(tmdbUrl);

        if (!response.ok) {
            return new Response(JSON.stringify({
                error: 'Failed to get movie details',
                message: 'TMDB API temporarily unavailable'
            }), {
                status: response.status >= 500 ? 503 : 400,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        const data = await response.json();

        return new Response(JSON.stringify(data), {
            headers: { 'Content-Type': 'application/json' }
        });
    }
};
