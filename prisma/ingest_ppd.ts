import "dotenv/config";
import fs from "node:fs/promises";
import path from "node:path";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";

// --- Prisma v7 adapter setup ---
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

// --- tiny CSV parser for quoted LR PPD lines ---
function parseCsvLine(line: string): string[] {
    const out: string[] = [];
    let cur = "";
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
        const ch = line[i];

        if (ch === '"') {
            const next = line[i + 1];
            if (inQuotes && next === '"') {
                cur += '"';
                i++;
            } else {
                inQuotes = !inQuotes;
            }
            continue;
        }

        if (ch === "," && !inQuotes) {
            out.push(cur);
            cur = "";
            continue;
        }

        cur += ch;
    }
    out.push(cur);
    return out;
}

function cleanId(raw: string) {
    return raw.replace(/^{|}$/g, "");
}

async function ingestFile(filePath: string) {
    const raw = await fs.readFile(filePath, "utf8");
    const lines = raw.split(/\r?\n/).filter(Boolean);

    const batchSize = 2000;
    let batch: any[] = [];
    let count = 0;

    for (const line of lines) {
        const cols = parseCsvLine(line);

        // PPD order (no headers):
        // 0 id, 1 price, 2 date, 3 postcode, 4 type, 5 newbuild, 6 tenure,
        // 7 paon, 8 saon, 9 street, 10 locality, 11 town, 12 district,
        // 13 county, 14 category, 15 status
        const record = {
            id: cleanId(cols[0]),
            price: Number(cols[1]),
            dateOfTransfer: new Date(cols[2].replace(" ", "T")),
            postcode: cols[3] || null,
            propertyType: cols[4] || null,
            newBuild: cols[5] || null,
            tenure: cols[6] || null,
            paon: cols[7] || null,
            saon: cols[8] || null,
            street: cols[9] || null,
            locality: cols[10] || null,
            townCity: cols[11] || null,
            district: cols[12] || null,
            county: cols[13] || null,
            ppdCategory: cols[14] || null,
            recordStatus: cols[15] || null,
        };

        batch.push(record);
        count++;

        if (batch.length >= batchSize) {
            await prisma.rawPpdTransaction.createMany({
                data: batch,
                skipDuplicates: true,
            });
            batch = [];
        }
    }

    if (batch.length) {
        await prisma.rawPpdTransaction.createMany({
            data: batch,
            skipDuplicates: true,
        });
    }

    return count;
}

async function main() {
    const dir = path.join(process.cwd(), "data", "raw", "ppd");
    const files = (await fs.readdir(dir))
        .filter((f) => f.toLowerCase().endsWith(".csv"))
        .map((f) => path.join(dir, f));

    if (files.length === 0) {
        console.log("No CSV files found in data/raw/ppd/");
        return;
    }

    let total = 0;

    for (const file of files) {
        console.log(`Ingesting ${path.basename(file)}...`);
        const n = await ingestFile(file);
        total += n;
        console.log(`  processed ${n} rows (duplicates skipped by id)`);
    }

    console.log(`Done. Processed ${total} rows across ${files.length} file(s).`);
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
