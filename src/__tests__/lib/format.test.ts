/**
 * @jest-environment node
 */

import {
  formatDate,
  formatDateTime,
  formatDateLong,
  formatTime,
  formatPrice,
  formatPhone,
} from '@/lib/format';

describe('Format Utilities', () => {
  describe('formatDate', () => {
    it('should format a valid date', () => {
      const date = new Date('2024-01-15T12:00:00.000Z');
      const result = formatDate(date);
      // Should return a formatted date string (not "-")
      expect(result).toBe('15/01/2024');
    });

    it('should format a date string', () => {
      const dateString = '2024-01-15T10:00:00Z';
      const result = formatDate(dateString);
      // Should return a formatted date string (not "-")
      expect(result).toBe('15/01/2024');
    });

    it('should return "-" for null', () => {
      expect(formatDate(null)).toBe('-');
    });

    it('should return "-" for undefined', () => {
      expect(formatDate(undefined)).toBe('-');
    });

    it('should return "-" for invalid date', () => {
      expect(formatDate('invalid-date')).toBe('-');
    });
  });

  describe('formatDateTime', () => {
    it('should format a valid date with time', () => {
      const date = new Date('2024-01-15T14:30:00Z');
      const result = formatDateTime(date);
      // Should return a formatted date-time string (not "-")
      expect(result).toContain('15/01/2024');
      expect(result).toContain(':');
    });

    it('should return "-" for null', () => {
      expect(formatDateTime(null)).toBe('-');
    });

    it('should return "-" for invalid date', () => {
      expect(formatDateTime('invalid')).toBe('-');
    });
  });

  describe('formatDateLong', () => {
    it('should format a date in long format', () => {
      const date = new Date('2024-01-15T12:00:00.000Z');
      const result = formatDateLong(date);
      expect(result).toContain('janvier');
      expect(result).toContain('2024');
    });

    it('should return "-" for null', () => {
      expect(formatDateLong(null)).toBe('-');
    });
  });

  describe('formatTime', () => {
    it('should format time from date', () => {
      const date = new Date('2024-01-15T14:30:00Z');
      const result = formatTime(date);
      // Should return a formatted time string (not "-")
      expect(result).toMatch(/\d{2}:\d{2}/);
    });

    it('should return "-" for null', () => {
      expect(formatTime(null)).toBe('-');
    });
  });

  describe('formatPrice', () => {
    it('should format price with default currency', () => {
      const result = formatPrice(123.45);
      expect(result).toContain('123');
      expect(result).toContain('45');
      expect(result).toContain('€'); // EUR currency symbol
    });

    it('should format price correctly', () => {
      const result = formatPrice(100);
      expect(result).toContain('100');
      expect(result).toContain('€');
    });

    it('should handle zero', () => {
      const result = formatPrice(0);
      expect(result).toBeDefined();
    });

    it('should handle negative prices', () => {
      const result = formatPrice(-50);
      expect(result).toBeDefined();
    });

    it('should handle null', () => {
      expect(formatPrice(null)).toBe('-');
    });

    it('should handle undefined', () => {
      expect(formatPrice(undefined)).toBe('-');
    });
  });

  describe('formatPhone', () => {
    it('should format French phone number', () => {
      const result = formatPhone('0123456789');
      expect(result).toBeDefined();
      expect(typeof result).toBe('string');
    });

    it('should format international phone number', () => {
      const result = formatPhone('+33123456789');
      expect(result).toBeDefined();
    });

    it('should return "-" for null', () => {
      expect(formatPhone(null)).toBe('-');
    });

    it('should return "-" for empty string', () => {
      expect(formatPhone('')).toBe('-');
    });

    it('should return original value for invalid phone', () => {
      // formatPhone returns the original value if it doesn't match expected formats
      expect(formatPhone('invalid')).toBe('invalid');
    });
  });
});

