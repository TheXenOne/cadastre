/*
  Warnings:

  - You are about to drop the column `h3r7` on the `Property` table. All the data in the column will be lost.
  - You are about to drop the column `h3r8` on the `Property` table. All the data in the column will be lost.
  - You are about to drop the column `h3r9` on the `Property` table. All the data in the column will be lost.

*/
-- DropIndex
DROP INDEX "Property_h3r7_idx";

-- DropIndex
DROP INDEX "Property_h3r8_idx";

-- DropIndex
DROP INDEX "Property_h3r9_idx";

-- AlterTable
ALTER TABLE "Property" DROP COLUMN "h3r7",
DROP COLUMN "h3r8",
DROP COLUMN "h3r9";
