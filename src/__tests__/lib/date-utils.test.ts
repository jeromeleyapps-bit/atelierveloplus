/**
 * Tests pour les utilitaires de date
 */

describe('Date utilities', () => {
  describe('Date formatting', () => {
    it('should format date in French locale', () => {
      const date = new Date('2025-12-07T14:30:00');
      const formatted = date.toLocaleDateString('fr-FR');
      expect(formatted).toContain('12');
      expect(formatted).toContain('2025');
    });

    it('should format time correctly', () => {
      const date = new Date('2025-12-07T14:30:00');
      const formatted = date.toLocaleTimeString('fr-FR', { 
        hour: '2-digit', 
        minute: '2-digit' 
      });
      expect(formatted).toContain('14');
      expect(formatted).toContain('30');
    });

    it('should handle ISO string conversion', () => {
      const isoString = '2025-12-07T14:30:00.000Z';
      const date = new Date(isoString);
      expect(date.toISOString()).toBe(isoString);
    });
  });

  describe('Date calculations', () => {
    it('should calculate days between dates', () => {
      const date1 = new Date('2025-12-01');
      const date2 = new Date('2025-12-07');
      const diffTime = Math.abs(date2.getTime() - date1.getTime());
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      expect(diffDays).toBe(6);
    });

    it('should get start of month', () => {
      const date = new Date('2025-12-15');
      const startOfMonth = new Date(date.getFullYear(), date.getMonth(), 1);
      expect(startOfMonth.getDate()).toBe(1);
      expect(startOfMonth.getMonth()).toBe(11); // December = 11
    });

    it('should get end of month', () => {
      const date = new Date('2025-12-15');
      const endOfMonth = new Date(date.getFullYear(), date.getMonth() + 1, 0);
      expect(endOfMonth.getDate()).toBe(31); // December has 31 days
    });

    it('should check if date is in past', () => {
      const pastDate = new Date('2020-01-01');
      const futureDate = new Date('2030-01-01');
      const now = new Date();
      
      expect(pastDate < now).toBe(true);
      expect(futureDate > now).toBe(true);
    });
  });

  describe('Date parsing', () => {
    it('should parse French date format', () => {
      // Simulate parsing DD/MM/YYYY
      const frenchDate = '07/12/2025';
      const [day, month, year] = frenchDate.split('/').map(Number);
      const date = new Date(year, month - 1, day);
      
      expect(date.getDate()).toBe(7);
      expect(date.getMonth()).toBe(11); // December
      expect(date.getFullYear()).toBe(2025);
    });

    it('should handle invalid dates gracefully', () => {
      const invalidDate = new Date('invalid');
      expect(isNaN(invalidDate.getTime())).toBe(true);
    });
  });
});
