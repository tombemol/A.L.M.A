CREATE TYPE "ProductIdentifierType" AS ENUM ('EAN', 'UPC', 'MANUFACTURER', 'INTERNAL_BARCODE', 'QR', 'OTHER');
CREATE TYPE "StorageLocationKind" AS ENUM ('AISLE', 'RACK', 'SHELF', 'POSITION');
CREATE TYPE "OccupancyMode" AS ENUM ('DEDICATED', 'SHARED');

CREATE TABLE "Category" (
  "id" TEXT NOT NULL,
  "code" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "parentId" TEXT,
  "active" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Category_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "UnitOfMeasure" (
  "id" TEXT NOT NULL,
  "code" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "symbol" TEXT NOT NULL,
  "allowsDecimal" BOOLEAN NOT NULL DEFAULT false,
  "active" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "UnitOfMeasure_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Product" (
  "id" TEXT NOT NULL,
  "sku" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "description" TEXT,
  "categoryId" TEXT NOT NULL,
  "baseUnitId" TEXT NOT NULL,
  "manufacturer" TEXT,
  "active" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Product_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ProductIdentifier" (
  "id" TEXT NOT NULL,
  "productId" TEXT NOT NULL,
  "type" "ProductIdentifierType" NOT NULL,
  "value" TEXT NOT NULL,
  "normalizedValue" TEXT NOT NULL,
  "label" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ProductIdentifier_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ProductUnitConversion" (
  "id" TEXT NOT NULL,
  "productId" TEXT NOT NULL,
  "unitId" TEXT NOT NULL,
  "factorToBase" DECIMAL(18,6) NOT NULL,
  CONSTRAINT "ProductUnitConversion_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Warehouse" (
  "id" TEXT NOT NULL,
  "code" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "description" TEXT,
  "active" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Warehouse_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "StorageLocation" (
  "id" TEXT NOT NULL,
  "warehouseId" TEXT NOT NULL,
  "parentId" TEXT,
  "kind" "StorageLocationKind" NOT NULL,
  "code" TEXT NOT NULL,
  "name" TEXT,
  "occupancyMode" "OccupancyMode",
  "active" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "StorageLocation_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ProductLocation" (
  "id" TEXT NOT NULL,
  "productId" TEXT NOT NULL,
  "warehouseId" TEXT NOT NULL,
  "locationId" TEXT NOT NULL,
  "isPrimary" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ProductLocation_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Category_code_key" ON "Category"("code");
CREATE INDEX "Category_parentId_idx" ON "Category"("parentId");
CREATE UNIQUE INDEX "UnitOfMeasure_code_key" ON "UnitOfMeasure"("code");
CREATE UNIQUE INDEX "Product_sku_key" ON "Product"("sku");
CREATE INDEX "Product_categoryId_idx" ON "Product"("categoryId");
CREATE INDEX "Product_baseUnitId_idx" ON "Product"("baseUnitId");
CREATE UNIQUE INDEX "ProductIdentifier_normalizedValue_key" ON "ProductIdentifier"("normalizedValue");
CREATE INDEX "ProductIdentifier_productId_idx" ON "ProductIdentifier"("productId");
CREATE UNIQUE INDEX "ProductUnitConversion_productId_unitId_key" ON "ProductUnitConversion"("productId", "unitId");
CREATE INDEX "ProductUnitConversion_unitId_idx" ON "ProductUnitConversion"("unitId");
CREATE UNIQUE INDEX "Warehouse_code_key" ON "Warehouse"("code");
CREATE UNIQUE INDEX "StorageLocation_warehouseId_code_key" ON "StorageLocation"("warehouseId", "code");
CREATE INDEX "StorageLocation_warehouseId_kind_idx" ON "StorageLocation"("warehouseId", "kind");
CREATE INDEX "StorageLocation_parentId_idx" ON "StorageLocation"("parentId");
CREATE UNIQUE INDEX "ProductLocation_productId_locationId_key" ON "ProductLocation"("productId", "locationId");
CREATE UNIQUE INDEX "ProductLocation_primary_per_warehouse" ON "ProductLocation"("productId", "warehouseId") WHERE "isPrimary" = true;
CREATE INDEX "ProductLocation_productId_warehouseId_idx" ON "ProductLocation"("productId", "warehouseId");
CREATE INDEX "ProductLocation_warehouseId_idx" ON "ProductLocation"("warehouseId");
CREATE INDEX "ProductLocation_locationId_idx" ON "ProductLocation"("locationId");

ALTER TABLE "Category" ADD CONSTRAINT "Category_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "Category"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Product" ADD CONSTRAINT "Product_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Product" ADD CONSTRAINT "Product_baseUnitId_fkey" FOREIGN KEY ("baseUnitId") REFERENCES "UnitOfMeasure"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ProductIdentifier" ADD CONSTRAINT "ProductIdentifier_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ProductUnitConversion" ADD CONSTRAINT "ProductUnitConversion_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ProductUnitConversion" ADD CONSTRAINT "ProductUnitConversion_unitId_fkey" FOREIGN KEY ("unitId") REFERENCES "UnitOfMeasure"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "StorageLocation" ADD CONSTRAINT "StorageLocation_warehouseId_fkey" FOREIGN KEY ("warehouseId") REFERENCES "Warehouse"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "StorageLocation" ADD CONSTRAINT "StorageLocation_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "StorageLocation"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ProductLocation" ADD CONSTRAINT "ProductLocation_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ProductLocation" ADD CONSTRAINT "ProductLocation_warehouseId_fkey" FOREIGN KEY ("warehouseId") REFERENCES "Warehouse"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ProductLocation" ADD CONSTRAINT "ProductLocation_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "StorageLocation"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
