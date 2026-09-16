CREATE TYPE "InventoryTrackingMode" AS ENUM ('NONE', 'LOT', 'LOT_EXPIRY', 'SERIAL', 'SERIAL_EXPIRY');
CREATE TYPE "StockMovementType" AS ENUM ('ENTRY', 'WITHDRAWAL', 'RETURN', 'TRANSFER', 'ADJUSTMENT_IN', 'ADJUSTMENT_OUT', 'INVENTORY_GAIN', 'INVENTORY_LOSS');

ALTER TABLE "Product"
ADD COLUMN "trackingMode" "InventoryTrackingMode" NOT NULL DEFAULT 'NONE';

CREATE TABLE "InventoryLot" (
  "id" TEXT NOT NULL,
  "productId" TEXT NOT NULL,
  "lotCode" TEXT NOT NULL,
  "expiresAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "InventoryLot_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "SerialItem" (
  "id" TEXT NOT NULL,
  "productId" TEXT NOT NULL,
  "serialNumber" TEXT NOT NULL,
  "expiresAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "SerialItem_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "InventoryBalance" (
  "id" TEXT NOT NULL,
  "productId" TEXT NOT NULL,
  "locationId" TEXT NOT NULL,
  "lotId" TEXT,
  "serialItemId" TEXT,
  "stockKey" TEXT NOT NULL,
  "quantity" DECIMAL(18,6) NOT NULL DEFAULT 0,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "InventoryBalance_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "InventoryBalance_quantity_nonnegative" CHECK ("quantity" >= 0),
  CONSTRAINT "InventoryBalance_single_tracking_dimension" CHECK ("lotId" IS NULL OR "serialItemId" IS NULL)
);

CREATE TABLE "InventoryValuation" (
  "productId" TEXT NOT NULL,
  "quantity" DECIMAL(18,6) NOT NULL DEFAULT 0,
  "averageUnitCost" DECIMAL(18,6) NOT NULL DEFAULT 0,
  "totalValue" DECIMAL(18,6) NOT NULL DEFAULT 0,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "InventoryValuation_pkey" PRIMARY KEY ("productId"),
  CONSTRAINT "InventoryValuation_nonnegative" CHECK (
    "quantity" >= 0 AND "averageUnitCost" >= 0 AND "totalValue" >= 0
  )
);

CREATE TABLE "StockMovement" (
  "id" TEXT NOT NULL,
  "type" "StockMovementType" NOT NULL,
  "reason" TEXT,
  "reference" TEXT,
  "performedByUserId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "StockMovement_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "StockMovementItem" (
  "id" TEXT NOT NULL,
  "movementId" TEXT NOT NULL,
  "productId" TEXT NOT NULL,
  "fromLocationId" TEXT,
  "toLocationId" TEXT,
  "lotId" TEXT,
  "serialItemId" TEXT,
  "quantity" DECIMAL(18,6) NOT NULL,
  "unitCost" DECIMAL(18,6),
  "totalCost" DECIMAL(18,6),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "StockMovementItem_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "StockMovementItem_quantity_positive" CHECK ("quantity" > 0),
  CONSTRAINT "StockMovementItem_cost_nonnegative" CHECK (
    ("unitCost" IS NULL OR "unitCost" >= 0) AND
    ("totalCost" IS NULL OR "totalCost" >= 0)
  ),
  CONSTRAINT "StockMovementItem_has_location" CHECK (
    "fromLocationId" IS NOT NULL OR "toLocationId" IS NOT NULL
  ),
  CONSTRAINT "StockMovementItem_single_tracking_dimension" CHECK (
    "lotId" IS NULL OR "serialItemId" IS NULL
  )
);

CREATE INDEX "Product_trackingMode_idx" ON "Product"("trackingMode");
CREATE UNIQUE INDEX "InventoryLot_productId_lotCode_key" ON "InventoryLot"("productId", "lotCode");
CREATE INDEX "InventoryLot_expiresAt_idx" ON "InventoryLot"("expiresAt");
CREATE UNIQUE INDEX "SerialItem_productId_serialNumber_key" ON "SerialItem"("productId", "serialNumber");
CREATE INDEX "SerialItem_expiresAt_idx" ON "SerialItem"("expiresAt");
CREATE UNIQUE INDEX "InventoryBalance_productId_locationId_stockKey_key" ON "InventoryBalance"("productId", "locationId", "stockKey");
CREATE INDEX "InventoryBalance_productId_locationId_idx" ON "InventoryBalance"("productId", "locationId");
CREATE INDEX "InventoryBalance_lotId_idx" ON "InventoryBalance"("lotId");
CREATE INDEX "InventoryBalance_serialItemId_idx" ON "InventoryBalance"("serialItemId");
CREATE INDEX "StockMovement_type_createdAt_idx" ON "StockMovement"("type", "createdAt");
CREATE INDEX "StockMovement_performedByUserId_idx" ON "StockMovement"("performedByUserId");
CREATE INDEX "StockMovementItem_movementId_idx" ON "StockMovementItem"("movementId");
CREATE INDEX "StockMovementItem_productId_createdAt_idx" ON "StockMovementItem"("productId", "createdAt");
CREATE INDEX "StockMovementItem_fromLocationId_idx" ON "StockMovementItem"("fromLocationId");
CREATE INDEX "StockMovementItem_toLocationId_idx" ON "StockMovementItem"("toLocationId");
CREATE INDEX "StockMovementItem_lotId_idx" ON "StockMovementItem"("lotId");
CREATE INDEX "StockMovementItem_serialItemId_idx" ON "StockMovementItem"("serialItemId");

ALTER TABLE "InventoryLot"
ADD CONSTRAINT "InventoryLot_productId_fkey"
FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "SerialItem"
ADD CONSTRAINT "SerialItem_productId_fkey"
FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "InventoryBalance"
ADD CONSTRAINT "InventoryBalance_productId_fkey"
FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "InventoryBalance"
ADD CONSTRAINT "InventoryBalance_locationId_fkey"
FOREIGN KEY ("locationId") REFERENCES "StorageLocation"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "InventoryBalance"
ADD CONSTRAINT "InventoryBalance_lotId_fkey"
FOREIGN KEY ("lotId") REFERENCES "InventoryLot"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "InventoryBalance"
ADD CONSTRAINT "InventoryBalance_serialItemId_fkey"
FOREIGN KEY ("serialItemId") REFERENCES "SerialItem"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "InventoryValuation"
ADD CONSTRAINT "InventoryValuation_productId_fkey"
FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "StockMovement"
ADD CONSTRAINT "StockMovement_performedByUserId_fkey"
FOREIGN KEY ("performedByUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "StockMovementItem"
ADD CONSTRAINT "StockMovementItem_movementId_fkey"
FOREIGN KEY ("movementId") REFERENCES "StockMovement"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "StockMovementItem"
ADD CONSTRAINT "StockMovementItem_productId_fkey"
FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "StockMovementItem"
ADD CONSTRAINT "StockMovementItem_fromLocationId_fkey"
FOREIGN KEY ("fromLocationId") REFERENCES "StorageLocation"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "StockMovementItem"
ADD CONSTRAINT "StockMovementItem_toLocationId_fkey"
FOREIGN KEY ("toLocationId") REFERENCES "StorageLocation"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "StockMovementItem"
ADD CONSTRAINT "StockMovementItem_lotId_fkey"
FOREIGN KEY ("lotId") REFERENCES "InventoryLot"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "StockMovementItem"
ADD CONSTRAINT "StockMovementItem_serialItemId_fkey"
FOREIGN KEY ("serialItemId") REFERENCES "SerialItem"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
