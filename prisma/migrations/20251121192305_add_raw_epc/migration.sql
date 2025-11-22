-- CreateTable
CREATE TABLE "RawEpcRecord" (
    "id" SERIAL NOT NULL,
    "uprn" TEXT,
    "postcode" TEXT,
    "rating" TEXT,
    "score" INTEGER,
    "propertyType" TEXT,
    "floorAreaSqm" DOUBLE PRECISION,
    "lodgementDate" TIMESTAMP(3),
    "address" TEXT,
    "localAuthority" TEXT,
    "ingestedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RawEpcRecord_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "RawEpcRecord_postcode_idx" ON "RawEpcRecord"("postcode");

-- CreateIndex
CREATE INDEX "RawEpcRecord_uprn_idx" ON "RawEpcRecord"("uprn");
