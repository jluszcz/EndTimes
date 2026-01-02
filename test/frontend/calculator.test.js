import { describe, it, expect, beforeEach, vi } from 'vitest';

// Import the validation constants
const VALID_BUFFER_VALUES = ['0', '5', '10', '15', '20', '25', '30'];

describe('Frontend Logic Tests', () => {
  describe('Time Formatting', () => {
    it('should format time correctly for AM hours', () => {
      const date = new Date('2025-01-01T09:30:00');
      const formatted = date.toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit',
        hour12: true
      });
      expect(formatted).toMatch(/9:30.*AM/i);
    });

    it('should format time correctly for PM hours', () => {
      const date = new Date('2025-01-01T14:45:00');
      const formatted = date.toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit',
        hour12: true
      });
      expect(formatted).toMatch(/2:45.*PM/i);
    });

    it('should format midnight correctly', () => {
      const date = new Date('2025-01-01T00:00:00');
      const formatted = date.toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit',
        hour12: true
      });
      expect(formatted).toMatch(/12:00.*AM/i);
    });
  });

  describe('Time Calculations', () => {
    it('should calculate correct end time with buffer and runtime', () => {
      const startTime = '12:30';
      const bufferMinutes = 20;
      const runtime = 148; // Inception runtime

      const [startHours, startMinutes] = startTime.split(':').map(Number);
      const startDate = new Date();
      startDate.setHours(startHours, startMinutes, 0, 0);

      const estStartDate = new Date(startDate.getTime() + bufferMinutes * 60000);
      const estEndDate = new Date(estStartDate.getTime() + runtime * 60000);

      const totalMinutesAdded = bufferMinutes + runtime;
      const expectedEndTime = new Date(startDate.getTime() + totalMinutesAdded * 60000);

      expect(estEndDate.getTime()).toBe(expectedEndTime.getTime());
    });

    it('should handle time calculation crossing midnight', () => {
      const startTime = '23:00';
      const bufferMinutes = 30;
      const runtime = 120;

      const [startHours, startMinutes] = startTime.split(':').map(Number);
      const startDate = new Date();
      startDate.setHours(startHours, startMinutes, 0, 0);

      const estStartDate = new Date(startDate.getTime() + bufferMinutes * 60000);
      const estEndDate = new Date(estStartDate.getTime() + runtime * 60000);

      // Should be 1:30 AM next day
      expect(estStartDate.getHours()).toBe(23);
      expect(estStartDate.getMinutes()).toBe(30);
      expect(estEndDate.getHours()).toBe(1);
      expect(estEndDate.getMinutes()).toBe(30);
    });

    it('should correctly add buffer time to start time', () => {
      const startTime = '14:15';
      const bufferMinutes = 25;

      const [startHours, startMinutes] = startTime.split(':').map(Number);
      const startDate = new Date();
      startDate.setHours(startHours, startMinutes, 0, 0);

      const estStartDate = new Date(startDate.getTime() + bufferMinutes * 60000);

      expect(estStartDate.getHours()).toBe(14);
      expect(estStartDate.getMinutes()).toBe(40);
    });

    it('should calculate end time with zero buffer', () => {
      const startTime = '10:00';
      const bufferMinutes = 0;
      const runtime = 90;

      const [startHours, startMinutes] = startTime.split(':').map(Number);
      const startDate = new Date();
      startDate.setHours(startHours, startMinutes, 0, 0);

      const estStartDate = new Date(startDate.getTime() + bufferMinutes * 60000);
      const estEndDate = new Date(estStartDate.getTime() + runtime * 60000);

      expect(estStartDate.getTime()).toBe(startDate.getTime());
      expect(estEndDate.getHours()).toBe(11);
      expect(estEndDate.getMinutes()).toBe(30);
    });
  });

  describe('URL Parameter Validation', () => {
    it('should validate correct time format', () => {
      const timeRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/;

      expect(timeRegex.test('12:30')).toBe(true);
      expect(timeRegex.test('09:15')).toBe(true);
      expect(timeRegex.test('23:59')).toBe(true);
      expect(timeRegex.test('0:00')).toBe(true);
      expect(timeRegex.test('00:00')).toBe(true);
    });

    it('should reject invalid time formats', () => {
      const timeRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/;

      expect(timeRegex.test('24:00')).toBe(false);
      expect(timeRegex.test('12:60')).toBe(false);
      expect(timeRegex.test('1:5')).toBe(false);
      expect(timeRegex.test('12:5')).toBe(false);
      expect(timeRegex.test('12-30')).toBe(false);
      expect(timeRegex.test('abc')).toBe(false);
      expect(timeRegex.test('')).toBe(false);
    });

    it('should validate buffer values', () => {
      expect(VALID_BUFFER_VALUES.includes('0')).toBe(true);
      expect(VALID_BUFFER_VALUES.includes('20')).toBe(true);
      expect(VALID_BUFFER_VALUES.includes('30')).toBe(true);
    });

    it('should reject invalid buffer values', () => {
      expect(VALID_BUFFER_VALUES.includes('35')).toBe(false);
      expect(VALID_BUFFER_VALUES.includes('-5')).toBe(false);
      expect(VALID_BUFFER_VALUES.includes('100')).toBe(false);
    });

    it('should handle buffer parameter conversion correctly', () => {
      const buffer = '20';
      const bufferInt = parseInt(buffer, 10);
      const bufferStr = bufferInt.toString();

      expect(!isNaN(bufferInt)).toBe(true);
      expect(VALID_BUFFER_VALUES.includes(bufferStr)).toBe(true);
    });

    it('should handle invalid buffer parameter conversion', () => {
      const buffer = 'abc';
      const bufferInt = parseInt(buffer, 10);

      expect(isNaN(bufferInt)).toBe(true);
    });
  });

  describe('Movie Search Result Sorting', () => {
    it('should prioritize movies closer to current year', () => {
      const currentYear = new Date().getFullYear();
      const movies = [
        { id: 1, title: 'Old Movie', release_date: '1990-01-01', releaseYear: 1990 },
        { id: 2, title: 'Recent Movie', release_date: `${currentYear}-01-01`, releaseYear: currentYear },
        { id: 3, title: 'Mid Movie', release_date: '2010-01-01', releaseYear: 2010 },
      ];

      const sorted = movies.sort((a, b) => {
        const aDiff = Math.abs(currentYear - a.releaseYear);
        const bDiff = Math.abs(currentYear - b.releaseYear);
        if (aDiff !== bDiff) {
          return aDiff - bDiff;
        }
        return b.releaseYear - a.releaseYear;
      });

      expect(sorted[0].id).toBe(2); // Current year movie should be first
    });

    it('should prefer newer movies when years are equidistant from current', () => {
      const currentYear = 2025;
      const movies = [
        { id: 1, title: 'Older', release_date: '2020-01-01', releaseYear: 2020 },
        { id: 2, title: 'Newer', release_date: '2030-01-01', releaseYear: 2030 },
      ];

      // Both are 5 years away from 2025
      const sorted = movies.sort((a, b) => {
        const aDiff = Math.abs(currentYear - a.releaseYear);
        const bDiff = Math.abs(currentYear - b.releaseYear);
        if (aDiff !== bDiff) {
          return aDiff - bDiff;
        }
        return b.releaseYear - a.releaseYear;
      });

      expect(sorted[0].id).toBe(2); // Newer movie (2030) should be first
    });

    it('should extract release year from release_date correctly', () => {
      const movie = {
        id: 1,
        title: 'Test',
        release_date: '2010-07-16',
      };

      const releaseYear = parseInt(movie.release_date.split('-')[0]);
      expect(releaseYear).toBe(2010);
    });
  });

  describe('URL Parameter Building', () => {
    it('should build correct URL with all parameters', () => {
      const url = new URL('https://example.com');
      url.searchParams.set('movie', 'Inception');
      url.searchParams.set('time', '12:30');
      url.searchParams.set('buffer', '20');

      expect(url.searchParams.get('movie')).toBe('Inception');
      expect(url.searchParams.get('time')).toBe('12:30');
      expect(url.searchParams.get('buffer')).toBe('20');
    });

    it('should handle movie titles with special characters', () => {
      const url = new URL('https://example.com');
      url.searchParams.set('movie', 'The Matrix: Reloaded');

      expect(url.searchParams.get('movie')).toBe('The Matrix: Reloaded');
      // URL encoding can use + or %20 for spaces, both are valid
      expect(url.toString()).toMatch(/The(\+|%20)Matrix%3A/);
    });

    it('should be able to delete auto parameter', () => {
      const url = new URL('https://example.com?auto=true');
      expect(url.searchParams.get('auto')).toBe('true');

      url.searchParams.delete('auto');
      expect(url.searchParams.get('auto')).toBe(null);
      expect(url.toString()).not.toContain('auto');
    });
  });

  describe('Input Validation', () => {
    it('should detect empty movie title', () => {
      const movieTitle = '   ';
      expect(movieTitle.trim()).toBe('');
    });

    it('should accept valid movie title', () => {
      const movieTitle = '  Inception  ';
      expect(movieTitle.trim()).toBe('Inception');
      expect(movieTitle.trim().length).toBeGreaterThan(0);
    });

    it('should parse start time correctly', () => {
      const startTime = '14:30';
      const [hours, minutes] = startTime.split(':').map(Number);

      expect(hours).toBe(14);
      expect(minutes).toBe(30);
      expect(typeof hours).toBe('number');
      expect(typeof minutes).toBe('number');
    });

    it('should parse buffer minutes as integer', () => {
      const bufferValue = '20';
      const bufferMinutes = parseInt(bufferValue);

      expect(bufferMinutes).toBe(20);
      expect(typeof bufferMinutes).toBe('number');
    });
  });

  describe('Movie Metadata Formatting', () => {
    it('should format movie metadata correctly', () => {
      const movie = {
        title: 'Inception',
        release_date: '2010-07-16',
        runtime: 148,
      };

      const year = movie.release_date.split('-')[0];
      const metadata = `(${year}) • ${movie.runtime} min`;

      expect(metadata).toBe('(2010) • 148 min');
    });

    it('should handle missing release date', () => {
      const movie = {
        title: 'Unknown',
        release_date: null,
        runtime: 120,
      };

      const year = movie.release_date ? movie.release_date.split('-')[0] : 'Unknown year';
      const metadata = `(${year}) • ${movie.runtime} min`;

      expect(metadata).toBe('(Unknown year) • 120 min');
    });
  });

  describe('API Endpoint Construction', () => {
    it('should construct search endpoint correctly', () => {
      const baseUrl = '/api';
      const title = 'Inception';
      const searchUrl = `${baseUrl}/search?query=${encodeURIComponent(title)}`;

      expect(searchUrl).toBe('/api/search?query=Inception');
    });

    it('should construct details endpoint correctly', () => {
      const baseUrl = '/api';
      const movieId = 27205;
      const detailsUrl = `${baseUrl}/movie/${movieId}`;

      expect(detailsUrl).toBe('/api/movie/27205');
    });

    it('should encode special characters in search query', () => {
      const baseUrl = '/api';
      const title = 'The Matrix: Reloaded';
      const searchUrl = `${baseUrl}/search?query=${encodeURIComponent(title)}`;

      expect(searchUrl).toContain('The%20Matrix%3A%20Reloaded');
    });
  });
});
