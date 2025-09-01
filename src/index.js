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

    // JWT verification utilities
    async verifyJWT(token, env) {
        try {
            // Split token into parts
            const tokenParts = token.split('.');
            if (tokenParts.length !== 3) {
                throw new Error('Invalid JWT format');
            }

            const [headerB64, payloadB64, signatureB64] = tokenParts;
            
            // Decode JWT header to get key ID
            const header = JSON.parse(atob(headerB64));
            
            if (!header.kid) {
                throw new Error('No key ID in JWT header');
            }

            // Get JWKS from Auth0
            const jwksUrl = `https://${env.AUTH0_DOMAIN}/.well-known/jwks.json`;
            const jwksResponse = await fetch(jwksUrl);
            const jwks = await jwksResponse.json();
            
            // Find the matching key
            const key = jwks.keys.find(k => k.kid === header.kid);
            if (!key) {
                throw new Error('No matching key found');
            }

            // Import the public key
            const publicKey = await crypto.subtle.importKey(
                'jwk',
                key,
                { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
                false,
                ['verify']
            );

            // Verify the JWT signature
            const data = new TextEncoder().encode(`${headerB64}.${payloadB64}`);
            const signature = this.base64UrlDecode(signatureB64);
            
            const isValid = await crypto.subtle.verify(
                'RSASSA-PKCS1-v1_5',
                publicKey,
                signature,
                data
            );

            if (!isValid) {
                throw new Error('Invalid signature');
            }

            // Decode and validate payload
            const payload = JSON.parse(atob(payloadB64));
            
            // Check expiration
            if (payload.exp && payload.exp < Date.now() / 1000) {
                throw new Error('Token expired');
            }

            // Check audience
            if (env.AUTH0_AUDIENCE) {
                const expectedAudience = env.AUTH0_AUDIENCE;
                const tokenAudience = payload.aud;
                
                // JWT audience can be string or array of strings
                const isValidAudience = Array.isArray(tokenAudience) 
                    ? tokenAudience.includes(expectedAudience)
                    : tokenAudience === expectedAudience;
                    
                if (!isValidAudience) {
                    console.error('Audience mismatch:', {
                        expected: expectedAudience,
                        received: tokenAudience,
                        payloadType: typeof tokenAudience
                    });
                    throw new Error('Invalid audience');
                }
            }

            // Check issuer
            if (payload.iss !== `https://${env.AUTH0_DOMAIN}/`) {
                throw new Error('Invalid issuer');
            }

            return payload;
        } catch (error) {
            console.error('JWT verification failed:', error);
            throw error;
        }
    },

    base64UrlDecode(str) {
        // Convert base64url to base64
        str = str.replace(/-/g, '+').replace(/_/g, '/');
        // Pad if necessary
        while (str.length % 4) {
            str += '=';
        }
        // Decode base64 to Uint8Array
        const binary = atob(str);
        const bytes = new Uint8Array(binary.length);
        for (let i = 0; i < binary.length; i++) {
            bytes[i] = binary.charCodeAt(i);
        }
        return bytes;
    },

    async requireAuth(request, env) {
        const authHeader = request.headers.get('Authorization');
        
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            throw new Error('Missing or invalid authorization header');
        }

        const token = authHeader.substring(7);
        return await this.verifyJWT(token, env);
    },
    
    async handleApiRequest(request, env, url) {
        // Add CORS headers for API responses
        const corsHeaders = {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        };
        
        // Handle preflight requests
        if (request.method === 'OPTIONS') {
            return new Response(null, { headers: corsHeaders });
        }
        
        // Check if Auth0 is configured
        if (!env.AUTH0_DOMAIN || !env.AUTH0_AUDIENCE) {
            return new Response(JSON.stringify({ 
                error: 'Authentication not configured' 
            }), {
                status: 500,
                headers: {
                    'Content-Type': 'application/json',
                    ...corsHeaders
                }
            });
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
            // Require authentication for protected endpoints
            let user = null;
            if (url.pathname === '/api/search' || url.pathname.startsWith('/api/movie/')) {
                try {
                    user = await this.requireAuth(request, env);
                } catch (error) {
                    return new Response(JSON.stringify({ 
                        error: 'Authentication required',
                        message: error.message 
                    }), {
                        status: 401,
                        headers: {
                            'Content-Type': 'application/json',
                            ...corsHeaders
                        }
                    });
                }
            }

            if (url.pathname === '/api/search') {
                return this.handleMovieSearch(request, env, corsHeaders, user);
            } else if (url.pathname.startsWith('/api/movie/')) {
                return this.handleMovieDetails(request, env, url, corsHeaders, user);
            } else if (url.pathname === '/api/user') {
                return this.handleUserInfo(request, env, corsHeaders, user);
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
    
    async handleMovieSearch(request, env, corsHeaders, user) {
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
    
    async handleMovieDetails(request, env, url, corsHeaders, user) {
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
    },

    async handleUserInfo(request, env, corsHeaders, user) {
        // This endpoint requires authentication
        if (!user) {
            try {
                user = await this.requireAuth(request, env);
            } catch (error) {
                return new Response(JSON.stringify({ 
                    error: 'Authentication required',
                    message: error.message 
                }), {
                    status: 401,
                    headers: {
                        'Content-Type': 'application/json',
                        ...corsHeaders
                    }
                });
            }
        }

        // Return user information from JWT payload
        return new Response(JSON.stringify({
            sub: user.sub,
            name: user.name,
            email: user.email,
            email_verified: user.email_verified,
            picture: user.picture
        }), {
            headers: {
                'Content-Type': 'application/json',
                ...corsHeaders
            }
        });
    }
};