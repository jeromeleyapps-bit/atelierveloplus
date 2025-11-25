#!/usr/bin/env python3
"""Corriger les 10 dernières variables non utilisées"""
import re, os

fixes = [
    # 1. electron/index.js - TIMEOUTS (déjà _TIMEOUTS dans constants.js, supprimer export)
    # Cette erreur est résiduelle, on va la corriger dans constants.js
    
    # 2. src/app/catalog/services/page.tsx - ServiceRate, key (2x)
    ("src/app/catalog/services/page.tsx", 40, r"type ServiceRate =", "type _ServiceRate ="),
    ("src/app/catalog/services/page.tsx", 266, r"\(item, key\)", "(item, _key)"),
    ("src/app/catalog/services/page.tsx", 387, r"\(item, key\)", "(item, _key)"),
    
    # 3. src/app/finance/page.tsx - setSortBy, setSortDir, calcRevenue, exportPaidCsv
    ("src/app/finance/page.tsx", 82, r"setSortBy, setSortDir", "_setSortBy, _setSortDir"),
    ("src/app/finance/page.tsx", 222, r"const calcRevenue =", "const _calcRevenue ="),
    ("src/app/finance/page.tsx", 235, r"const exportPaidCsv =", "const _exportPaidCsv ="),
    
    # 4. src/components/RepairTimerBar.tsx - activeTimer
    ("src/components/RepairTimerBar.tsx", 33, r", activeTimer\s*\]", ", _activeTimer ]"),
    
    # 5. src/lib/suppliers/mock.ts - SupplierCredentials
    ("src/lib/suppliers/mock.ts", 7, r"type SupplierCredentials =", "type _SupplierCredentials ="),
]

print("Correction des 10 dernieres erreurs...\n")

fixed = 0
for filepath, line_num, pattern, replacement in fixes:
    if not os.path.exists(filepath):
        print(f"  SKIP {filepath}")
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
            print(f"  SKIP {os.path.basename(filepath)}:{line_num} (non trouve)")
    
    except Exception as e:
        print(f"  ERROR {filepath}: {e}")

print(f"\n{fixed} corrections\n")

# Correction spéciale pour TIMEOUTS dans electron/config/constants.js
# L'erreur vient du fait que _TIMEOUTS est exporté mais jamais importé
# On va simplement supprimer l'export
try:
    filepath = "electron/config/constants.js"
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()
    
    # Supprimer TIMEOUTS de l'export
    new_content = re.sub(r'TIMEOUTS:\s*_TIMEOUTS,', '// TIMEOUTS: _TIMEOUTS, // Unused', content)
    
    if new_content != content:
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(new_content)
        print("  OK constants.js - TIMEOUTS retire de l'export")
        fixed += 1
except Exception as e:
    print(f"  ERROR constants.js: {e}")

print(f"\nTotal: {fixed} corrections\n")

