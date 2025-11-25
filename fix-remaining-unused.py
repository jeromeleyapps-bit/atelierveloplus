#!/usr/bin/env python3
"""Corriger les 31 variables non utilisées restantes"""
import re, os

# Corrections manuelles basées sur l'analyse
fixes = [
    # electron/init-database.js
    ("electron/init-database.js", 31, r"\bconst Module\b", "const _Module"),
    ("electron/init-database.js", 34, r"\bconst archiver\b", "const _archiver"),
    
    # electron/main.js
    ("electron/main.js", 212, r"\bfunction loadPrismaClient\b", "function _loadPrismaClient"),
    ("electron/main.js", 859, r"\bfunction safeReadFile\b", "function _safeReadFile"),
    
    # electron/server/standalone.js
    ("electron/server/standalone.js", 11, r"\bconst app\b", "const _app"),
    
    # electron/tunnel-validator.js
    ("electron/tunnel-validator.js", 119, r"\bcatch\s*\(\s*e\s*\)", "catch (_e)"),
    
    # electron/tunnel-wizard.js
    ("electron/tunnel-wizard.js", 115, r"\bcatch\s*\(\s*e\s*\)", "catch (_e)"),
    
    # electron/utils/logger.js
    ("electron/utils/logger.js", 53, r"\bconst\s+\{\s*errors\s*\}", "const { errors: _errors }"),
    
    # src/app/admin/license/page.tsx
    ("src/app/admin/license/page.tsx", 136, r"\bconst handleVerify\b", "const _handleVerify"),
    
    # src/app/admin/service-rates/page.tsx
    ("src/app/admin/service-rates/page.tsx", 35, r"\btype ServiceRate\b", "type _ServiceRate"),
    
    # src/app/api/catalog/import/supplier-csv/route.ts
    ("src/app/api/catalog/import/supplier-csv/route.ts", 263, r"\bconst newItem\b", "const _newItem"),
    
    # src/app/api/workorders/[id]/parts/route.ts
    ("src/app/api/workorders/[id]/parts/route.ts", 7, r"\bconst\s+\{\s*id\s*\}", "const { id: _id }"),
    ("src/app/api/workorders/[id]/parts/route.ts", 14, r"\bconst\s+\{\s*id\s*\}", "const { id: _id }"),
    
    # src/app/catalog/pieces/page.tsx
    ("src/app/catalog/pieces/page.tsx", 172, r"\bconst newItem\b", "const _newItem"),
    ("src/app/catalog/pieces/page.tsx", 450, r"\bconst created\b", "const _created"),
    
    # src/app/catalog/services/page.tsx
    ("src/app/catalog/services/page.tsx", 40, r"\btype ServiceRate\b", "type _ServiceRate"),
    ("src/app/catalog/services/page.tsx", 266, r",\s*key\s*\)", ", _key)"),
    ("src/app/catalog/services/page.tsx", 387, r",\s*key\s*\)", ", _key)"),
    
    # src/app/finance/page.tsx
    ("src/app/finance/page.tsx", 63, r"\bconst queryClient\b", "const _queryClient"),
    ("src/app/finance/page.tsx", 82, r",\s*setSortBy,\s*setSortDir\s*\]", ", _setSortBy, _setSortDir ]"),
    ("src/app/finance/page.tsx", 94, r",\s*setFromDate\s*\]", ", _setFromDate ]"),
    ("src/app/finance/page.tsx", 98, r",\s*setToDate\s*\]", ", _setToDate ]"),
    ("src/app/finance/page.tsx", 222, r"\bconst calcRevenue\b", "const _calcRevenue"),
    ("src/app/finance/page.tsx", 235, r"\bconst exportPaidCsv\b", "const _exportPaidCsv"),
    
    # src/components/RepairTimerBar.tsx
    ("src/components/RepairTimerBar.tsx", 33, r",\s*activeTimer\s*\]", ", _activeTimer ]"),
    
    # src/hooks/useTicketsData.ts
    ("src/hooks/useTicketsData.ts", 16, r"\bconst queryClient\b", "const _queryClient"),
    
    # src/lib/suppliers/mock.ts
    ("src/lib/suppliers/mock.ts", 7, r"\btype SupplierCredentials\b", "type _SupplierCredentials"),
]

print("Correction des variables non utilisees restantes...\n")

fixed = 0
for filepath, line_num, pattern, replacement in fixes:
    if not os.path.exists(filepath):
        print(f"  SKIP {filepath} (introuvable)")
        continue
    
    try:
        with open(filepath, 'r', encoding='utf-8') as f:
            lines = f.readlines()
        
        if line_num - 1 >= len(lines):
            print(f"  SKIP {filepath}:{line_num} (ligne invalide)")
            continue
        
        old_line = lines[line_num - 1]
        new_line = re.sub(pattern, replacement, old_line)
        
        if new_line != old_line:
            lines[line_num - 1] = new_line
            with open(filepath, 'w', encoding='utf-8') as f:
                f.writelines(lines)
            fixed += 1
            print(f"  OK {os.path.basename(filepath)}:{line_num}")
        else:
            print(f"  SKIP {os.path.basename(filepath)}:{line_num} (pattern non trouve)")
    
    except Exception as e:
        print(f"  ERROR {filepath}: {e}")

print(f"\n{fixed} corrections appliquees\n")

