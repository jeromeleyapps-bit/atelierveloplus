# Script PowerShell pour corriger toutes les variables non utilisées
# Lit le fichier lint-errors.txt et applique les corrections

Write-Host "🔧 Correction automatique des variables non utilisées..." -ForegroundColor Cyan

$errors = Get-Content lint-errors.txt | Select-String "error.*'(.+?)' is (?:defined but never used|assigned a value but never used).*no-unused-vars"

$fixedCount = 0
$errorsByFile = @{}

foreach ($error in $errors) {
    if ($error -match "^(.+?):(\d+):(\d+)\s+error\s+'(.+?)' is") {
        $file = $matches[1].Trim()
        $line = [int]$matches[2]
        $varName = $matches[4]
        
        if (-not $errorsByFile.ContainsKey($file)) {
            $errorsByFile[$file] = @()
        }
        
        $errorsByFile[$file] += @{
            Line = $line
            VarName = $varName
        }
    }
}

Write-Host "`n📊 Trouvé $($errors.Count) variables dans $($errorsByFile.Keys.Count) fichiers`n" -ForegroundColor Yellow

foreach ($file in $errorsByFile.Keys) {
    if (Test-Path $file) {
        try {
            $content = Get-Content $file -Raw
            $lines = Get-Content $file
            
            # Trier par ligne décroissante pour ne pas décaler les numéros
            $fileErrors = $errorsByFile[$file] | Sort-Object -Property Line -Descending
            
            $modified = $false
            foreach ($err in $fileErrors) {
                $varName = $err.VarName
                $lineIdx = $err.Line - 1
                
                if ($lineIdx -ge 0 -and $lineIdx -lt $lines.Count) {
                    $oldLine = $lines[$lineIdx]
                    
                    # Patterns de remplacement
                    $newLine = $oldLine `
                        -replace "\bconst\s+$varName\b", "const _$varName" `
                        -replace "\blet\s+$varName\b", "let _$varName" `
                        -replace "\bvar\s+$varName\b", "var _$varName" `
                        -replace "\bcatch\s*\(\s*$varName\s*\)", "catch (_$varName)" `
                        -replace "\bfunction\s+$varName\b", "function _$varName" `
                        -replace "([,(])\s*$varName\s*([,)])", "`$1 _$varName `$2"
                    
                    if ($newLine -ne $oldLine) {
                        $lines[$lineIdx] = $newLine
                        $modified = $true
                        $fixedCount++
                        Write-Host "  ✓ $($file.Split('\')[-1]):$($err.Line) - $varName → _$varName" -ForegroundColor Green
                    }
                }
            }
            
            if ($modified) {
                $lines | Set-Content $file -Encoding UTF8
            }
            
        } catch {
            Write-Host "  ✗ Erreur sur $file : $_" -ForegroundColor Red
        }
    }
}

Write-Host "`n✅ $fixedCount variables corrigées`n" -ForegroundColor Green
Write-Host "🔍 Vérification des erreurs restantes...`n" -ForegroundColor Cyan

# Relancer le lint
npm run lint:ci 2>&1 | Select-String "no-unused-vars" | Measure-Object | Select-Object -ExpandProperty Count | ForEach-Object {
    Write-Host "Erreurs restantes: $_" -ForegroundColor $(if ($_ -eq 0) { "Green" } else { "Yellow" })
}

