CREATE TYPE "WithdrawalRequestStatus" AS ENUM (
  'PENDING_APPROVAL',
  'APPROVED',
  'REJECTED',
  'FULFILLING',
  'FULFILLED',
  'CANCELLED'
);

CREATE TYPE "ApprovalDecision" AS ENUM ('APPROVED', 'REJECTED');

ALTER TABLE "Category"
ADD COLUMN "requiresWithdrawalApproval" BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE "Product"
ADD COLUMN "requiresWithdrawalApproval" BOOLEAN NOT NULL DEFAULT false;

CREATE TABLE "Department" (
  "id" TEXT NOT NULL,
  "code" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "active" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Department_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Equipment" (
  "id" TEXT NOT NULL,
  "departmentId" TEXT NOT NULL,
  "code" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "description" TEXT,
  "active" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Equipment_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "WorkOrder" (
  "id" TEXT NOT NULL,
  "code" TEXT NOT NULL,
  "departmentId" TEXT NOT NULL,
  "equipmentId" TEXT,
  "description" TEXT,
  "active" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "WorkOrder_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "WithdrawalRequest" (
  "id" TEXT NOT NULL,
  "productId" TEXT NOT NULL,
  "quantity" DECIMAL(18,6) NOT NULL,
  "requesterUserId" TEXT NOT NULL,
  "departmentId" TEXT NOT NULL,
  "equipmentId" TEXT,
  "workOrderId" TEXT,
  "fromLocationId" TEXT,
  "status" "WithdrawalRequestStatus" NOT NULL DEFAULT 'PENDING_APPROVAL',
  "requiresApprovalSnapshot" BOOLEAN NOT NULL,
  "notes" TEXT,
  "stockMovementId" TEXT,
  "fulfilledByUserId" TEXT,
  "fulfilledAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "WithdrawalRequest_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "WithdrawalRequest_quantity_positive" CHECK ("quantity" > 0)
);

CREATE TABLE "Approval" (
  "id" TEXT NOT NULL,
  "withdrawalRequestId" TEXT NOT NULL,
  "decision" "ApprovalDecision" NOT NULL,
  "decidedByUserId" TEXT NOT NULL,
  "comment" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Approval_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Department_code_key" ON "Department"("code");
CREATE UNIQUE INDEX "Equipment_departmentId_code_key" ON "Equipment"("departmentId", "code");
CREATE INDEX "Equipment_departmentId_idx" ON "Equipment"("departmentId");
CREATE UNIQUE INDEX "WorkOrder_code_key" ON "WorkOrder"("code");
CREATE INDEX "WorkOrder_departmentId_idx" ON "WorkOrder"("departmentId");
CREATE INDEX "WorkOrder_equipmentId_idx" ON "WorkOrder"("equipmentId");
CREATE UNIQUE INDEX "WithdrawalRequest_stockMovementId_key" ON "WithdrawalRequest"("stockMovementId");
CREATE INDEX "WithdrawalRequest_status_createdAt_idx" ON "WithdrawalRequest"("status", "createdAt");
CREATE INDEX "WithdrawalRequest_productId_idx" ON "WithdrawalRequest"("productId");
CREATE INDEX "WithdrawalRequest_requesterUserId_idx" ON "WithdrawalRequest"("requesterUserId");
CREATE INDEX "WithdrawalRequest_fulfilledByUserId_idx" ON "WithdrawalRequest"("fulfilledByUserId");
CREATE INDEX "WithdrawalRequest_departmentId_idx" ON "WithdrawalRequest"("departmentId");
CREATE INDEX "WithdrawalRequest_equipmentId_idx" ON "WithdrawalRequest"("equipmentId");
CREATE INDEX "WithdrawalRequest_workOrderId_idx" ON "WithdrawalRequest"("workOrderId");
CREATE INDEX "WithdrawalRequest_fromLocationId_idx" ON "WithdrawalRequest"("fromLocationId");
CREATE UNIQUE INDEX "Approval_withdrawalRequestId_key" ON "Approval"("withdrawalRequestId");
CREATE INDEX "Approval_decidedByUserId_idx" ON "Approval"("decidedByUserId");

ALTER TABLE "Equipment"
ADD CONSTRAINT "Equipment_departmentId_fkey"
FOREIGN KEY ("departmentId") REFERENCES "Department"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "WorkOrder"
ADD CONSTRAINT "WorkOrder_departmentId_fkey"
FOREIGN KEY ("departmentId") REFERENCES "Department"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "WorkOrder"
ADD CONSTRAINT "WorkOrder_equipmentId_fkey"
FOREIGN KEY ("equipmentId") REFERENCES "Equipment"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "WithdrawalRequest"
ADD CONSTRAINT "WithdrawalRequest_productId_fkey"
FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "WithdrawalRequest"
ADD CONSTRAINT "WithdrawalRequest_requesterUserId_fkey"
FOREIGN KEY ("requesterUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "WithdrawalRequest"
ADD CONSTRAINT "WithdrawalRequest_fulfilledByUserId_fkey"
FOREIGN KEY ("fulfilledByUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "WithdrawalRequest"
ADD CONSTRAINT "WithdrawalRequest_departmentId_fkey"
FOREIGN KEY ("departmentId") REFERENCES "Department"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "WithdrawalRequest"
ADD CONSTRAINT "WithdrawalRequest_equipmentId_fkey"
FOREIGN KEY ("equipmentId") REFERENCES "Equipment"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "WithdrawalRequest"
ADD CONSTRAINT "WithdrawalRequest_workOrderId_fkey"
FOREIGN KEY ("workOrderId") REFERENCES "WorkOrder"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "WithdrawalRequest"
ADD CONSTRAINT "WithdrawalRequest_fromLocationId_fkey"
FOREIGN KEY ("fromLocationId") REFERENCES "StorageLocation"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "WithdrawalRequest"
ADD CONSTRAINT "WithdrawalRequest_stockMovementId_fkey"
FOREIGN KEY ("stockMovementId") REFERENCES "StockMovement"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "Approval"
ADD CONSTRAINT "Approval_withdrawalRequestId_fkey"
FOREIGN KEY ("withdrawalRequestId") REFERENCES "WithdrawalRequest"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Approval"
ADD CONSTRAINT "Approval_decidedByUserId_fkey"
FOREIGN KEY ("decidedByUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
