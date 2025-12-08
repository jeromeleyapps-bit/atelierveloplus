import {
  generateShortId,
  formatShortId,
  extractPrefix,
  isValidShortId,
  IDPrefix,
} from '@/lib/short-id';

describe('Short ID Utilities', () => {
  describe('generateShortId', () => {
    it('should generate short ID from UUID', () => {
      const uuid = '123e4567-e89b-12d3-a456-426614174000';
      const result = generateShortId('CLI', uuid);
      expect(result).toMatch(/^CLI-[A-F0-9]{4}$/);
    });

    it('should use last 4 characters of UUID', () => {
      const uuid = '123e4567-e89b-12d3-a456-426614174ABC';
      const result = generateShortId('TIC', uuid);
      expect(result).toBe('TIC-4ABC');
    });

    it('should handle different prefixes', () => {
      const uuid = '123e4567-e89b-12d3-a456-426614174000';
      expect(generateShortId('CLI', uuid)).toMatch(/^CLI-/);
      expect(generateShortId('TIC', uuid)).toMatch(/^TIC-/);
      expect(generateShortId('FAC', uuid)).toMatch(/^FAC-/);
    });

    it('should convert to uppercase', () => {
      const uuid = '123e4567-e89b-12d3-a456-426614174abc';
      const result = generateShortId('CLI', uuid);
      expect(result).toBe('CLI-4ABC');
    });
  });

  describe('formatShortId', () => {
    it('should format sequential ID', () => {
      expect(formatShortId('CLI', 1)).toBe('CLI-0001');
      expect(formatShortId('TIC', 42)).toBe('TIC-0042');
      expect(formatShortId('FAC', 999)).toBe('FAC-0999');
    });

    it('should pad with zeros', () => {
      expect(formatShortId('CLI', 5)).toBe('CLI-0005');
    });

    it('should handle large numbers', () => {
      expect(formatShortId('CLI', 12345)).toBe('CLI-12345');
    });
  });

  describe('extractPrefix', () => {
    it('should extract prefix from valid short ID', () => {
      expect(extractPrefix('CLI-0001')).toBe('CLI');
      expect(extractPrefix('TIC-0042')).toBe('TIC');
      expect(extractPrefix('FAC-0999')).toBe('FAC');
    });

    it('should return null for invalid format', () => {
      expect(extractPrefix('INVALID')).toBeNull();
      expect(extractPrefix('CLI-ABC')).toBeNull();
      expect(extractPrefix('123-0001')).toBeNull();
    });
  });

  describe('isValidShortId', () => {
    it('should validate correct short IDs', () => {
      expect(isValidShortId('CLI-0001')).toBe(true);
      expect(isValidShortId('TIC-0042')).toBe(true);
      expect(isValidShortId('FAC-9999')).toBe(true);
    });

    it('should reject invalid formats', () => {
      expect(isValidShortId('CLI-ABC')).toBe(false);
      expect(isValidShortId('123-0001')).toBe(false);
      expect(isValidShortId('CLI-1')).toBe(false);
      expect(isValidShortId('CLI-00001')).toBe(false);
      expect(isValidShortId('cli-0001')).toBe(false);
    });
  });
});

