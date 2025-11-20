import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import fs from "node:fs/promises";
import path from "node:path";

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
});

const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
    const filePath = path.join(process.cwd(), "public", "data", "properties.json");
    const raw = await fs.readFile(filePath, "utf8");
    const properties = JSON.parse(raw);

    await prisma.property.createMany({
        data: properties.map((p: any) => ({
            id: p.id,
            name: p.name,
            fullAddress: p.fullAddress,
            propertyType: p.propertyType,
            ownerName: p.ownerName,
            lat: p.lat,
            lng: p.lng,
            lastSalePrice: p.lastSalePrice ?? null,
            lastSaleDate: p.lastSaleDate ? new Date(p.lastSaleDate) : null,
            rateableValue: p.rateableValue ?? null,
            epcRating: p.epcRating ?? null,
            contactSummary: p.contactSummary ?? null,
        })),
        skipDuplicates: true,
    });
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
