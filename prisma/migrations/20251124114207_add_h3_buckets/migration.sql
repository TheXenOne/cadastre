-- AlterTable
ALTER TABLE "Property" ADD COLUMN     "h3r7" TEXT,
ADD COLUMN     "h3r8" TEXT,
ADD COLUMN     "h3r9" TEXT;

-- CreateIndex
CREATE INDEX "Property_h3r7_idx" ON "Property"("h3r7");

-- CreateIndex
CREATE INDEX "Property_h3r8_idx" ON "Property"("h3r8");

-- CreateIndex
CREATE INDEX "Property_h3r9_idx" ON "Property"("h3r9");
