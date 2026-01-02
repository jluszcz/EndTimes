import { describe, it, expect, beforeEach, vi } from 'vitest';
import { env } from 'cloudflare:test';
import worker from '../../src/index.js';

// Mock ASSETS binding
const mockAssetsFetch = vi.fn();

describe('Worker Tests', () => {
  beforeEach(() => {
    // Reset mocks before each test
    mockAssetsFetch.mockReset();
    vi.clearAllMocks();
  });

  describe('Static Asset Serving', () => {
    it('should serve static assets for non-API routes', async () => {
      const request = new Request('https://example.com/');
      mockAssetsFetch.mockResolvedValue(new Response('index.html content'));

      const testEnv = {
        ...env,
        ASSETS: { fetch: mockAssetsFetch },
      };

      const response = await worker.fetch(request, testEnv);

      expect(mockAssetsFetch).toHaveBeenCalledWith(request);
      expect(await response.text()).toBe('index.html content');
    });

    it('should serve static assets for CSS files', async () => {
      const request = new Request('https://example.com/styles.css');
      mockAssetsFetch.mockResolvedValue(new Response('css content'));

      const testEnv = {
        ...env,
        ASSETS: { fetch: mockAssetsFetch },
      };

      await worker.fetch(request, testEnv);

      expect(mockAssetsFetch).toHaveBeenCalledWith(request);
    });
  });

  describe('API Routing', () => {
    it('should route /api/search to handleMovieSearch', async () => {
      const request = new Request('https://example.com/api/search?query=Inception');

      // Mock global fetch for TMDB API call
      global.fetch = vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ results: [] }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        })
      );

      const testEnv = {
        ...env,
        ASSETS: { fetch: mockAssetsFetch },
      };

      const response = await worker.fetch(request, testEnv);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toHaveProperty('results');
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('api.themoviedb.org/3/search/movie')
      );
    });

    it('should route /api/movie/:id to handleMovieDetails', async () => {
      const request = new Request('https://example.com/api/movie/123');

      global.fetch = vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ id: 123, title: 'Test Movie' }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        })
      );

      const testEnv = {
        ...env,
        ASSETS: { fetch: mockAssetsFetch },
      };

      const response = await worker.fetch(request, testEnv);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toHaveProperty('id', 123);
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('api.themoviedb.org/3/movie/123')
      );
    });

    it('should return 404 for unknown API endpoints', async () => {
      const request = new Request('https://example.com/api/unknown');

      const testEnv = {
        ...env,
        ASSETS: { fetch: mockAssetsFetch },
      };

      const response = await worker.fetch(request, testEnv);
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data).toHaveProperty('error', 'Unknown API endpoint');
    });
  });

  describe('Movie Search Endpoint', () => {
    it('should return 400 if query parameter is missing', async () => {
      const request = new Request('https://example.com/api/search');

      const testEnv = {
        ...env,
        ASSETS: { fetch: mockAssetsFetch },
      };

      const response = await worker.fetch(request, testEnv);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data).toHaveProperty('error', 'Query parameter is required');
    });

    it('should handle TMDB API errors gracefully', async () => {
      const request = new Request('https://example.com/api/search?query=Test');

      global.fetch = vi.fn().mockResolvedValue(
        new Response('Server Error', { status: 500 })
      );

      const testEnv = {
        ...env,
        ASSETS: { fetch: mockAssetsFetch },
      };

      const response = await worker.fetch(request, testEnv);
      const data = await response.json();

      expect(response.status).toBe(503);
      expect(data).toHaveProperty('error', 'Failed to search movies');
    });

    it('should handle TMDB 4xx errors as 400', async () => {
      const request = new Request('https://example.com/api/search?query=Test');

      global.fetch = vi.fn().mockResolvedValue(
        new Response('Bad Request', { status: 400 })
      );

      const testEnv = {
        ...env,
        ASSETS: { fetch: mockAssetsFetch },
      };

      const response = await worker.fetch(request, testEnv);

      expect(response.status).toBe(400);
    });

    it('should proxy successful TMDB search response', async () => {
      const request = new Request('https://example.com/api/search?query=Inception');
      const mockTMDBResponse = {
        results: [
          { id: 1, title: 'Inception', release_date: '2010-07-16' },
        ],
      };

      global.fetch = vi.fn().mockResolvedValue(
        new Response(JSON.stringify(mockTMDBResponse), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        })
      );

      const testEnv = {
        ...env,
        ASSETS: { fetch: mockAssetsFetch },
      };

      const response = await worker.fetch(request, testEnv);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toEqual(mockTMDBResponse);
    });

    it('should URL-encode query parameters', async () => {
      const request = new Request('https://example.com/api/search?query=The Matrix: Reloaded');

      global.fetch = vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ results: [] }), { status: 200 })
      );

      const testEnv = {
        ...env,
        ASSETS: { fetch: mockAssetsFetch },
      };

      await worker.fetch(request, testEnv);

      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('The%20Matrix%3A%20Reloaded')
      );
    });
  });

  describe('Movie Details Endpoint', () => {
    it('should return 400 if movie ID is missing', async () => {
      const request = new Request('https://example.com/api/movie/');

      const testEnv = {
        ...env,
        ASSETS: { fetch: mockAssetsFetch },
      };

      const response = await worker.fetch(request, testEnv);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data).toHaveProperty('error', 'Movie ID is required');
    });

    it('should handle TMDB API errors gracefully', async () => {
      const request = new Request('https://example.com/api/movie/123');

      global.fetch = vi.fn().mockResolvedValue(
        new Response('Server Error', { status: 500 })
      );

      const testEnv = {
        ...env,
        ASSETS: { fetch: mockAssetsFetch },
      };

      const response = await worker.fetch(request, testEnv);
      const data = await response.json();

      expect(response.status).toBe(503);
      expect(data).toHaveProperty('error', 'Failed to get movie details');
    });

    it('should proxy successful TMDB details response', async () => {
      const request = new Request('https://example.com/api/movie/27205');
      const mockTMDBResponse = {
        id: 27205,
        title: 'Inception',
        runtime: 148,
        release_date: '2010-07-16',
      };

      global.fetch = vi.fn().mockResolvedValue(
        new Response(JSON.stringify(mockTMDBResponse), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        })
      );

      const testEnv = {
        ...env,
        ASSETS: { fetch: mockAssetsFetch },
      };

      const response = await worker.fetch(request, testEnv);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toEqual(mockTMDBResponse);
    });

    it('should use correct movie ID from URL path', async () => {
      const request = new Request('https://example.com/api/movie/550');

      global.fetch = vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ id: 550 }), { status: 200 })
      );

      const testEnv = {
        ...env,
        ASSETS: { fetch: mockAssetsFetch },
      };

      await worker.fetch(request, testEnv);

      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/movie/550?')
      );
    });
  });

  describe('Environment Configuration', () => {
    it('should return 500 if TMDB_API_KEY is not configured', async () => {
      const request = new Request('https://example.com/api/search?query=Test');

      const testEnv = {
        ASSETS: { fetch: mockAssetsFetch },
        // No TMDB_API_KEY
      };

      const response = await worker.fetch(request, testEnv);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data).toHaveProperty('error', 'TMDB API key not configured');
    });

    it('should work when TMDB_API_KEY is configured', async () => {
      const request = new Request('https://example.com/api/search?query=Test');

      global.fetch = vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ results: [] }), { status: 200 })
      );

      const testEnv = {
        TMDB_API_KEY: 'test-key',
        ASSETS: { fetch: mockAssetsFetch },
      };

      const response = await worker.fetch(request, testEnv);

      expect(response.status).toBe(200);
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('api_key=test-key')
      );
    });
  });

  describe('Response Headers', () => {
    it('should set Content-Type header for JSON responses', async () => {
      const request = new Request('https://example.com/api/search?query=Test');

      global.fetch = vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ results: [] }), { status: 200 })
      );

      const testEnv = {
        ...env,
        ASSETS: { fetch: mockAssetsFetch },
      };

      const response = await worker.fetch(request, testEnv);

      expect(response.headers.get('Content-Type')).toBe('application/json');
    });

    it('should set Content-Type for error responses', async () => {
      const request = new Request('https://example.com/api/unknown');

      const testEnv = {
        ...env,
        ASSETS: { fetch: mockAssetsFetch },
      };

      const response = await worker.fetch(request, testEnv);

      expect(response.headers.get('Content-Type')).toBe('application/json');
    });
  });
});
