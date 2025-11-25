#!/usr/bin/env python3
"""
Remplacer TOUS les 'any' par 'unknown' de manière agressive
"""
import re, os, subprocess

print("Recherche de tous les fichiers avec 'any'...\n")

# Obtenir la liste des fichiers avec erreurs any
result = subprocess.run(
    ['npm', 'run', 'lint:ci'],
    capture_output=True,
    text=True,
    shell=True
)

# Parser les fichiers
files_with_any = set()
current_file = None
for line in result.stdout.split('\n') + result.stderr.split('\n'):
    if re.match(r'^[A-Z]:', line):
        current_file = line.strip()
    elif 'no-explicit-any' in line and current_file:
        # Convertir le chemin Windows en chemin relatif
        if 'Atelier-velo+\\' in current_file:
            rel_path = current_file.split('Atelier-velo+\\')[1]
            files_with_any.add(rel_path)

print(f"Trouve {len(files_with_any)} fichiers avec 'any'\n")

# Patterns de remplacement
patterns = [
    # Types simples
    (r'\bRecord<([^,]+),\s*any>', r'Record<\1, unknown>'),
    (r'\bany\[\]', 'unknown[]'),
    (r'<any>', '<unknown>'),
    (r'<any,', '<unknown,'),
    (r',\s*any>', ', unknown>'),
    
    # Paramètres de fonction
    (r':\s*any\b(?!\s*=>)(?!\s*\))', ': unknown'),
    
    # Variables
    (r'\bconst\s+(\w+):\s*any\b', r'const \1: unknown'),
    (r'\blet\s+(\w+):\s*any\b', r'let \1: unknown'),
    (r'\bvar\s+(\w+):\s*any\b', r'var \1: unknown'),
    
    # Cast
    (r'\bas\s+any\b', 'as unknown'),
]

fixed = 0
for filepath in sorted(files_with_any):
    if not os.path.exists(filepath):
        continue
    
    try:
        with open(filepath, 'r', encoding='utf-8') as f:
            content = f.read()
        
        original = content
        for pattern, replacement in patterns:
            content = re.sub(pattern, replacement, content)
        
        if content != original:
            with open(filepath, 'w', encoding='utf-8') as f:
                f.write(content)
            fixed += 1
            print(f"  OK {os.path.basename(filepath)}")
    
    except Exception as e:
        print(f"  ERROR {filepath}: {e}")

print(f"\n{fixed} fichiers corriges\n")

