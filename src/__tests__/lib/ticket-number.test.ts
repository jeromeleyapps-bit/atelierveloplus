import {
  formatTicketNumber,
  formatTicketNumberShort,
  formatCustomerNumber,
} from '@/lib/ticket-number';

describe('Ticket Number Utilities', () => {
  describe('formatTicketNumber', () => {
    it('should format ticket number with year', () => {
      const ticketId = 'cmi9due620001ecjkxpgxran6';
      const createdAt = new Date('2024-01-15');
      const result = formatTicketNumber(ticketId, createdAt);
      
      expect(result).toMatch(/^TKT-2024-\d{4}$/);
    });

    it('should format ticket number with date string', () => {
      const ticketId = 'cmi9due620001ecjkxpgxran6';
      const createdAt = '2024-01-15T10:00:00Z';
      const result = formatTicketNumber(ticketId, createdAt);
      
      expect(result).toMatch(/^TKT-2024-\d{4}$/);
    });

    it('should use correct year from date', () => {
      const ticketId = 'cmi9due620001ecjkxpgxran6';
      const createdAt = new Date('2025-12-31');
      const result = formatTicketNumber(ticketId, createdAt);
      
      expect(result).toMatch(/^TKT-2025-\d{4}$/);
    });

    it('should generate consistent format', () => {
      const ticketId = 'cmi9due620001ecjkxpgxran6';
      const createdAt = new Date('2024-01-15');
      const result1 = formatTicketNumber(ticketId, createdAt);
      const result2 = formatTicketNumber(ticketId, createdAt);
      
      expect(result1).toBe(result2);
    });
  });

  describe('formatTicketNumberShort', () => {
    it('should format short ticket number without year', () => {
      const ticketId = 'cmi9due620001ecjkxpgxran6';
      const result = formatTicketNumberShort(ticketId);
      
      expect(result).toMatch(/^TKT-\d{4}$/);
    });

    it('should pad number with zeros', () => {
      const ticketId = 'cmi9due620001ecjkxpgxran6';
      const result = formatTicketNumberShort(ticketId);
      
      expect(result).toMatch(/^TKT-\d{4}$/);
      expect(result.length).toBe(8); // TKT-XXXX
    });
  });

  describe('formatCustomerNumber', () => {
    it('should format customer number', () => {
      const customerId = 'cmi9due620001ecjkxpgxran6';
      const result = formatCustomerNumber(customerId);
      
      expect(result).toMatch(/^CLT-\d{4}$/);
    });

    it('should generate consistent format', () => {
      const customerId = 'cmi9due620001ecjkxpgxran6';
      const result1 = formatCustomerNumber(customerId);
      const result2 = formatCustomerNumber(customerId);
      
      expect(result1).toBe(result2);
    });
  });
});

