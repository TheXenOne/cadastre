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

function extractPostcode(text?: string | null) {
    if (!text) return null;
    // UK postcode regex (fairly standard)
    const m = text.toUpperCase().match(
        /\b([A-Z]{1,2}\d[A-Z\d]?\s*\d[A-Z]{2})\b/
    );
    return m ? normPostcode(m[1]) : null;
}

async function main() {
    // Pull CCOD rows (postcodes may be in postcode column or embedded in address)
    const ccodRows = await prisma.rawCcodRecord.findMany({
        orderBy: { dateProprietorAdded: "desc" }, // newest first
        select: {
            postcode: true,
            propertyAddress: true,
            proprietorName1: true,
            companyRegistrationNo1: true,
            proprietorshipCategory1: true,
            dateProprietorAdded: true,
        },
    });

    // Reduce to one “best” owner per postcode
    const bestByPostcode = new Map<string, typeof ccodRows[number]>();

    for (const r of ccodRows) {
        const pc =
            normPostcode(r.postcode) ||
            extractPostcode(r.propertyAddress);

        if (!pc) continue;
        if (!bestByPostcode.has(pc)) bestByPostcode.set(pc, r);
    }

    // ---- diagnostics (NOW after filling the map) ----
    console.log("CCOD rows:", ccodRows.length);
    console.log("Extracted unique postcodes:", bestByPostcode.size);
    console.log(
        "Sample extracted postcodes:",
        Array.from(bestByPostcode.keys()).slice(0, 20)
    );

    let existing = 0;
    for (const pc of bestByPostcode.keys()) {
        const n = await prisma.property.count({ where: { postcode: pc } });
        if (n > 0) existing++;
    }
    console.log("Postcodes that exist in Property:", existing);
    // -----------------------------------------------

    let updatedPostcodes = 0;

    for (const [pc, owner] of bestByPostcode.entries()) {
        const result = await prisma.property.updateMany({
            where: { postcode: pc },
            data: {
                isCorporateOwned: true,
                corporateOwnerName: owner.proprietorName1 ?? null,
                corporateRegNo: owner.companyRegistrationNo1 ?? null,
                corporateOwnerCategory: owner.proprietorshipCategory1 ?? null,
            },
        });

        if (result.count > 0) updatedPostcodes++;
    }

    console.log(
        `Linked CCOD → Property by postcode. Postcodes matched: ${updatedPostcodes}.`
    );
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
