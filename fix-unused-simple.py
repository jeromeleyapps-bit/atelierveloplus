#!/usr/bin/env python3
"""
Script simple pour corriger les variables non utilisées
Lit lint-errors.txt et préfixe les variables par _
"""

import re
import os
from collections import defaultdict

print("Correction des variables non utilisees...\n")

# Lire le fichier d'erreurs
with open('lint-errors.txt', 'r', encoding='utf-8') as f:
    content = f.read()

# Parser les erreurs
# Format: C:\...\file.js
#   line:col  error  'varName' is ... @typescript-eslint/no-unused-vars
pattern = r"^([A-Z]:.+?)\s*$\s+(\d+):(\d+)\s+error\s+'(.+?)' is (?:defined but never used|assigned a value but never used).*no-unused-vars"

errors = defaultdict(list)
for match in re.finditer(pattern, content, re.MULTILINE):
    filepath = match.group(1).strip()
    line_num = int(match.group(2))
    var_name = match.group(4)
    
    errors[filepath].append({
        'line': line_num,
        'var': var_name
    })

print(f"Trouve {sum(len(v) for v in errors.values())} erreurs dans {len(errors)} fichiers\n")

fixed_count = 0

for filepath, file_errors in errors.items():
    if not os.path.exists(filepath):
        print(f"  WARN Fichier introuvable: {filepath}")
        continue
    
    try:
        with open(filepath, 'r', encoding='utf-8') as f:
            lines = f.readlines()
        
        # Trier par ligne décroissante pour ne pas décaler les numéros
        file_errors.sort(key=lambda x: x['line'], reverse=True)
        
        for err in file_errors:
            line_idx = err['line'] - 1
            var_name = err['var']
            
            if 0 <= line_idx < len(lines):
                old_line = lines[line_idx]
                
                # Patterns de remplacement (ordre important!)
                replacements = [
                    (rf'\bconst\s+{re.escape(var_name)}\b', f'const _{var_name}'),
                    (rf'\blet\s+{re.escape(var_name)}\b', f'let _{var_name}'),
                    (rf'\bvar\s+{re.escape(var_name)}\b', f'var _{var_name}'),
                    (rf'\bcatch\s*\(\s*{re.escape(var_name)}\s*\)', f'catch (_{var_name})'),
                    (rf'\bfunction\s+{re.escape(var_name)}\b', f'function _{var_name}'),
                    (rf'\btype\s+{re.escape(var_name)}\b', f'type _{var_name}'),
                    (rf'\binterface\s+{re.escape(var_name)}\b', f'interface _{var_name}'),
                ]
                
                new_line = old_line
                for pattern, replacement in replacements:
                    new_line = re.sub(pattern, replacement, new_line)
                
                if new_line != old_line:
                    lines[line_idx] = new_line
                    fixed_count += 1
                    filename = os.path.basename(filepath)
                    print(f"  OK {filename}:{err['line']} - {var_name} -> _{var_name}")
        
        # Écrire le fichier modifié
        with open(filepath, 'w', encoding='utf-8') as f:
            f.writelines(lines)
    
    except Exception as e:
        print(f"  ERROR sur {filepath}: {e}")

print(f"\n{fixed_count} variables corrigees\n")
print("Relancer npm run lint:ci pour verifier...")

