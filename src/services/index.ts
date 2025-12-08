/**
 * Services Layer - Point d'entrée
 * 
 * Architecture:
 * - Chaque service encapsule la logique métier d'un domaine
 * - Les routes API deviennent des "thin controllers"
 * - Code testable et réutilisable
 * 
 * Usage:
 * import { CustomersService, TicketsService } from '@/services';
 */

export { CustomersService } from './customers.service';
export type { 
  CustomerWithBikesCount, 
  CreateCustomerInput, 
  UpdateCustomerInput,
  CustomerSearchParams 
} from './customers.service';

// TODO: Ajouter les autres services
// export { TicketsService } from './tickets.service';
// export { InvoicesService } from './invoices.service';
// export { CatalogService } from './catalog.service';
