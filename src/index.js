export default {
    // JWKS cache to avoid repeated fetches
    jwksCache: new Map(),
    
    // Rate limiting storage (IP -> { count, windowStart })
    rateLimitStorage: new Map(),
    
    async fetch(request, env, ctx) {
        const url = new URL(request.url);
        
        // Handle API routes
        if (url.pathname.startsWith('/api/')) {
            return this.handleApiRequest(request, env, url);
        }
        
        // Serve static assets for all other requests
        return env.ASSETS.fetch(request);
    },

    // Helper method for safe base64url decoding using Node.js Buffer API
    safeBase64UrlDecode(str) {
        try {
            // Buffer handles base64url natively and is more robust than manual conversion
            return Buffer.from(str, 'base64url').toString('utf8');
        } catch (error) {
            throw new Error(`Base64URL decode failed: ${error.message}`);
        }
    },

    // Rate limiting for JWT verification (100 requests per minute per IP)
    checkRateLimit(request) {
        const clientIP = request.headers.get('CF-Connecting-IP') || 
                        request.headers.get('X-Forwarded-For') || 
                        'unknown';
        
        const now = Date.now();
        const windowMs = 60 * 1000; // 1 minute window
        const maxRequests = 100;    // 100 requests per minute
        
        const key = `auth_${clientIP}`;
        const record = this.rateLimitStorage.get(key);
        
        // Clean up old records periodically
        if (Math.random() < 0.01) { // 1% chance
            this.cleanupRateLimit(now, windowMs);
        }
        
        if (!record || (now - record.windowStart) > windowMs) {
            // New window
            this.rateLimitStorage.set(key, {
                count: 1,
                windowStart: now
            });
            return true;
        }
        
        if (record.count >= maxRequests) {
            return false; // Rate limited
        }
        
        record.count++;
        return true;
    },

    // Clean up expired rate limit records
    cleanupRateLimit(now, windowMs) {
        for (const [key, record] of this.rateLimitStorage.entries()) {
            if ((now - record.windowStart) > windowMs * 2) { // Keep for 2 windows
                this.rateLimitStorage.delete(key);
            }
        }
    },

    // Validate CORS origin against allowed list
    validateOrigin(origin, env) {
        if (!origin) {
            return null; // No origin header, allow for same-origin requests
        }

        const allowedOrigins = [
            // Production domain (from Auth0 audience)
            env.AUTH0_AUDIENCE || 'https://end-times.jacob-luszcz.workers.dev',
            // Development domains
            'http://localhost:8787',
            'http://127.0.0.1:8787',
            // If there's a custom domain env var, include it
            env.CUSTOM_DOMAIN ? `https://${env.CUSTOM_DOMAIN}` : null,
            // Allow other *.workers.dev subdomains for this app in different environments
            /^https:\/\/[\w-]+-end-times\.[\w-]+\.workers\.dev$/,
        ].filter(Boolean); // Remove null entries

        // Check exact matches first
        const exactMatch = allowedOrigins.find(allowed => 
            typeof allowed === 'string' && allowed === origin
        );
        if (exactMatch) {
            return origin;
        }

        // Check regex patterns
        const regexMatch = allowedOrigins.find(allowed => 
            allowed instanceof RegExp && allowed.test(origin)
        );
        if (regexMatch) {
            return origin;
        }

        // Origin not allowed
        return null;
    },

    // Generate CORS headers with validated origin
    generateCorsHeaders(request, env) {
        const origin = request.headers.get('Origin');
        const validatedOrigin = this.validateOrigin(origin, env);
        
        const headers = {
            'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type, Authorization',
            'Access-Control-Max-Age': '86400', // Cache preflight for 24 hours
        };

        if (validatedOrigin) {
            headers['Access-Control-Allow-Origin'] = validatedOrigin;
            headers['Access-Control-Allow-Credentials'] = 'true';
        } else if (origin) {
            // Origin provided but not allowed - be explicit about rejection
            console.warn(`CORS: Rejected origin ${origin}`);
        }

        return headers;
    },

    // Sanitize error messages for production
    sanitizeError(error, env, errorType = 'generic') {
        const isDevelopment = env.ENVIRONMENT === 'development';
        
        // Always log the full error for debugging (server-side only)
        console.error(`[${errorType}] ${error.message}`, {
            stack: error.stack,
            timestamp: new Date().toISOString()
        });

        // In development, return detailed errors. In production, return sanitized ones.
        if (isDevelopment) {
            return {
                error: errorType,
                message: error.message,
                debug: true
            };
        }

        // Production error mapping - don't expose internal details
        const sanitizedMessages = {
            'authentication': 'Authentication failed',
            'authorization': 'Access denied',
            'validation': 'Invalid input provided',
            'external_api': 'External service temporarily unavailable',
            'rate_limit': 'Too many requests',
            'generic': 'Internal server error occurred'
        };

        return {
            error: errorType,
            message: sanitizedMessages[errorType] || sanitizedMessages.generic
        };
    },

    // JWKS fetching with caching and error handling
    async getJWKS(domain) {
        const cacheKey = `jwks_${domain}`;
        const cached = this.jwksCache.get(cacheKey);
        
        // Check if we have a valid cached entry (5 minutes TTL)
        if (cached && (Date.now() - cached.timestamp) < 5 * 60 * 1000) {
            return cached.data;
        }

        try {
            const jwksUrl = `https://${domain}/.well-known/jwks.json`;
            const response = await fetch(jwksUrl, {
                headers: {
                    'Accept': 'application/json',
                    'User-Agent': 'EndTimes/1.0'
                },
                cf: {
                    cacheTtl: 300, // 5 minutes
                    cacheEverything: true
                }
            });

            if (!response.ok) {
                throw new Error(`JWKS fetch failed with status ${response.status}`);
            }

            const jwks = await response.json();
            
            // Validate JWKS structure
            if (!jwks.keys || !Array.isArray(jwks.keys) || jwks.keys.length === 0) {
                throw new Error('Invalid JWKS structure');
            }

            // Cache the result
            this.jwksCache.set(cacheKey, {
                data: jwks,
                timestamp: Date.now()
            });

            return jwks;
        } catch (error) {
            // If we have a stale cache entry, use it as fallback
            if (cached) {
                console.warn('Using stale JWKS cache due to fetch error:', error.message);
                return cached.data;
            }
            throw new Error(`Failed to fetch JWKS: ${error.message}`);
        }
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
            let header;
            try {
                header = JSON.parse(this.safeBase64UrlDecode(headerB64));
            } catch (error) {
                throw new Error(`Invalid JWT header encoding: ${error.message}`);
            }
            
            if (!header.kid) {
                throw new Error('No key ID in JWT header');
            }

            // Get JWKS from Auth0 with caching and error handling
            const jwks = await this.getJWKS(env.AUTH0_DOMAIN);
            
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
            let payload;
            try {
                payload = JSON.parse(this.safeBase64UrlDecode(payloadB64));
            } catch (error) {
                throw new Error(`Invalid JWT payload encoding: ${error.message}`);
            }
            
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
        try {
            // Use Buffer for consistent base64url handling, return Uint8Array for crypto operations
            return Buffer.from(str, 'base64url');
        } catch (error) {
            throw new Error(`Base64URL decode failed: ${error.message}`);
        }
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
        // Generate CORS headers with origin validation
        const corsHeaders = this.generateCorsHeaders(request, env);
        
        // Handle preflight requests
        if (request.method === 'OPTIONS') {
            return new Response(null, { headers: corsHeaders });
        }
        
        // Reject requests from invalid origins
        const origin = request.headers.get('Origin');
        if (origin && !corsHeaders['Access-Control-Allow-Origin']) {
            return new Response(JSON.stringify({ 
                error: 'Origin not allowed',
                message: 'Cross-origin requests from this domain are not permitted'
            }), {
                status: 403,
                headers: {
                    'Content-Type': 'application/json'
                    // Intentionally not including CORS headers for rejected origins
                }
            });
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
            if (url.pathname === '/api/search' || url.pathname.startsWith('/api/movie/') || url.pathname === '/api/user') {
                // Check rate limit before authentication
                if (!this.checkRateLimit(request)) {
                    return new Response(JSON.stringify({ 
                        error: 'Rate limit exceeded',
                        message: 'Too many authentication requests. Please try again later.' 
                    }), {
                        status: 429,
                        headers: {
                            'Content-Type': 'application/json',
                            'Retry-After': '60',
                            ...corsHeaders
                        }
                    });
                }
                
                try {
                    user = await this.requireAuth(request, env);
                } catch (error) {
                    const sanitizedError = this.sanitizeError(error, env, 'authentication');
                    return new Response(JSON.stringify(sanitizedError), {
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
            } else if (url.pathname === '/api/config/auth0') {
                return this.handleAuth0Config(request, env, corsHeaders);
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
            const sanitizedError = this.sanitizeError(error, env, 'generic');
            return new Response(JSON.stringify(sanitizedError), {
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
            const mockError = new Error(`TMDB API error: ${response.status}`);
            const sanitizedError = this.sanitizeError(mockError, env, 'external_api');
            return new Response(JSON.stringify(sanitizedError), {
                status: response.status >= 500 ? 503 : 400, // Service unavailable for server errors
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
            const mockError = new Error(`TMDB API error: ${response.status}`);
            const sanitizedError = this.sanitizeError(mockError, env, 'external_api');
            return new Response(JSON.stringify(sanitizedError), {
                status: response.status >= 500 ? 503 : 400, // Service unavailable for server errors
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
                const sanitizedError = this.sanitizeError(error, env, 'authentication');
                return new Response(JSON.stringify(sanitizedError), {
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
    },

    async handleAuth0Config(request, env, corsHeaders) {
        // This endpoint doesn't require authentication as it provides public configuration
        return new Response(JSON.stringify({
            domain: env.AUTH0_DOMAIN,
            clientId: env.AUTH0_CLIENT_ID,
            audience: env.AUTH0_AUDIENCE
        }), {
            headers: {
                'Content-Type': 'application/json',
                ...corsHeaders
            }
        });
    }
};