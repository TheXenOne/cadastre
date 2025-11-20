import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";

// Prisma v7 adapter setup
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

function normPostcode(pc?: string | null) {
    return (pc ?? "").replace(/\s+/g, "").toUpperCase();
}

function makeAddressKey(r: any) {
    return [
        r.paon ?? "",
        r.saon ?? "",
        r.street ?? "",
        r.postcode ?? "",
    ]
        .join("|")
        .toUpperCase()
        .trim();
}

function makeName(r: any) {
    // Prefer PAON + SAON + street for a human-readable short name
    const bits = [r.saon, r.paon, r.street].filter(Boolean);
    return bits.join(" ").replace(/\s+/g, " ").trim() || "Unknown property";
}

function makeFullAddress(r: any) {
    const bits = [
        r.saon,
        r.paon,
        r.street,
        r.locality,
        r.townCity,
        r.postcode,
    ].filter(Boolean);
    return bits.join(", ");
}

async function main() {
    // Pull latest transaction per “address key”
    // MVP key: PAON+SAON+STREET+POSTCODE+CategoryB (good enough for now)
    const raws = await prisma.rawPpdTransaction.findMany({
        where: { ppdCategory: "B" },
        orderBy: { dateOfTransfer: "desc" },
    });

    const seen = new Set<string>();
    const latestPerAddress: any[] = [];

    for (const r of raws) {
        const key = makeAddressKey(r);

        if (seen.has(key)) continue;
        seen.add(key);
        latestPerAddress.push(r);
    }

    // Upsert into canonical Property
    for (const r of latestPerAddress) {
        const key = makeAddressKey(r);
        const pc = normPostcode(r.postcode);

        const centroid = pc
            ? await prisma.rawPostcodeCentroid.findUnique({
                where: { postcode: pc },
            })
            : null;

        await prisma.property.upsert({
            where: { addressKey: key },
            update: {
                name: makeName(r),
                fullAddress: makeFullAddress(r),
                postcode: pc || null,
                district: r.district ?? null,
                propertyType: r.propertyType ?? "U",
                tenure: r.tenure ?? null,
                newBuild: r.newBuild ?? null,
                lastSalePrice: r.price,
                lastSaleDate: r.dateOfTransfer,
                lat: centroid?.lat ?? 51.5,
                lng: centroid?.lng ?? -0.1,
            },
            create: {
                addressKey: key,
                name: makeName(r),
                fullAddress: makeFullAddress(r),
                postcode: pc || null,
                district: r.district ?? null,
                propertyType: r.propertyType ?? "U",
                tenure: r.tenure ?? null,
                newBuild: r.newBuild ?? null,
                ownerName: "Unknown",
                lat: centroid?.lat ?? 51.5,
                lng: centroid?.lng ?? -0.1,
                lastSalePrice: r.price,
                lastSaleDate: r.dateOfTransfer,
                rateableValue: null,
                epcRating: null,
                contactSummary: null,
            },
        });
    }

    console.log(`Derived ${latestPerAddress.length} canonical properties.`);
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
        await pool.end();
    });
