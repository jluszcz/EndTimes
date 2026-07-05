const TMDB_BASE_URL = 'https://api.themoviedb.org/3';

function jsonResponse(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

// Proxies a TMDB request, streaming the response body through on success.
async function proxyTmdb(env, pathWithQuery, errorLabel, cacheSeconds) {
  let response;
  try {
    response = await fetch(`${TMDB_BASE_URL}${pathWithQuery}`, {
      headers: {
        Authorization: `Bearer ${env.TMDB_READ_ACCESS_TOKEN}`,
        Accept: 'application/json',
      },
    });
  } catch (error) {
    console.error(JSON.stringify({ message: 'TMDB request failed', error: error.message }));
    return jsonResponse({ error: 'Upstream request failed', message: 'Unable to reach TMDB' }, 502);
  }

  if (!response.ok) {
    // Discard the unread upstream body so workerd doesn't hold the connection open
    await response.body?.cancel();
    return jsonResponse(
      { error: errorLabel, message: 'TMDB API temporarily unavailable' },
      response.status >= 500 ? 503 : 400,
    );
  }

  return new Response(response.body, {
    headers: {
      'Content-Type': 'application/json',
      // The app sits behind Cloudflare Access, so keep responses out of shared caches
      'Cache-Control': `private, max-age=${cacheSeconds}`,
    },
  });
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    // Cloudflare Access handles authentication - if request reaches here, user is authenticated
    if (url.pathname.startsWith('/api/')) {
      return this.handleApiRequest(request, env, url);
    }

    // Serve static assets for all other requests
    return env.ASSETS.fetch(request);
  },

  async handleApiRequest(request, env, url) {
    if (!env.TMDB_READ_ACCESS_TOKEN) {
      return jsonResponse({ error: 'TMDB read access token not configured' }, 500);
    }

    try {
      if (url.pathname === '/api/search') {
        const query = url.searchParams.get('query');
        if (!query) {
          return jsonResponse({ error: 'Query parameter is required' }, 400);
        }
        // Search results change as new movies are added - cache briefly
        return await proxyTmdb(
          env,
          `/search/movie?query=${encodeURIComponent(query)}`,
          'Failed to search movies',
          3600,
        );
      }

      if (url.pathname.startsWith('/api/movie/')) {
        const segments = url.pathname.split('/'); // ['', 'api', 'movie', '{id}']
        if (segments.length !== 4) {
          return jsonResponse({ error: 'Unknown API endpoint' }, 404);
        }
        const movieId = segments[3];
        if (!movieId) {
          return jsonResponse({ error: 'Movie ID is required' }, 400);
        }
        if (!/^\d+$/.test(movieId)) {
          return jsonResponse({ error: 'Movie ID must be numeric' }, 400);
        }
        // Movie details (runtime, title) rarely change - cache for a day
        return await proxyTmdb(env, `/movie/${movieId}`, 'Failed to get movie details', 86400);
      }

      return jsonResponse({ error: 'Unknown API endpoint' }, 404);
    } catch (error) {
      console.error(JSON.stringify({ message: 'API request failed', error: error.message }));
      return jsonResponse({ error: 'Internal error' }, 500);
    }
  },
};
