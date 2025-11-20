-- CreateTable
CREATE TABLE "RawPpdTransaction" (
    "id" TEXT NOT NULL,
    "price" INTEGER NOT NULL,
    "dateOfTransfer" TIMESTAMP(3) NOT NULL,
    "postcode" TEXT,
    "propertyType" TEXT,
    "newBuild" TEXT,
    "tenure" TEXT,
    "paon" TEXT,
    "saon" TEXT,
    "street" TEXT,
    "locality" TEXT,
    "townCity" TEXT,
    "district" TEXT,
    "county" TEXT,
    "ppdCategory" TEXT,
    "recordStatus" TEXT,
    "ingestedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RawPpdTransaction_pkey" PRIMARY KEY ("id")
);
