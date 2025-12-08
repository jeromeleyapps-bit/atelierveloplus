/**
 * Harmonisation des données catalogue
 * Unifie les données provenant de 3 sources :
 * 1. CSV Fournisseur (import B2B)
 * 2. Scanner Code-Barres
 * 3. Création Manuelle
 */

import type { CatalogItem } from "@/lib/api";

// ============================================
// TYPES SOURCES
// ============================================

/**
 * Données brutes du CSV fournisseur
 */
export interface SupplierCSVRow {
  reference: string;           // Référence fournisseur
  name: string;
  priceHT?: number;
  priceTTC?: number;
  ean?: string;
  supplier?: string;
  availability?: string;
  description?: string;
  category?: string;           // Sous famille (P2R)
}

/**
 * Données du scanner code-barres
 */
export interface ScannedItem {
  ean: string;                 // Code-barres scanné
  name?: string;               // Nom (si trouvé via lookup)
  quantity?: number;           // Quantité scannée
  timestamp?: Date;
}

/**
 * Données de création manuelle
 */
export interface ManualItemInput {
  name: string;
  sku?: string;
  priceHT: number;
  priceTTC?: number;
  vatRate?: number;
  stockQty?: number;
  minStock?: number;
  category?: string;
  ean?: string;
}

// ============================================
// TYPE UNIFIÉ
// ============================================

/**
 * Structure unifiée pour toutes les sources
 */
export interface UnifiedCatalogItem {
  // Identification
  sku?: string;                // SKU interne unique
  ean?: string;                // Code-barres EAN (lien entre sources)
  supplierSku?: string;        // Référence fournisseur
  
  // Informations produit
  name: string;
  category: "PIECES" | "EQUIPEMENTS" | "AUTRES";
  description?: string;
  
  // Prix
  priceHT: number;             // Prix de VENTE HT
  priceTTC: number;            // Prix de VENTE TTC
  vatRate: number;             // Taux TVA (20%)
  purchasePriceHT?: number;    // Prix d'ACHAT HT (fournisseur)
  purchasePriceTTC?: number;   // Prix d'ACHAT TTC
  
  // Stock
  stockQty: number;
  minStock: number;
  
  // Métadonnées
  source: "supplier_csv" | "scanner" | "manual";
  supplierName?: string;
  availability?: string;
  active: boolean;
  
  // Timestamps
  importedAt?: Date;
}

// ============================================
// CONVERTISSEURS
// ============================================

/**
 * Convertit une ligne CSV fournisseur en format unifié
 */
export function convertSupplierCSV(
  row: SupplierCSVRow,
  options: {
    defaultMargin?: number;    // Marge par défaut (ex: 1.5 = +50%)
    defaultVatRate?: number;   // TVA par défaut (20%)
    supplierName?: string;     // Nom du fournisseur
  } = {}
): UnifiedCatalogItem {
  const {
    defaultMargin = 1.5,
    defaultVatRate = 20,
    supplierName = "Inconnu"
  } = options;

  // Calculer prix de vente avec marge
  let purchasePriceHT: number;
  let priceHT: number;
  let priceTTC: number;
  const vatRate = defaultVatRate;
  
  // Si on a priceHT (prix achat HT)
  if (row.priceHT && row.priceHT > 0) {
    purchasePriceHT = row.priceHT;
    priceHT = purchasePriceHT * defaultMargin;
    priceTTC = priceHT * (1 + vatRate / 100);
  }
  // Si on a priceTTC (prix public TTC) mais pas priceHT
  else if (row.priceTTC && row.priceTTC > 0) {
    // On a le prix public TTC, on recalcule le HT
    priceTTC = row.priceTTC;
    priceHT = priceTTC / (1 + vatRate / 100);
    // On estime le prix d'achat en enlevant la marge
    purchasePriceHT = priceHT / defaultMargin;
  }
  // Sinon, prix par défaut
  else {
    purchasePriceHT = 0;
    priceHT = 0;
    priceTTC = 0;
  }
  
  const purchasePriceTTC = purchasePriceHT * (1 + vatRate / 100);

  return {
    // Identification
    supplierSku: row.reference,
    ean: row.ean,
    sku: undefined, // Sera généré à la création
    
    // Informations
    name: cleanProductName(row.name),
    category: row.category ? mapCategoryFromSupplier(row.category) : detectCategory(row.name),
    description: row.description || row.name, // Garder désignation complète en description
    
    // Prix
    priceHT,
    priceTTC,
    vatRate,
    purchasePriceHT,
    purchasePriceTTC,
    
    // Stock
    stockQty: row.availability === 'En stock' ? 5 : 0, // Pas de stock initial pour import fournisseur
    minStock: 5,
    
    // Métadonnées
    source: "supplier_csv",
    supplierName: row.supplier || supplierName,
    availability: row.availability,
    active: true,
    importedAt: new Date(),
  };
}

/**
 * Convertit un scan code-barres en format unifié
 */
export function convertScannedItem(
  scanned: ScannedItem,
  existingItem?: CatalogItem
): UnifiedCatalogItem {
  // Si l'item existe déjà, on incrémente juste le stock
  if (existingItem) {
    return {
      ...existingItem,
      stockQty: existingItem.stockQty + (scanned.quantity || 1),
      source: "scanner",
    } as UnifiedCatalogItem;
  }

  // Sinon, créer un nouvel item
  return {
    // Identification
    ean: scanned.ean,
    sku: undefined, // Sera généré
    
    // Informations
    name: scanned.name || `Produit EAN ${scanned.ean}`,
    category: "PIECES", // Par défaut
    
    // Prix (à définir manuellement après)
    priceHT: 0,
    priceTTC: 0,
    vatRate: 20,
    
    // Stock
    stockQty: scanned.quantity || 1,
    minStock: 5,
    
    // Métadonnées
    source: "scanner",
    active: true,
    importedAt: new Date(),
  };
}

/**
 * Convertit une saisie manuelle en format unifié
 */
export function convertManualInput(
  input: ManualItemInput
): UnifiedCatalogItem {
  const vatRate = input.vatRate || 20;
  const priceHT = input.priceHT;
  const priceTTC = input.priceTTC || priceHT * (1 + vatRate / 100);

  return {
    // Identification
    sku: input.sku,
    ean: input.ean,
    
    // Informations
    name: cleanProductName(input.name),
    category: ((input.category as string) || "PIECES") as "PIECES" | "EQUIPEMENTS" | "AUTRES",
    
    // Prix
    priceHT,
    priceTTC,
    vatRate,
    
    // Stock
    stockQty: input.stockQty || 0,
    minStock: input.minStock || 5,
    
    // Métadonnées
    source: "manual",
    active: true,
    importedAt: new Date(),
  };
}

// ============================================
// FONCTIONS UTILITAIRES
// ============================================

/**
 * Extrait un nom court lisible du produit
 * Stratégie: Garder 8-10 premiers mots + détails techniques importants
 * Note: Le code produit (supplierSku) sert d'identifiant unique
 */
function cleanProductName(name: string | undefined): string {
  if (!name) return "Produit sans nom";
  
  // Nettoyer
  const cleaned = name
    .trim()
    .replace(/\s+/g, " ")
    .toLowerCase();
  
  const words = cleaned.split(' ');
  
  // Garder 10 premiers mots max (ou jusqu'à parenthèse)
  let shortName = '';
  let wordCount = 0;
  const maxWords = 10;
  
  for (let i = 0; i < words.length && wordCount < maxWords; i++) {
    const word = words[i];
    
    // Arrêter à la parenthèse (conditionnement)
    if (word.includes('(')) break;
    
    shortName += (shortName ? ' ' : '') + word;
    wordCount++;
  }
  
  // Capitaliser proprement
  shortName = shortName
    .split(' ')
    .map(word => {
      // Garder acronymes/codes en majuscules
      if (/^[a-z0-9\-"'\/]+$/i.test(word) && word.length <= 5) {
        return word.toUpperCase();
      }
      // Capitaliser première lettre
      return word.charAt(0).toUpperCase() + word.slice(1);
    })
    .join(' ');
  
  return shortName.substring(0, 150); // Limite 150 caractères
}

/**
 * Mappe la catégorie fournisseur vers nos catégories
 */
function mapCategoryFromSupplier(supplierCategory: string): "PIECES" | "EQUIPEMENTS" | "AUTRES" {
  const cat = supplierCategory.toLowerCase().trim();
  
  // Mapping P2R
  if (cat.includes("pneu") || cat.includes("chambre") || cat.includes("roue") || 
      cat.includes("frein") || cat.includes("transmission") || cat.includes("câble") ||
      cat.includes("chaîne") || cat.includes("cassette") || cat.includes("plateau") ||
      cat.includes("pédale") || cat.includes("selle") || cat.includes("guidon") ||
      cat.includes("potence") || cat.includes("tige") || cat.includes("fourche")) {
    return "PIECES";
  }
  
  if (cat.includes("casque") || cat.includes("gant") || cat.includes("maillot") ||
      cat.includes("cuissard") || cat.includes("chaussure") || cat.includes("sacoche") ||
      cat.includes("bidon") || cat.includes("pompe") || cat.includes("éclairage") ||
      cat.includes("antivol") || cat.includes("compteur")) {
    return "EQUIPEMENTS";
  }
  
  return "AUTRES";
}

/**
 * Détecte la catégorie à partir du nom
 */
function detectCategory(name: string | undefined): "PIECES" | "EQUIPEMENTS" | "AUTRES" {
  if (!name) return "AUTRES";
  
  const nameLower = name.toLowerCase();
  
  // Équipements
  const equipmentKeywords = [
    "casque", "gant", "maillot", "cuissard", "chaussure",
    "sacoche", "bidon", "pompe", "éclairage", "antivol"
  ];
  if (equipmentKeywords.some(kw => nameLower.includes(kw))) {
    return "EQUIPEMENTS";
  }
  
  // Pièces
  const partsKeywords = [
    "pneu", "chambre", "chaîne", "cassette", "plateau",
    "frein", "câble", "gaine", "pédale", "selle",
    "guidon", "potence", "roue", "rayon", "moyeu"
  ];
  if (partsKeywords.some(kw => nameLower.includes(kw))) {
    return "PIECES";
  }
  
  return "AUTRES";
}

/**
 * Génère un SKU unique
 */
export function generateSKU(category: string, name: string): string {
  const prefix = category.substring(0, 3).toUpperCase();
  const namePart = name
    .replace(/[^a-zA-Z0-9]/g, "")
    .substring(0, 6)
    .toUpperCase();
  const timestamp = Date.now().toString(36).substring(-4);
  
  return `${prefix}-${namePart}-${timestamp}`;
}

// ============================================
// UPSERT INTELLIGENT
// ============================================

/**
 * Stratégie d'upsert selon la source
 */
export interface UpsertStrategy {
  // Champs à mettre à jour si l'item existe
  updateFields: (keyof UnifiedCatalogItem)[];
  
  // Champs à ne JAMAIS écraser
  protectedFields: (keyof UnifiedCatalogItem)[];
  
  // Clé de recherche (ean, sku, supplierSku)
  searchBy: "ean" | "sku" | "supplierSku";
}

/**
 * Stratégies par source
 */
export const UPSERT_STRATEGIES: Record<UnifiedCatalogItem["source"], UpsertStrategy> = {
  // CSV Fournisseur : Met à jour prix d'achat, ne touche pas au prix de vente
  supplier_csv: {
    searchBy: "ean",
    updateFields: ["purchasePriceHT", "purchasePriceTTC", "supplierSku", "supplierName", "availability"],
    protectedFields: ["priceHT", "priceTTC", "stockQty", "sku"],
  },
  
  // Scanner : Incrémente stock uniquement
  scanner: {
    searchBy: "ean",
    updateFields: ["stockQty"],
    protectedFields: ["priceHT", "priceTTC", "name", "category"],
  },
  
  // Manuel : Écrase tout sauf métadonnées
  manual: {
    searchBy: "sku",
    updateFields: ["name", "priceHT", "priceTTC", "vatRate", "stockQty", "minStock", "category"],
    protectedFields: ["source", "importedAt"],
  },
};

/**
 * Fusionne deux items selon la stratégie
 */
export function mergeItems(
  existing: UnifiedCatalogItem,
  incoming: UnifiedCatalogItem,
  strategy: UpsertStrategy
): UnifiedCatalogItem {
  const merged = { ...existing };
  
  // Mettre à jour les champs autorisés
  for (const field of strategy.updateFields) {
    if (incoming[field] !== undefined) {
      // Cas spécial : stockQty en mode scanner (incrément)
      if (field === "stockQty" && incoming.source === "scanner") {
        (merged as unknown)[field] = existing.stockQty + incoming.stockQty;
      } else {
        (merged as unknown)[field] = incoming[field];
      }
    }
  }
  
  return merged;
}

// ============================================
// VALIDATION
// ============================================

/**
 * Valide un item unifié
 */
export function validateUnifiedItem(item: UnifiedCatalogItem): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];
  
  // Nom requis
  if (!item.name || item.name.length < 2) {
    errors.push("Le nom doit contenir au moins 2 caractères");
  }
  
  // Prix positifs
  if (item.priceHT < 0) {
    errors.push("Le prix HT doit être positif");
  }
  if (item.priceTTC < 0) {
    errors.push("Le prix TTC doit être positif");
  }
  
  // TVA cohérente (tolérance 1€ pour imports CSV)
  const expectedTTC = item.priceHT * (1 + item.vatRate / 100);
  const ttcDiff = Math.abs(item.priceTTC - expectedTTC);
  if (ttcDiff > 1.0) {
    errors.push(`Prix TTC incohérent: ${item.priceTTC}€ attendu ${expectedTTC.toFixed(2)}€ (écart: ${ttcDiff.toFixed(2)}€)`);
  }
  
  // Stock positif
  if (item.stockQty < 0) {
    errors.push("Le stock ne peut pas être négatif");
  }
  
  // EAN valide (si présent) - Accepter tous codes (P2R utilise codes courts)
  if (item.ean && item.ean.length > 50) {
    errors.push(`Code EAN trop long: ${item.ean} (longueur: ${item.ean.length})`);
  }
  
  return {
    valid: errors.length === 0,
    errors,
  };
}

// ============================================
// EXPORT
// ============================================

const catalogHarmonizer = {
  convertSupplierCSV,
  convertScannedItem,
  convertManualInput,
  generateSKU,
  mergeItems,
  validateUnifiedItem,
  UPSERT_STRATEGIES,
};

export default catalogHarmonizer;
