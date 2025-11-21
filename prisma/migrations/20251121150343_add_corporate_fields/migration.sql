-- AlterTable
ALTER TABLE "Property" ADD COLUMN     "corporateOwnerCategory" TEXT,
ADD COLUMN     "corporateOwnerName" TEXT,
ADD COLUMN     "corporateRegNo" TEXT,
ADD COLUMN     "isCorporateOwned" BOOLEAN NOT NULL DEFAULT false;
