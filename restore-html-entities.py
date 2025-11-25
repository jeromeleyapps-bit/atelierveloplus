#!/usr/bin/env python3
"""
Restaurer les entités HTML dans les attributs TypeScript uniquement
"""
import os, re

files = [
    "src/app/account/components/SimpleBookingSection.tsx",
    "src/app/account/page.tsx",
    "src/app/admin/catalog/page.tsx",
    "src/app/admin/guide/page.tsx",
    "src/app/admin/license/blocked/page.tsx",
    "src/app/admin/license/upgrade/page.tsx",
    "src/app/admin/online-booking/page.tsx",
    "src/app/admin/page.tsx",
    "src/app/admin/settings/SmtpConfigCard.tsx",
    "src/app/admin/settings/TunnelConfigDialog.tsx",
    "src/app/admin/settings/page-complete.tsx",
    "src/app/admin/settings/page.tsx",
    "src/app/bikes/history/page.tsx",
    "src/app/catalog/items/[name]/page.tsx",
    "src/app/clear-cache/page.tsx",
    "src/app/components/GlobalTrialBanner.tsx",
    "src/app/components/LineItemsTable.tsx",
    "src/app/components/OnboardingWizard.tsx",
    "src/app/customers/[id]/bikes/page.tsx",
    "src/app/dashboard/page.tsx",
    "src/app/finance/components/CreditsTab.tsx",
    "src/app/finance/components/QuotesTab.tsx",
    "src/app/finance/components/SelectTicketDialog.tsx",
    "src/app/finance/invoices/[id]/page.tsx",
    "src/app/fix-auth/page.tsx",
    "src/app/settings/TunnelConfigDialog.tsx",
    "src/app/suppliers/page.tsx",
    "src/app/tickets/[id]/page.tsx",
    "src/app/tickets/page.tsx",
    "src/components/AppointmentPicker.tsx",
    "src/components/CatalogGrid.tsx",
    "src/components/SupplierCatalogGrid.tsx",
    "src/components/TestInfrastructure.tsx",
    "src/components/catalog-v2/OrdersTab.tsx",
    "src/components/catalog/AddToStockDialog.tsx",
]

print("Restauration des entites HTML dans les types TypeScript...\n")

fixed = 0
for filepath in files:
    if not os.path.exists(filepath):
        continue
    
    try:
        with open(filepath, 'r', encoding='utf-8') as f:
            content = f.read()
        
        original = content
        
        # Restaurer uniquement dans les types TypeScript (entre : et =>)
        # Pattern: severity: 'success' | 'error' => severity: &apos;success&apos; | &apos;error&apos;
        content = re.sub(r":\s*'([^']+)'\s*\|", r": &apos;\1&apos; |", content)
        content = re.sub(r"\|\s*'([^']+)'(?=\s*\))", r"| &apos;\1&apos;", content)
        
        if content != original:
            with open(filepath, 'w', encoding='utf-8') as f:
                f.write(content)
            fixed += 1
            print(f"  OK {os.path.basename(filepath)}")
    
    except Exception as e:
        print(f"  ERROR {filepath}: {e}")

print(f"\n{fixed} fichiers corriges\n")

