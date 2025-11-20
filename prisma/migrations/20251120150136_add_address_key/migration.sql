/*
  Warnings:

  - A unique constraint covering the columns `[addressKey]` on the table `Property` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "Property" ADD COLUMN     "addressKey" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "Property_addressKey_key" ON "Property"("addressKey");
