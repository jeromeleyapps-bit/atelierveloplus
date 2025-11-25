#!/usr/bin/env python3
"""
Remplacer automatiquement les 'any' simples par 'unknown'
Patterns simples : Record<string, any>, any[], etc.
"""
import re, os

# Fichiers à corriger (1 erreur any chacun)
files_to_fix = [
    "src/hooks/useBookingLocalData.ts",
    "src/hooks/useBikesMutations.ts",
    "src/hooks/useCashRegisterMutations.ts",
    "src/hooks/useAppointmentsMutations.ts",
    "src/app/components/BarcodeScanner.tsx",
    "src/app/api/catalog/import/supplier-csv/route.ts",
    "src/hooks/useSystemSettings.ts",
    "src/app/api/auth/login/route.ts",
    "src/lib/db.ts",
    "src/hooks/useAdminCatalogMutations.ts",
    "src/lib/monitoring.ts",
    "src/app/admin/license/page.tsx",
    "src/app/api/finance/invoices/[id]/payments/route.ts",
    "src/lib/logger.ts",
    "src/lib/queryClient.ts",
    "src/app/api/catalog/import/route.ts",
    "src/lib/email-logger.ts",
    "src/app/api/catalog/items/[id]/offers/route.ts",
    "src/app/api/auth/register/route.ts",
]

# Patterns de remplacement simples
replacements = [
    (r'\bRecord<string,\s*any>', 'Record<string, unknown>'),
    (r'\bRecord<string,any>', 'Record<string, unknown>'),
    (r'\bany\[\]', 'unknown[]'),
    (r':\s*any\b(?!\s*=>)', ': unknown'),  # any comme type, pas dans arrow function
    (r'<any>', '<unknown>'),
]

print("Correction automatique des 'any' simples...\n")

fixed = 0
for filepath in files_to_fix:
    if not os.path.exists(filepath):
        print(f"  SKIP {filepath} (introuvable)")
        continue
    
    try:
        with open(filepath, 'r', encoding='utf-8') as f:
            content = f.read()
        
        original = content
        for pattern, replacement in replacements:
            content = re.sub(pattern, replacement, content)
        
        if content != original:
            with open(filepath, 'w', encoding='utf-8') as f:
                f.write(content)
            fixed += 1
            print(f"  OK {os.path.basename(filepath)}")
        else:
            print(f"  SKIP {os.path.basename(filepath)} (aucun pattern simple)")
    
    except Exception as e:
        print(f"  ERROR {filepath}: {e}")

print(f"\n{fixed} fichiers corriges\n")

