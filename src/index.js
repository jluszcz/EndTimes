export default {
    async fetch(request, env, ctx) {
        const url = new URL(request.url);
        
        // Handle API routes
        if (url.pathname.startsWith('/api/')) {
            return this.handleApiRequest(request, env, url);
        }
        
        // Serve static assets for all other requests
        return env.ASSETS.fetch(request);
    },
    
    async handleApiRequest(request, env, url) {
        // Add CORS headers for API responses
        const corsHeaders = {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type',
        };
        
        // Handle preflight requests
        if (request.method === 'OPTIONS') {
            return new Response(null, { headers: corsHeaders });
        }
        
        // Check if TMDB API key is available
        if (!env.TMDB_API_KEY) {
            return new Response(JSON.stringify({ 
                error: 'TMDB API key not configured' 
            }), {
                status: 500,
                headers: {
                    'Content-Type': 'application/json',
                    ...corsHeaders
                }
            });
        }
        
        try {
            if (url.pathname === '/api/search') {
                return this.handleMovieSearch(request, env, corsHeaders);
            } else if (url.pathname.startsWith('/api/movie/')) {
                return this.handleMovieDetails(request, env, url, corsHeaders);
            }
            
            // Unknown API endpoint
            return new Response(JSON.stringify({ 
                error: 'Unknown API endpoint' 
            }), {
                status: 404,
                headers: {
                    'Content-Type': 'application/json',
                    ...corsHeaders
                }
            });
            
        } catch (error) {
            return new Response(JSON.stringify({ 
                error: 'Internal server error',
                message: error.message 
            }), {
                status: 500,
                headers: {
                    'Content-Type': 'application/json',
                    ...corsHeaders
                }
            });
        }
    },
    
    async handleMovieSearch(request, env, corsHeaders) {
        const url = new URL(request.url);
        const query = url.searchParams.get('query');
        
        if (!query) {
            return new Response(JSON.stringify({ 
                error: 'Query parameter is required' 
            }), {
                status: 400,
                headers: {
                    'Content-Type': 'application/json',
                    ...corsHeaders
                }
            });
        }
        
        const tmdbUrl = `https://api.themoviedb.org/3/search/movie?api_key=${env.TMDB_API_KEY}&query=${encodeURIComponent(query)}`;
        const response = await fetch(tmdbUrl);
        
        if (!response.ok) {
            return new Response(JSON.stringify({ 
                error: 'Failed to search movies' 
            }), {
                status: response.status,
                headers: {
                    'Content-Type': 'application/json',
                    ...corsHeaders
                }
            });
        }
        
        const data = await response.json();
        
        return new Response(JSON.stringify(data), {
            headers: {
                'Content-Type': 'application/json',
                ...corsHeaders
            }
        });
    },
    
    async handleMovieDetails(request, env, url, corsHeaders) {
        const pathParts = url.pathname.split('/');
        const movieId = pathParts[3]; // /api/movie/{id}
        
        if (!movieId) {
            return new Response(JSON.stringify({ 
                error: 'Movie ID is required' 
            }), {
                status: 400,
                headers: {
                    'Content-Type': 'application/json',
                    ...corsHeaders
                }
            });
        }
        
        const tmdbUrl = `https://api.themoviedb.org/3/movie/${movieId}?api_key=${env.TMDB_API_KEY}`;
        const response = await fetch(tmdbUrl);
        
        if (!response.ok) {
            return new Response(JSON.stringify({ 
                error: 'Failed to get movie details' 
            }), {
                status: response.status,
                headers: {
                    'Content-Type': 'application/json',
                    ...corsHeaders
                }
            });
        }
        
        const data = await response.json();
        
        return new Response(JSON.stringify(data), {
            headers: {
                'Content-Type': 'application/json',
                ...corsHeaders
            }
        });
    }
};