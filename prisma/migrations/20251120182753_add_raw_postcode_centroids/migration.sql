-- CreateTable
CREATE TABLE "RawPostcodeCentroid" (
    "postcode" TEXT NOT NULL,
    "lat" DOUBLE PRECISION NOT NULL,
    "lng" DOUBLE PRECISION NOT NULL,
    "ingestedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RawPostcodeCentroid_pkey" PRIMARY KEY ("postcode")
);
