import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

function normPostcode(pc: string) {
    return pc.replace(/\s+/g, "").toUpperCase();
}

function extractPostcode(text: string) {
    const m = text.toUpperCase().match(/\b([A-Z]{1,2}\d[A-Z\d]?\s*\d[A-Z]{2})\b/);
    return m ? normPostcode(m[1]) : null;
}

async function main() {
    const rows = await prisma.rawCcodRecord.findMany();

    let updated = 0;

    for (const r of rows) {
        // if already has a postcode, keep it
        if (r.postcode && r.postcode.trim()) continue;

        const haystack = [
            r.propertyAddress,
            r.proprietorAddress1_1,
            r.proprietorAddress1_2,
            r.proprietorAddress1_3,
            r.proprietorAddress2_1,
            r.proprietorAddress2_2,
            r.proprietorAddress2_3,
            r.proprietorAddress3_1,
            r.proprietorAddress3_2,
            r.proprietorAddress3_3,
            r.proprietorAddress4_1,
            r.proprietorAddress4_2,
            r.proprietorAddress4_3,
        ]
            .filter(Boolean)
            .join(" | ");

        const pc = extractPostcode(haystack);
        if (!pc) continue;

        await prisma.rawCcodRecord.update({
            where: { id: r.id },
            data: { postcode: pc },
        });

        updated++;
    }

    console.log(`Backfilled ${updated} CCOD postcodes.`);
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
