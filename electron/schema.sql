-- CreateTable
CREATE TABLE "Account" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "providerAccountId" TEXT NOT NULL,
    "refresh_token" TEXT,
    "access_token" TEXT,
    "expires_at" INTEGER,
    "token_type" TEXT,
    "scope" TEXT,
    "id_token" TEXT,
    "session_state" TEXT,
    CONSTRAINT "Account_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "AppSetting" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "shopName" TEXT,
    "shopEmail" TEXT,
    "shopPhone" TEXT,
    "address1" TEXT,
    "address2" TEXT,
    "zip" TEXT,
    "city" TEXT,
    "country" TEXT,
    "shopLogo" TEXT,
    "legalFooter" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "capital" TEXT,
    "insurance" TEXT,
    "rcs" TEXT,
    "siret" TEXT,
    "tva" TEXT,
    "isAutoEntrepreneur" BOOLEAN NOT NULL DEFAULT false,
    CONSTRAINT "AppSetting_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Bike" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'ROAD',
    "condition" TEXT NOT NULL DEFAULT 'NEW',
    "brand" TEXT NOT NULL,
    "model" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "size" TEXT NOT NULL,
    "color" TEXT,
    "serialNumber" TEXT,
    "frameSize" TEXT,
    "frameMaterial" TEXT,
    "wheelSize" TEXT,
    "weight" REAL,
    "groupset" TEXT,
    "brakeType" TEXT,
    "drivetrain" TEXT,
    "fork" TEXT,
    "wheels" TEXT,
    "isElectric" BOOLEAN NOT NULL DEFAULT false,
    "motor" TEXT,
    "battery" INTEGER,
    "range" INTEGER,
    "mileage" INTEGER,
    "conditionNotes" TEXT,
    "maintenanceHistory" TEXT,
    "purchasePriceHT" REAL NOT NULL,
    "sellingPriceHT" REAL NOT NULL,
    "vatRate" REAL NOT NULL DEFAULT 0.20,
    "stock" INTEGER NOT NULL DEFAULT 1,
    "location" TEXT,
    "photos" TEXT,
    "internalNotes" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "userId" TEXT NOT NULL,
    CONSTRAINT "Bike_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Booking" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "start" DATETIME NOT NULL,
    "end" DATETIME NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "name" TEXT NOT NULL,
    "email" TEXT,
    "phone" TEXT,
    "bike" TEXT,
    "description" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "customerId" TEXT,
    CONSTRAINT "Booking_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "CalendarBlock" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "reason" TEXT,
    "start" DATETIME NOT NULL,
    "end" DATETIME NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "CalendarConfig" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "timezone" TEXT NOT NULL DEFAULT 'Europe/Paris',
    "slotMinutes" INTEGER NOT NULL DEFAULT 60,
    "leadTimeHours" INTEGER NOT NULL DEFAULT 6,
    "maxConcurrent" INTEGER NOT NULL DEFAULT 1,
    "saturdayByAppt" BOOLEAN NOT NULL DEFAULT true,
    "businessHours" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "CalendarEvent" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "start" DATETIME NOT NULL,
    "end" DATETIME NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'planned',
    "blocksAvail" BOOLEAN NOT NULL DEFAULT true,
    "color" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "CashRegister" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "type" TEXT NOT NULL,
    "amount" REAL NOT NULL,
    "description" TEXT,
    "invoiceId" TEXT,
    "userId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "CashRegister_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "CashRegister_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "Invoice" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "CatalogItem" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "sku" TEXT,
    "ean" TEXT,
    "supplierSku" TEXT,
    "category" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "priceHT" REAL NOT NULL,
    "priceTTC" REAL NOT NULL,
    "vatRate" REAL NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "stockQty" INTEGER NOT NULL DEFAULT 0,
    "minStock" INTEGER NOT NULL DEFAULT 0,
    "reorderQty" INTEGER NOT NULL DEFAULT 0,
    "location" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "purchasePriceHT" REAL,
    "purchasePriceTTC" REAL,
    "supplierVatEnabled" BOOLEAN NOT NULL DEFAULT false,
    "supplierName" TEXT,
    "availability" TEXT,
    "marginCoeff" REAL DEFAULT 1
);

-- CreateTable
CREATE TABLE "Communication" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "customerId" TEXT NOT NULL,
    "workOrderId" TEXT,
    "invoiceId" TEXT,
    "type" TEXT NOT NULL,
    "event" TEXT NOT NULL,
    "recipient" TEXT NOT NULL,
    "subject" TEXT,
    "content" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "provider" TEXT NOT NULL DEFAULT 'hubspot',
    "externalId" TEXT,
    "sentAt" DATETIME,
    "deliveredAt" DATETIME,
    "error" TEXT,
    "metadata" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Communication_workOrderId_fkey" FOREIGN KEY ("workOrderId") REFERENCES "WorkOrder" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Communication_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Customer" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "email" TEXT,
    "firstName" TEXT,
    "lastName" TEXT,
    "phone" TEXT,
    "address1" TEXT,
    "address2" TEXT,
    "zip" TEXT,
    "city" TEXT,
    "country" TEXT,
    "bikeBrand" TEXT,
    "bikeModel" TEXT,
    "nationalFileId" TEXT,
    "shipAddress1" TEXT,
    "shipAddress2" TEXT,
    "shipZip" TEXT,
    "shipCity" TEXT,
    "shipCountry" TEXT,
    "notes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "lastServiceDate" DATETIME,
    "maintenanceInterval" INTEGER NOT NULL DEFAULT 6,
    "maintenanceReminderSent" BOOLEAN NOT NULL DEFAULT false,
    "maintenanceReminderSentAt" DATETIME,
    "marketingOptIn" BOOLEAN NOT NULL DEFAULT true
);

-- CreateTable
CREATE TABLE "CustomerBike" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "customerId" TEXT NOT NULL,
    "index" INTEGER NOT NULL,
    "brand" TEXT,
    "model" TEXT,
    "nationalFileId" TEXT,
    "serialNumber" TEXT,
    "color" TEXT,
    "notes" TEXT,
    "wheelSize" TEXT,
    "tireSize" TEXT,
    "frameMaterial" TEXT,
    "frameSize" TEXT,
    "brakeType" TEXT,
    "gearSystem" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "CustomerBike_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "EmailTemplate" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "event" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "htmlContent" TEXT NOT NULL,
    "textContent" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "GlobalSetting" (
    "key" TEXT NOT NULL PRIMARY KEY,
    "value" TEXT
);

-- CreateTable
CREATE TABLE "Invoice" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "workOrderId" TEXT,
    "number" TEXT,
    "issueDate" DATETIME,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "type" TEXT NOT NULL DEFAULT 'invoice',
    "parentId" TEXT,
    "pricingMode" TEXT NOT NULL DEFAULT 'HT_TVA',
    "currency" TEXT NOT NULL DEFAULT 'EUR',
    "vatRate" REAL NOT NULL DEFAULT 20,
    "laborRate" REAL NOT NULL DEFAULT 60,
    "subtotalHT" REAL NOT NULL DEFAULT 0,
    "vatAmount" REAL NOT NULL DEFAULT 0,
    "totalTTC" REAL NOT NULL DEFAULT 0,
    "discountAmount" REAL DEFAULT 0,
    "paidAt" DATETIME,
    "paymentMethod" TEXT,
    "cancelledAt" DATETIME,
    "cancelledReason" TEXT,
    "dueDate" DATETIME,
    "reminderCount" INTEGER NOT NULL DEFAULT 0,
    "lastReminderAt" DATETIME,
    "stripePaymentLinkId" TEXT,
    "stripePaymentLinkUrl" TEXT,
    "stripePaymentIntentId" TEXT,
    "stripePaymentStatus" TEXT,
    "stripePaidAt" DATETIME,
    "validUntil" DATETIME,
    "convertedAt" DATETIME,
    "convertedToId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "customerId" TEXT,
    CONSTRAINT "Invoice_workOrderId_fkey" FOREIGN KEY ("workOrderId") REFERENCES "WorkOrder" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "InvoiceLine" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "invoiceId" TEXT NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'part',
    "description" TEXT NOT NULL,
    "qty" REAL NOT NULL DEFAULT 1,
    "unitPriceHT" REAL,
    "unitPriceTTC" REAL,
    "vatRate" REAL,
    "totalHT" REAL NOT NULL DEFAULT 0,
    "totalTTC" REAL NOT NULL DEFAULT 0,
    "partId" TEXT,
    "purchasePriceHT" REAL,
    CONSTRAINT "InvoiceLine_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "Invoice" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "InvoicePayment" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "invoiceId" TEXT NOT NULL,
    "amount" REAL NOT NULL,
    "method" TEXT,
    "paidAt" DATETIME NOT NULL,
    "note" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "InvoicePayment_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "Invoice" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "InvoiceSequence" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "year" INTEGER NOT NULL,
    "lastNumber" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "PricingMargin" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "minPrice" REAL NOT NULL,
    "maxPrice" REAL,
    "coefficient" REAL NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "SMSTemplate" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "event" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "ServiceRate" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "priceHT" REAL NOT NULL,
    "bikeType" TEXT,
    "category" TEXT,
    "duration" INTEGER,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "Session" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "sessionToken" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "expires" DATETIME NOT NULL,
    CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "StockMovement" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "itemId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "qty" INTEGER NOT NULL,
    "refType" TEXT,
    "refId" TEXT,
    "note" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "StockMovement_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "CatalogItem" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Supplier" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "website" TEXT,
    "connectorType" TEXT NOT NULL DEFAULT 'MOCK',
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "SupplierCredential" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "supplierId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "username" TEXT,
    "password" TEXT,
    "extraJson" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "SupplierCredential_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "Supplier" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "SupplierItem" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "supplierId" TEXT NOT NULL,
    "catalogItemId" TEXT,
    "supplierSku" TEXT NOT NULL,
    "ean" TEXT,
    "lastPriceHT" REAL,
    "lastAvailability" TEXT,
    "lastCheckedAt" DATETIME,
    "favorite" BOOLEAN NOT NULL DEFAULT false,
    CONSTRAINT "SupplierItem_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "Supplier" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "SupplierItem_catalogItemId_fkey" FOREIGN KEY ("catalogItemId") REFERENCES "CatalogItem" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "SupplierOffer" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "supplierId" TEXT NOT NULL,
    "catalogItemId" TEXT,
    "externalId" TEXT,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "reference" TEXT,
    "brand" TEXT,
    "price" REAL NOT NULL,
    "priceHT" REAL,
    "currency" TEXT NOT NULL DEFAULT 'EUR',
    "availability" TEXT,
    "stock" INTEGER,
    "deliveryDays" INTEGER,
    "url" TEXT,
    "imageUrl" TEXT,
    "metadata" TEXT,
    "fetchedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" DATETIME NOT NULL,
    CONSTRAINT "SupplierOffer_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "Supplier" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "SupplierOffer_catalogItemId_fkey" FOREIGN KEY ("catalogItemId") REFERENCES "CatalogItem" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "SupplierProduct" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "reference" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "category" TEXT,
    "priceHT" REAL NOT NULL,
    "stock" INTEGER NOT NULL DEFAULT 0,
    "available" BOOLEAN NOT NULL DEFAULT true,
    "supplierName" TEXT NOT NULL DEFAULT 'Fournisseur',
    "lastImport" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "SupplierProduct_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "SystemSettings" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "notificationsEnabled" BOOLEAN NOT NULL DEFAULT true,
    "emailNotificationsEnabled" BOOLEAN NOT NULL DEFAULT true,
    "activityLogsEnabled" BOOLEAN NOT NULL DEFAULT true,
    "automatedEmailsEnabled" BOOLEAN NOT NULL DEFAULT true,
    "autoBackupEnabled" BOOLEAN NOT NULL DEFAULT false,
    "backupFrequency" TEXT NOT NULL DEFAULT 'weekly',
    "emailProvider" TEXT NOT NULL DEFAULT 'resend',
    "emailApiKey" TEXT,
    "emailFromAddress" TEXT,
    "emailFromName" TEXT,
    "requireAdmin2FA" BOOLEAN NOT NULL DEFAULT false,
    "hardDeleteEnabled" BOOLEAN NOT NULL DEFAULT false,
    "maintenanceMode" BOOLEAN NOT NULL DEFAULT false,
    "securityAlertsEnabled" BOOLEAN NOT NULL DEFAULT true,
    "tunnelConfigured" BOOLEAN NOT NULL DEFAULT false,
    "tunnelHostname" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "smtpHost" TEXT,
    "smtpPort" INTEGER DEFAULT 587,
    "smtpSecure" BOOLEAN NOT NULL DEFAULT false,
    "smtpUser" TEXT,
    "smtpPass" TEXT,
    CONSTRAINT "SystemSettings_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "AppointmentConfig" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "openingDays" TEXT NOT NULL DEFAULT '{"monday":true,"tuesday":true,"wednesday":true,"thursday":true,"friday":true,"saturday":false,"sunday":false}',
    "openingHours" TEXT NOT NULL DEFAULT '{"monday":{"start":"09:00","end":"18:00"},"tuesday":{"start":"09:00","end":"18:00"},"wednesday":{"start":"09:00","end":"18:00"},"thursday":{"start":"09:00","end":"18:00"},"friday":{"start":"09:00","end":"18:00"},"saturday":{"start":"10:00","end":"17:00"},"sunday":{"start":"09:00","end":"18:00"}}',
    "appointmentOnlyDayEnabled" BOOLEAN NOT NULL DEFAULT false,
    "appointmentOnlyDay" TEXT,
    "appointmentOnlyDayPhone" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "AppointmentConfig_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT,
    "email" TEXT NOT NULL,
    "emailVerified" DATETIME,
    "image" TEXT,
    "password" TEXT,
    "role" TEXT NOT NULL DEFAULT 'admin',
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "VerificationToken" (
    "identifier" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expires" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "WorkOrder" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "status" TEXT NOT NULL DEFAULT 'created',
    "customerId" TEXT,
    "bikeId" TEXT,
    "type" TEXT DEFAULT 'repair',
    "estimatedMinutes" INTEGER,
    "hourlyRate" REAL,
    "appointmentDate" DATETIME,
    "calendarEventId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "dueAt" DATETIME,
    "completedAt" DATETIME,
    "satisfactionEmailSent" BOOLEAN NOT NULL DEFAULT false,
    "satisfactionEmailSentAt" DATETIME,
    "satisfactionRating" INTEGER,
    "satisfactionComment" TEXT,
    "clientSignature" TEXT,
    "clientSignedAt" DATETIME,
    "clientSignedName" TEXT,
    "intakeCondition" TEXT,
    "intakeAccessories" TEXT,
    "intakeSignature" TEXT,
    "intakeSignedAt" DATETIME,
    CONSTRAINT "WorkOrder_calendarEventId_fkey" FOREIGN KEY ("calendarEventId") REFERENCES "CalendarEvent" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "WorkOrder_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "WorkOrder_bikeId_fkey" FOREIGN KEY ("bikeId") REFERENCES "CustomerBike" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "WorkOrderLine" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "workOrderId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "priceHT" REAL NOT NULL,
    "vatRate" REAL NOT NULL,
    "duration" INTEGER,
    "sourceId" TEXT,
    "notes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "WorkOrderLine_workOrderId_fkey" FOREIGN KEY ("workOrderId") REFERENCES "WorkOrder" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ServicePackage" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "ServicePackageLine" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "packageId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "quantity" REAL NOT NULL DEFAULT 1,
    "priceHT" REAL NOT NULL DEFAULT 0,
    "vatRate" REAL NOT NULL DEFAULT 20,
    "duration" INTEGER,
    CONSTRAINT "ServicePackageLine_packageId_fkey" FOREIGN KEY ("packageId") REFERENCES "ServicePackage" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Deposit" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "workOrderId" TEXT,
    "invoiceId" TEXT,
    "amount" REAL NOT NULL,
    "method" TEXT,
    "note" TEXT,
    "receiptNumber" TEXT NOT NULL,
    "refunded" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "License" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "key" TEXT NOT NULL,
    "tier" TEXT NOT NULL DEFAULT 'basique',
    "status" TEXT NOT NULL DEFAULT 'active',
    "activatedAt" DATETIME,
    "expiresAt" DATETIME,
    "lastVerified" DATETIME,
    "verificationToken" TEXT,
    "trialStartedAt" DATETIME,
    "trialEndsAt" DATETIME,
    "gracePeriodEndsAt" DATETIME,
    "isLifetime" BOOLEAN NOT NULL DEFAULT false,
    "maintenanceExpiresAt" DATETIME,
    "maxEmailsPerMonth" INTEGER NOT NULL DEFAULT 30,
    "emailsThisMonth" INTEGER NOT NULL DEFAULT 0,
    "emailResetDate" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "marketingEnabled" BOOLEAN NOT NULL DEFAULT false,
    "bookingEnabled" BOOLEAN NOT NULL DEFAULT false,
    "advancedStatsEnabled" BOOLEAN NOT NULL DEFAULT false,
    "pdfDirectSendEnabled" BOOLEAN NOT NULL DEFAULT false,
    "customerEmail" TEXT,
    "customerName" TEXT,
    "hardwareId" TEXT,
    "lastExpirationEmailDays" INTEGER,
    "lastMaintenanceEmailDays" INTEGER,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "StripeConnection" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "livemode" BOOLEAN NOT NULL DEFAULT false,
    "publishableKey" TEXT NOT NULL,
    "secretKeyEncrypted" TEXT NOT NULL,
    "accountLabel" TEXT,
    "status" TEXT NOT NULL DEFAULT 'active',
    "connectedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "LicenseVerification" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "licenseId" TEXT NOT NULL,
    "verificationType" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "responseCode" TEXT,
    "errorMessage" TEXT,
    "verifiedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "LicenseVerification_licenseId_fkey" FOREIGN KEY ("licenseId") REFERENCES "License" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "_schema_version" (
    "version" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "applied_at" DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- CreateIndex
CREATE UNIQUE INDEX "Account_provider_providerAccountId_key" ON "Account"("provider", "providerAccountId");

-- CreateIndex
CREATE UNIQUE INDEX "AppSetting_userId_key" ON "AppSetting"("userId");

-- CreateIndex
Pragma writable_schema=1;
CREATE UNIQUE INDEX "sqlite_autoindex_Bike_2" ON "Bike"("serialNumber");
Pragma writable_schema=0;

-- CreateIndex
CREATE INDEX "Bike_brand_idx" ON "Bike"("brand");

-- CreateIndex
CREATE INDEX "Bike_condition_idx" ON "Bike"("condition");

-- CreateIndex
CREATE INDEX "Bike_type_idx" ON "Bike"("type");

-- CreateIndex
CREATE INDEX "Bike_userId_active_idx" ON "Bike"("userId", "active");

-- CreateIndex
CREATE INDEX "Bike_userId_idx" ON "Bike"("userId");

-- CreateIndex
CREATE INDEX "Booking_customerId_idx" ON "Booking"("customerId");

-- CreateIndex
CREATE INDEX "Booking_start_end_idx" ON "Booking"("start", "end");

-- CreateIndex
CREATE INDEX "CashRegister_userId_idx" ON "CashRegister"("userId");

-- CreateIndex
CREATE INDEX "CashRegister_invoiceId_idx" ON "CashRegister"("invoiceId");

-- CreateIndex
CREATE INDEX "CashRegister_createdAt_idx" ON "CashRegister"("createdAt");

-- CreateIndex
CREATE INDEX "CashRegister_type_idx" ON "CashRegister"("type");

-- CreateIndex
CREATE UNIQUE INDEX "CatalogItem_sku_key" ON "CatalogItem"("sku");

-- CreateIndex
CREATE INDEX "CatalogItem_supplierSku_idx" ON "CatalogItem"("supplierSku");

-- CreateIndex
CREATE INDEX "CatalogItem_ean_idx" ON "CatalogItem"("ean");

-- CreateIndex
CREATE INDEX "Communication_event_idx" ON "Communication"("event");

-- CreateIndex
CREATE INDEX "Communication_status_idx" ON "Communication"("status");

-- CreateIndex
CREATE INDEX "Communication_workOrderId_idx" ON "Communication"("workOrderId");

-- CreateIndex
CREATE INDEX "Communication_customerId_idx" ON "Communication"("customerId");

-- CreateIndex
CREATE UNIQUE INDEX "Customer_email_key" ON "Customer"("email");

-- CreateIndex
CREATE INDEX "Customer_lastServiceDate_idx" ON "Customer"("lastServiceDate");

-- CreateIndex
CREATE INDEX "Customer_maintenanceReminderSent_idx" ON "Customer"("maintenanceReminderSent");

-- CreateIndex
CREATE INDEX "Customer_marketingOptIn_idx" ON "Customer"("marketingOptIn");

-- CreateIndex
CREATE UNIQUE INDEX "CustomerBike_customerId_index_key" ON "CustomerBike"("customerId", "index");

-- CreateIndex
CREATE UNIQUE INDEX "EmailTemplate_name_key" ON "EmailTemplate"("name");

-- CreateIndex
CREATE INDEX "EmailTemplate_event_idx" ON "EmailTemplate"("event");

-- CreateIndex
CREATE UNIQUE INDEX "Invoice_number_key" ON "Invoice"("number");

-- CreateIndex
CREATE INDEX "Invoice_customerId_idx" ON "Invoice"("customerId");

-- CreateIndex
CREATE INDEX "Invoice_status_createdAt_idx" ON "Invoice"("status", "createdAt");

-- CreateIndex
CREATE INDEX "Invoice_customerId_status_idx" ON "Invoice"("customerId", "status");

-- CreateIndex
CREATE INDEX "InvoicePayment_invoiceId_idx" ON "InvoicePayment"("invoiceId");

-- CreateIndex
CREATE UNIQUE INDEX "InvoiceSequence_year_key" ON "InvoiceSequence"("year");

-- CreateIndex
CREATE INDEX "PricingMargin_minPrice_idx" ON "PricingMargin"("minPrice");

-- CreateIndex
CREATE UNIQUE INDEX "SMSTemplate_name_key" ON "SMSTemplate"("name");

-- CreateIndex
CREATE INDEX "SMSTemplate_event_idx" ON "SMSTemplate"("event");

-- CreateIndex
CREATE INDEX "ServiceRate_category_idx" ON "ServiceRate"("category");

-- CreateIndex
CREATE INDEX "ServiceRate_bikeType_idx" ON "ServiceRate"("bikeType");

-- CreateIndex
CREATE INDEX "ServiceRate_active_idx" ON "ServiceRate"("active");

-- CreateIndex
CREATE UNIQUE INDEX "Session_sessionToken_key" ON "Session"("sessionToken");

-- CreateIndex
CREATE INDEX "SupplierOffer_expiresAt_idx" ON "SupplierOffer"("expiresAt");

-- CreateIndex
CREATE INDEX "SupplierOffer_fetchedAt_idx" ON "SupplierOffer"("fetchedAt");

-- CreateIndex
CREATE INDEX "SupplierOffer_externalId_idx" ON "SupplierOffer"("externalId");

-- CreateIndex
CREATE INDEX "SupplierOffer_catalogItemId_idx" ON "SupplierOffer"("catalogItemId");

-- CreateIndex
CREATE INDEX "SupplierOffer_supplierId_idx" ON "SupplierOffer"("supplierId");

-- CreateIndex
CREATE INDEX "SupplierProduct_userId_name_idx" ON "SupplierProduct"("userId", "name");

-- CreateIndex
CREATE INDEX "SupplierProduct_userId_category_idx" ON "SupplierProduct"("userId", "category");

-- CreateIndex
CREATE UNIQUE INDEX "SupplierProduct_userId_reference_key" ON "SupplierProduct"("userId", "reference");

-- CreateIndex
CREATE UNIQUE INDEX "SystemSettings_userId_key" ON "SystemSettings"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "AppointmentConfig_userId_key" ON "AppointmentConfig"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "VerificationToken_token_key" ON "VerificationToken"("token");

-- CreateIndex
CREATE UNIQUE INDEX "VerificationToken_identifier_token_key" ON "VerificationToken"("identifier", "token");

-- CreateIndex
CREATE INDEX "WorkOrder_status_idx" ON "WorkOrder"("status");

-- CreateIndex
CREATE INDEX "WorkOrder_bikeId_idx" ON "WorkOrder"("bikeId");

-- CreateIndex
CREATE INDEX "WorkOrder_customerId_idx" ON "WorkOrder"("customerId");

-- CreateIndex
CREATE INDEX "WorkOrder_completedAt_idx" ON "WorkOrder"("completedAt");

-- CreateIndex
CREATE INDEX "WorkOrder_satisfactionEmailSent_idx" ON "WorkOrder"("satisfactionEmailSent");

-- CreateIndex
CREATE INDEX "WorkOrder_status_createdAt_idx" ON "WorkOrder"("status", "createdAt");

-- CreateIndex
CREATE INDEX "WorkOrder_customerId_status_idx" ON "WorkOrder"("customerId", "status");

-- CreateIndex
CREATE INDEX "WorkOrderLine_type_idx" ON "WorkOrderLine"("type");

-- CreateIndex
CREATE INDEX "WorkOrderLine_workOrderId_idx" ON "WorkOrderLine"("workOrderId");

-- CreateIndex
CREATE INDEX "ServicePackageLine_packageId_idx" ON "ServicePackageLine"("packageId");

-- CreateIndex
CREATE UNIQUE INDEX "Deposit_receiptNumber_key" ON "Deposit"("receiptNumber");

-- CreateIndex
CREATE INDEX "Deposit_workOrderId_idx" ON "Deposit"("workOrderId");

-- CreateIndex
CREATE INDEX "Deposit_invoiceId_idx" ON "Deposit"("invoiceId");

-- CreateIndex
CREATE UNIQUE INDEX "License_key_key" ON "License"("key");

-- CreateIndex
CREATE UNIQUE INDEX "StripeConnection_userId_key" ON "StripeConnection"("userId");

-- CreateIndex
CREATE INDEX "StripeConnection_userId_idx" ON "StripeConnection"("userId");

-- CreateIndex
CREATE INDEX "LicenseVerification_licenseId_idx" ON "LicenseVerification"("licenseId");

-- CreateIndex
CREATE INDEX "LicenseVerification_verifiedAt_idx" ON "LicenseVerification"("verifiedAt");

