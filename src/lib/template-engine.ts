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
    address?: string | null; // Legacy
    address1?: string | null;
    address2?: string | null;
    city?: string | null;
    zip?: string | null;
    postalCode?: string | null; // Legacy
    country?: string | null;
    phone?: string | null;
    email?: string | null;
    siret?: string | null;
    tva?: string | null;
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
  [key: string]: unknown;
}

/**
 * Replace variables in template
 * Supports: {{customer.firstName}}, {{shop.name}}, {{#if}}, {{#each}}, etc.
 */
export function replaceVariables(template: string, variables: TemplateVariables): string {
  let result = template;

  // Replace conditionals: {{#if shop.address2}}...{{/if}}
  const ifRegex = /\{\{#if\s+([^}]+)\}\}([\s\S]*?)\{\{\/if\}\}/g;
  result = result.replace(ifRegex, (match, condition, content) => {
    const value = getNestedValue(variables, condition.trim());
    // Show content if value exists and is not empty
    const shouldShow = value !== undefined && value !== null && value !== '';
    return shouldShow ? content : '';
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

  // Replace simple variables: {{customer.firstName}} (DOIT être après les conditions et loops)
  const simpleRegex = /\{\{([^}#\/]+)\}\}/g;
  result = result.replace(simpleRegex, (match, path) => {
    const value = getNestedValue(variables, path.trim());
    return value !== undefined && value !== null ? String(value) : '';
  });

  return result;
}

/**
 * Get nested value from object using dot notation
 * Example: getNestedValue({customer: {firstName: 'John'}}, 'customer.firstName') => 'John'
 */
function getNestedValue(obj: Record<string, unknown>, path: string): unknown {
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
