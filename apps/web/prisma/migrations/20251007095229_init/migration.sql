-- CreateEnum
CREATE TYPE "CatalogCategory" AS ENUM ('PIECES', 'EQUIPEMENTS', 'AUTRES');

-- CreateTable
CREATE TABLE "InvoicePayment" (
    "id" TEXT NOT NULL,
    "invoiceId" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "method" TEXT,
    "paidAt" TIMESTAMP(3) NOT NULL,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "InvoicePayment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CustomerBike" (
    "id" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "index" INTEGER NOT NULL,
    "brand" TEXT,
    "model" TEXT,
    "nationalFileId" TEXT,
    "serialNumber" TEXT,
    "color" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CustomerBike_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GlobalSetting" (
    "key" TEXT NOT NULL,
    "value" TEXT,

    CONSTRAINT "GlobalSetting_pkey" PRIMARY KEY ("key")
);

-- CreateTable
CREATE TABLE "InvoiceSequence" (
    "id" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "lastNumber" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "InvoiceSequence_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CatalogItem" (
    "id" TEXT NOT NULL,
    "sku" TEXT,
    "category" "CatalogCategory" NOT NULL,
    "name" TEXT NOT NULL,
    "priceHT" DOUBLE PRECISION NOT NULL,
    "priceTTC" DOUBLE PRECISION NOT NULL,
    "vatRate" DOUBLE PRECISION NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "stockQty" INTEGER NOT NULL DEFAULT 0,
    "minStock" INTEGER NOT NULL DEFAULT 0,
    "reorderQty" INTEGER NOT NULL DEFAULT 0,
    "location" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "purchasePriceHT" DOUBLE PRECISION,

    CONSTRAINT "CatalogItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Customer" (
    "id" TEXT NOT NULL,
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
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Customer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Invoice" (
    "id" TEXT NOT NULL,
    "workOrderId" TEXT NOT NULL,
    "number" TEXT,
    "issueDate" TIMESTAMP(3),
    "status" TEXT NOT NULL DEFAULT 'draft',
    "type" TEXT NOT NULL DEFAULT 'invoice',
    "parentId" TEXT,
    "pricingMode" TEXT NOT NULL DEFAULT 'HT_TVA',
    "currency" TEXT NOT NULL DEFAULT 'EUR',
    "vatRate" DOUBLE PRECISION NOT NULL DEFAULT 20,
    "laborRate" DOUBLE PRECISION NOT NULL DEFAULT 60,
    "subtotalHT" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "vatAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "totalTTC" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "discountAmount" DOUBLE PRECISION DEFAULT 0,
    "paidAt" TIMESTAMP(3),
    "paymentMethod" TEXT,
    "cancelledAt" TIMESTAMP(3),
    "cancelledReason" TEXT,
    "dueDate" TIMESTAMP(3),
    "reminderCount" INTEGER NOT NULL DEFAULT 0,
    "lastReminderAt" TIMESTAMP(3),
    "validUntil" TIMESTAMP(3),
    "convertedAt" TIMESTAMP(3),
    "convertedToId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Invoice_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InvoiceLine" (
    "id" TEXT NOT NULL,
    "invoiceId" TEXT NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'part',
    "description" TEXT NOT NULL,
    "qty" DOUBLE PRECISION NOT NULL DEFAULT 1,
    "unitPriceHT" DOUBLE PRECISION,
    "unitPriceTTC" DOUBLE PRECISION,
    "vatRate" DOUBLE PRECISION,
    "totalHT" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "totalTTC" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "partId" TEXT,
    "purchasePriceHT" DOUBLE PRECISION,

    CONSTRAINT "InvoiceLine_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StockMovement" (
    "id" TEXT NOT NULL,
    "itemId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "qty" INTEGER NOT NULL,
    "refType" TEXT,
    "refId" TEXT,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StockMovement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Supplier" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "website" TEXT,
    "connectorType" TEXT NOT NULL DEFAULT 'MOCK',
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Supplier_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SupplierCredential" (
    "id" TEXT NOT NULL,
    "supplierId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "username" TEXT,
    "password" TEXT,
    "extraJson" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SupplierCredential_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SupplierItem" (
    "id" TEXT NOT NULL,
    "supplierId" TEXT NOT NULL,
    "catalogItemId" TEXT,
    "supplierSku" TEXT NOT NULL,
    "ean" TEXT,
    "lastPriceHT" DOUBLE PRECISION,
    "lastAvailability" TEXT,
    "lastCheckedAt" TIMESTAMP(3),
    "favorite" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "SupplierItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SupplierOffer" (
    "id" TEXT NOT NULL,
    "supplierId" TEXT NOT NULL,
    "catalogItemId" TEXT,
    "externalId" TEXT,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "reference" TEXT,
    "brand" TEXT,
    "price" DOUBLE PRECISION NOT NULL,
    "priceHT" DOUBLE PRECISION,
    "currency" TEXT NOT NULL DEFAULT 'EUR',
    "availability" TEXT,
    "stock" INTEGER,
    "deliveryDays" INTEGER,
    "url" TEXT,
    "imageUrl" TEXT,
    "metadata" TEXT,
    "fetchedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SupplierOffer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WorkOrder" (
    "id" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'created',
    "customerId" TEXT,
    "bikeId" TEXT,
    "type" TEXT DEFAULT 'repair',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "dueAt" TIMESTAMP(3),

    CONSTRAINT "WorkOrder_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WorkOrderPart" (
    "id" TEXT NOT NULL,
    "workOrderId" TEXT NOT NULL,
    "catalogItemId" TEXT,
    "description" TEXT NOT NULL,
    "qty" INTEGER NOT NULL DEFAULT 1,
    "priceHT" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WorkOrderPart_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "name" TEXT,
    "email" TEXT NOT NULL,
    "emailVerified" TIMESTAMP(3),
    "image" TEXT,
    "password" TEXT,
    "role" TEXT NOT NULL DEFAULT 'user',
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Account" (
    "id" TEXT NOT NULL,
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

    CONSTRAINT "Account_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Session" (
    "id" TEXT NOT NULL,
    "sessionToken" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "expires" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Session_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VerificationToken" (
    "identifier" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expires" TIMESTAMP(3) NOT NULL
);

-- CreateTable
CREATE TABLE "AppSetting" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "shopName" TEXT,
    "shopEmail" TEXT,
    "shopPhone" TEXT,
    "address1" TEXT,
    "address2" TEXT,
    "zip" TEXT,
    "city" TEXT,
    "country" TEXT,
    "pdfPrimary" TEXT,
    "legalFooter" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "capital" TEXT,
    "insurance" TEXT,
    "rcs" TEXT,
    "siret" TEXT,
    "tva" TEXT,

    CONSTRAINT "AppSetting_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CalendarEvent" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "start" TIMESTAMP(3) NOT NULL,
    "end" TIMESTAMP(3) NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'planned',
    "blocksAvail" BOOLEAN NOT NULL DEFAULT true,
    "color" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CalendarEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CalendarBlock" (
    "id" TEXT NOT NULL,
    "reason" TEXT,
    "start" TIMESTAMP(3) NOT NULL,
    "end" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CalendarBlock_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Booking" (
    "id" TEXT NOT NULL,
    "start" TIMESTAMP(3) NOT NULL,
    "end" TIMESTAMP(3) NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "name" TEXT NOT NULL,
    "email" TEXT,
    "phone" TEXT,
    "bike" TEXT,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "customerId" TEXT,

    CONSTRAINT "Booking_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CalendarConfig" (
    "id" INTEGER NOT NULL DEFAULT 1,
    "timezone" TEXT NOT NULL DEFAULT 'Europe/Paris',
    "slotMinutes" INTEGER NOT NULL DEFAULT 60,
    "leadTimeHours" INTEGER NOT NULL DEFAULT 6,
    "maxConcurrent" INTEGER NOT NULL DEFAULT 1,
    "saturdayByAppt" BOOLEAN NOT NULL DEFAULT true,
    "businessHours" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CalendarConfig_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Communication" (
    "id" TEXT NOT NULL,
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
    "sentAt" TIMESTAMP(3),
    "deliveredAt" TIMESTAMP(3),
    "error" TEXT,
    "metadata" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Communication_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EmailTemplate" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "event" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "htmlContent" TEXT NOT NULL,
    "textContent" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EmailTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SMSTemplate" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "event" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SMSTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CashRegister" (
    "id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "description" TEXT,
    "invoiceId" TEXT,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CashRegister_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SystemSettings" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "notificationsEnabled" BOOLEAN NOT NULL DEFAULT true,
    "emailNotificationsEnabled" BOOLEAN NOT NULL DEFAULT true,
    "activityLogsEnabled" BOOLEAN NOT NULL DEFAULT true,
    "autoBackupEnabled" BOOLEAN NOT NULL DEFAULT false,
    "backupFrequency" TEXT NOT NULL DEFAULT 'weekly',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SystemSettings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "InvoicePayment_invoiceId_idx" ON "InvoicePayment"("invoiceId");

-- CreateIndex
CREATE UNIQUE INDEX "CustomerBike_customerId_index_key" ON "CustomerBike"("customerId", "index");

-- CreateIndex
CREATE UNIQUE INDEX "InvoiceSequence_year_key" ON "InvoiceSequence"("year");

-- CreateIndex
CREATE UNIQUE INDEX "CatalogItem_sku_key" ON "CatalogItem"("sku");

-- CreateIndex
CREATE UNIQUE INDEX "Customer_email_key" ON "Customer"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Invoice_number_key" ON "Invoice"("number");

-- CreateIndex
CREATE INDEX "SupplierOffer_supplierId_idx" ON "SupplierOffer"("supplierId");

-- CreateIndex
CREATE INDEX "SupplierOffer_catalogItemId_idx" ON "SupplierOffer"("catalogItemId");

-- CreateIndex
CREATE INDEX "SupplierOffer_externalId_idx" ON "SupplierOffer"("externalId");

-- CreateIndex
CREATE INDEX "SupplierOffer_fetchedAt_idx" ON "SupplierOffer"("fetchedAt");

-- CreateIndex
CREATE INDEX "SupplierOffer_expiresAt_idx" ON "SupplierOffer"("expiresAt");

-- CreateIndex
CREATE INDEX "WorkOrder_customerId_idx" ON "WorkOrder"("customerId");

-- CreateIndex
CREATE INDEX "WorkOrder_bikeId_idx" ON "WorkOrder"("bikeId");

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Account_provider_providerAccountId_key" ON "Account"("provider", "providerAccountId");

-- CreateIndex
CREATE UNIQUE INDEX "Session_sessionToken_key" ON "Session"("sessionToken");

-- CreateIndex
CREATE UNIQUE INDEX "VerificationToken_token_key" ON "VerificationToken"("token");

-- CreateIndex
CREATE UNIQUE INDEX "VerificationToken_identifier_token_key" ON "VerificationToken"("identifier", "token");

-- CreateIndex
CREATE UNIQUE INDEX "AppSetting_userId_key" ON "AppSetting"("userId");

-- CreateIndex
CREATE INDEX "Booking_start_end_idx" ON "Booking"("start", "end");

-- CreateIndex
CREATE INDEX "Booking_customerId_idx" ON "Booking"("customerId");

-- CreateIndex
CREATE INDEX "Communication_customerId_idx" ON "Communication"("customerId");

-- CreateIndex
CREATE INDEX "Communication_workOrderId_idx" ON "Communication"("workOrderId");

-- CreateIndex
CREATE INDEX "Communication_status_idx" ON "Communication"("status");

-- CreateIndex
CREATE INDEX "Communication_event_idx" ON "Communication"("event");

-- CreateIndex
CREATE UNIQUE INDEX "EmailTemplate_name_key" ON "EmailTemplate"("name");

-- CreateIndex
CREATE INDEX "EmailTemplate_event_idx" ON "EmailTemplate"("event");

-- CreateIndex
CREATE UNIQUE INDEX "SMSTemplate_name_key" ON "SMSTemplate"("name");

-- CreateIndex
CREATE INDEX "SMSTemplate_event_idx" ON "SMSTemplate"("event");

-- CreateIndex
CREATE INDEX "CashRegister_type_idx" ON "CashRegister"("type");

-- CreateIndex
CREATE INDEX "CashRegister_createdAt_idx" ON "CashRegister"("createdAt");

-- CreateIndex
CREATE INDEX "CashRegister_invoiceId_idx" ON "CashRegister"("invoiceId");

-- CreateIndex
CREATE INDEX "CashRegister_userId_idx" ON "CashRegister"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "SystemSettings_userId_key" ON "SystemSettings"("userId");

-- AddForeignKey
ALTER TABLE "InvoicePayment" ADD CONSTRAINT "InvoicePayment_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "Invoice"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CustomerBike" ADD CONSTRAINT "CustomerBike_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InvoiceLine" ADD CONSTRAINT "InvoiceLine_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "Invoice"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StockMovement" ADD CONSTRAINT "StockMovement_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "CatalogItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SupplierCredential" ADD CONSTRAINT "SupplierCredential_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "Supplier"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SupplierItem" ADD CONSTRAINT "SupplierItem_catalogItemId_fkey" FOREIGN KEY ("catalogItemId") REFERENCES "CatalogItem"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SupplierItem" ADD CONSTRAINT "SupplierItem_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "Supplier"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SupplierOffer" ADD CONSTRAINT "SupplierOffer_catalogItemId_fkey" FOREIGN KEY ("catalogItemId") REFERENCES "CatalogItem"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SupplierOffer" ADD CONSTRAINT "SupplierOffer_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "Supplier"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkOrder" ADD CONSTRAINT "WorkOrder_bikeId_fkey" FOREIGN KEY ("bikeId") REFERENCES "CustomerBike"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkOrder" ADD CONSTRAINT "WorkOrder_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkOrderPart" ADD CONSTRAINT "WorkOrderPart_catalogItemId_fkey" FOREIGN KEY ("catalogItemId") REFERENCES "CatalogItem"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkOrderPart" ADD CONSTRAINT "WorkOrderPart_workOrderId_fkey" FOREIGN KEY ("workOrderId") REFERENCES "WorkOrder"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Account" ADD CONSTRAINT "Account_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Session" ADD CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AppSetting" ADD CONSTRAINT "AppSetting_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Booking" ADD CONSTRAINT "Booking_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Communication" ADD CONSTRAINT "Communication_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Communication" ADD CONSTRAINT "Communication_workOrderId_fkey" FOREIGN KEY ("workOrderId") REFERENCES "WorkOrder"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CashRegister" ADD CONSTRAINT "CashRegister_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "Invoice"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CashRegister" ADD CONSTRAINT "CashRegister_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SystemSettings" ADD CONSTRAINT "SystemSettings_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
