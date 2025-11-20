import "dotenv/config";
import fs from "node:fs";
import path from "node:path";
import readline from "node:readline";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";

// Prisma v7 adapter setup
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

function parseCsv(line: string): string[] {
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
            out.push(cur.trim());
            cur = "";
            continue;
        }

        cur += ch;
    }
    out.push(cur.trim());
    return out;
}

function normPostcode(pc: string) {
    return pc.replace(/\s+/g, "").toUpperCase();
}

async function ingestFile(filePath: string) {
    const rl = readline.createInterface({
        input: fs.createReadStream(filePath),
        crlfDelay: Infinity,
    });

    let hasHeader: boolean | null = null;
    let idxPostcode = 0;
    let idxLat = 1;
    let idxLng = 2;

    const batchSize = 5000;
    let batch: any[] = [];
    let count = 0;
    let lineNo = 0;

    for await (const line of rl) {
        lineNo++;
        if (!line) continue;

        const cols = parseCsv(line);

        // Detect header on first non-empty line
        if (hasHeader === null) {
            const lower = cols.map((h) => h.toLowerCase());
            hasHeader =
                lower.includes("postcode") ||
                lower.includes("pcds") ||
                lower.includes("latitude") ||
                lower.includes("longitude") ||
                lower.includes("lat") ||
                lower.includes("lng") ||
                lower.includes("long");

            if (hasHeader) {
                idxPostcode = lower.findIndex((h) => h === "postcode" || h === "pcds");
                idxLat = lower.findIndex((h) => h === "lat" || h === "latitude");
                idxLng = lower.findIndex(
                    (h) => h === "lng" || h === "long" || h === "longitude"
                );

                if (idxPostcode < 0) idxPostcode = 0;
                if (idxLat < 0) idxLat = 1;
                if (idxLng < 0) idxLng = 2;

                continue; // skip header row
            }
        }

        if (cols.length < 3) continue;

        const pcRaw = cols[idxPostcode] ?? cols[0];
        const latRaw = cols[idxLat] ?? cols[1];
        const lngRaw = cols[idxLng] ?? cols[2];

        if (!pcRaw || !latRaw || !lngRaw) continue;

        const record = {
            postcode: normPostcode(pcRaw),
            lat: Number(latRaw),
            lng: Number(lngRaw),
        };

        if (Number.isNaN(record.lat) || Number.isNaN(record.lng)) continue;

        batch.push(record);
        count++;

        if (batch.length >= batchSize) {
            await prisma.rawPostcodeCentroid.createMany({
                data: batch,
                skipDuplicates: true,
            });
            batch = [];
        }
    }

    if (batch.length) {
        await prisma.rawPostcodeCentroid.createMany({
            data: batch,
            skipDuplicates: true,
        });
    }

    return count;
}

async function main() {
    const dir = path.join(process.cwd(), "data", "raw", "postcodes");
    const files = fs
        .readdirSync(dir)
        .filter((f) => f.toLowerCase().endsWith(".csv"))
        .map((f) => path.join(dir, f));

    let total = 0;
    for (const file of files) {
        console.log(`Ingesting ${path.basename(file)}...`);
        const n = await ingestFile(file);
        total += n;
        console.log(`  processed ${n} rows (duplicates skipped)`);
    }

    console.log(`Done. Processed ${total} postcode centroids.`);
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
