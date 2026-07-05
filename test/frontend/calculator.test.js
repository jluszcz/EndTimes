import { describe, it, expect } from 'vitest';
import {
  VALID_BUFFER_VALUES,
  DEFAULT_START_TIME,
  TIME_REGEX,
  pickBestMatch,
  calculateTimes,
  formatTime,
  formatMovieMeta,
} from '../../public/script.js';

describe('Frontend Logic Tests', () => {
  describe('formatTime', () => {
    it('should format time correctly for AM hours', () => {
      const formatted = formatTime(new Date('2025-01-01T09:30:00'));
      expect(formatted).toMatch(/9:30.*AM/i);
    });

    it('should format time correctly for PM hours', () => {
      const formatted = formatTime(new Date('2025-01-01T14:45:00'));
      expect(formatted).toMatch(/2:45.*PM/i);
    });

    it('should format midnight correctly', () => {
      const formatted = formatTime(new Date('2025-01-01T00:00:00'));
      expect(formatted).toMatch(/12:00.*AM/i);
    });
  });

  describe('calculateTimes', () => {
    it('should add the buffer to the start time', () => {
      const { estStartDate } = calculateTimes('14:15', 25, 90);

      expect(estStartDate.getHours()).toBe(14);
      expect(estStartDate.getMinutes()).toBe(40);
    });

    it('should calculate end time as start + buffer + runtime', () => {
      const { estStartDate, estEndDate } = calculateTimes('12:30', 20, 148);

      expect(estStartDate.getHours()).toBe(12);
      expect(estStartDate.getMinutes()).toBe(50);
      expect(estEndDate.getTime() - estStartDate.getTime()).toBe(148 * 60000);
    });

    it('should handle time calculation crossing midnight', () => {
      const { estStartDate, estEndDate } = calculateTimes('23:00', 30, 120);

      // Should be 1:30 AM next day
      expect(estStartDate.getHours()).toBe(23);
      expect(estStartDate.getMinutes()).toBe(30);
      expect(estEndDate.getHours()).toBe(1);
      expect(estEndDate.getMinutes()).toBe(30);
    });

    it('should calculate end time with zero buffer', () => {
      const { estStartDate, estEndDate } = calculateTimes('10:00', 0, 90);

      expect(estStartDate.getHours()).toBe(10);
      expect(estStartDate.getMinutes()).toBe(0);
      expect(estEndDate.getHours()).toBe(11);
      expect(estEndDate.getMinutes()).toBe(30);
    });
  });

  describe('Time Format Validation', () => {
    it('should validate correct time format', () => {
      expect(TIME_REGEX.test('12:30')).toBe(true);
      expect(TIME_REGEX.test('09:15')).toBe(true);
      expect(TIME_REGEX.test('23:59')).toBe(true);
      expect(TIME_REGEX.test('0:00')).toBe(true);
      expect(TIME_REGEX.test('00:00')).toBe(true);
    });

    it('should reject invalid time formats', () => {
      expect(TIME_REGEX.test('24:00')).toBe(false);
      expect(TIME_REGEX.test('12:60')).toBe(false);
      expect(TIME_REGEX.test('1:5')).toBe(false);
      expect(TIME_REGEX.test('12:5')).toBe(false);
      expect(TIME_REGEX.test('12-30')).toBe(false);
      expect(TIME_REGEX.test('abc')).toBe(false);
      expect(TIME_REGEX.test('')).toBe(false);
    });

    it('should have a valid default start time', () => {
      expect(DEFAULT_START_TIME).toBe('12:00');
      expect(TIME_REGEX.test(DEFAULT_START_TIME)).toBe(true);
    });
  });

  describe('Buffer Validation', () => {
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
  });

  describe('pickBestMatch', () => {
    it('should prioritize movies closest to the current year', () => {
      const movies = [
        { id: 1, title: 'Old Movie', release_date: '1990-01-01' },
        { id: 2, title: 'Recent Movie', release_date: '2025-01-01' },
        { id: 3, title: 'Mid Movie', release_date: '2010-01-01' },
      ];

      expect(pickBestMatch(movies, 2025).id).toBe(2);
    });

    it('should prefer newer movies when years are equidistant from current', () => {
      const movies = [
        { id: 1, title: 'Older', release_date: '2020-01-01' },
        { id: 2, title: 'Newer', release_date: '2030-01-01' },
      ];

      // Both are 5 years away from 2025
      expect(pickBestMatch(movies, 2025).id).toBe(2);
    });

    it('should ignore movies without a release date when dated ones exist', () => {
      const movies = [
        { id: 1, title: 'Undated' },
        { id: 2, title: 'Dated', release_date: '2024-06-01' },
      ];

      expect(pickBestMatch(movies, 2025).id).toBe(2);
    });

    it('should fall back to the first result when no movie has a release date', () => {
      const movies = [
        { id: 1, title: 'Undated One', release_date: '' },
        { id: 2, title: 'Undated Two' },
      ];

      expect(pickBestMatch(movies, 2025).id).toBe(1);
    });

    it('should parse the release year from release_date', () => {
      const movies = [{ id: 1, title: 'Test', release_date: '2010-07-16' }];

      expect(pickBestMatch(movies, 2025).releaseYear).toBe(2010);
    });
  });

  describe('formatMovieMeta', () => {
    it('should format movie metadata correctly', () => {
      const movie = { title: 'Inception', release_date: '2010-07-16' };

      expect(formatMovieMeta(movie, 148)).toBe('(2010) • 148 min');
    });

    it('should handle missing release date', () => {
      const movie = { title: 'Unknown', release_date: null };

      expect(formatMovieMeta(movie, 120)).toBe('(Unknown year) • 120 min');
    });
  });
});
