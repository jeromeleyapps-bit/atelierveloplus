/**
 * Template Engine for Email and SMS
 * Replace variables like {{customer.firstName}} with actual values
 */

export interface TemplateVariables {
  customer?: {
    firstName?: string | null;
    lastName?: string | null;
    email?: string | null;
    phone?: string | null;
  };
  shop?: {
    name?: string | null;
    address?: string | null;
    city?: string | null;
    postalCode?: string | null;
    phone?: string | null;
    email?: string | null;
    hours?: string;
  };
  bike?: {
    brand?: string | null;
    model?: string | null;
    serialNo?: string | null;
    color?: string | null;
  };
  workOrder?: {
    id?: string;
    number?: string;
    type?: string | null;
    status?: string;
  };
  invoice?: {
    number?: string | null;
    totalHT?: number;
    totalTTC?: number;
    taxAmount?: number;
  };
  parts?: Array<{
    description: string;
    qty: number;
    priceHT: number;
    totalHT: number;
  }>;
  [key: string]: any;
}

/**
 * Replace variables in template
 * Supports: {{customer.firstName}}, {{shop.name}}, etc.
 */
export function replaceVariables(template: string, variables: TemplateVariables): string {
  let result = template;

  // Replace simple variables: {{customer.firstName}}
  const simpleRegex = /\{\{([^}]+)\}\}/g;
  result = result.replace(simpleRegex, (match, path) => {
    const value = getNestedValue(variables, path.trim());
    return value !== undefined && value !== null ? String(value) : '';
  });

  // Replace loops: {{#each parts}}...{{/each}}
  const loopRegex = /\{\{#each\s+(\w+)\}\}([\s\S]*?)\{\{\/each\}\}/g;
  result = result.replace(loopRegex, (match, arrayName, loopContent) => {
    const array = variables[arrayName];
    if (!Array.isArray(array)) return '';

    return array.map(item => {
      let itemContent = loopContent;
      // Replace {{this.property}} with item values
      const thisRegex = /\{\{this\.(\w+)\}\}/g;
      itemContent = itemContent.replace(thisRegex, (m, prop) => {
        return item[prop] !== undefined && item[prop] !== null ? String(item[prop]) : '';
      });
      return itemContent;
    }).join('');
  });

  return result;
}

/**
 * Get nested value from object using dot notation
 * Example: getNestedValue({customer: {firstName: 'John'}}, 'customer.firstName') => 'John'
 */
function getNestedValue(obj: any, path: string): any {
  return path.split('.').reduce((current, key) => current?.[key], obj);
}

/**
 * Format price for display
 */
export function formatPrice(amount: number | null | undefined, currency: string = '€'): string {
  if (amount === null || amount === undefined) return '0,00 ' + currency;
  return amount.toFixed(2).replace('.', ',') + ' ' + currency;
}

/**
 * Format date for display
 */
export function formatDate(date: Date | string | null | undefined): string {
  if (!date) return '';
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  });
}

/**
 * Get full customer name
 */
export function getCustomerName(customer: { firstName?: string | null; lastName?: string | null }): string {
  const parts = [customer.firstName, customer.lastName].filter(Boolean);
  return parts.join(' ') || 'Client';
}
