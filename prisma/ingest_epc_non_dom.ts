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
            out.push(cur);
            cur = "";
            continue;
        }

        cur += ch;
    }
    out.push(cur);
    return out.map(s => s.trim());
}

function normPostcode(pc?: string | null) {
    const v = (pc ?? "").replace(/\s+/g, "").toUpperCase();
    return v || null;
}

function toNumber(v?: string) {
    if (!v) return null;
    const n = Number(v);
    return Number.isFinite(n) ? n : null;
}

function toFloat(v?: string) {
    if (!v) return null;
    const n = Number(v);
    return Number.isFinite(n) ? n : null;
}

function toDate(v?: string) {
    if (!v) return null;
    const d = new Date(v);
    return isNaN(d.getTime()) ? null : d;
}

// Find every certificates.csv under data/raw/epc/non-domestic
function findCertificateFiles(root: string): string[] {
    const results: string[] = [];

    const walk = (dir: string) => {
        for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
            const p = path.join(dir, ent.name);
            if (ent.isDirectory()) walk(p);
            else if (ent.isFile() && ent.name.toLowerCase() === "certificates.csv") {
                results.push(p);
            }
        }
    };

    walk(root);
    return results;
}

async function ingestCertificates(filePath: string) {
    const rl = readline.createInterface({
        input: fs.createReadStream(filePath),
        crlfDelay: Infinity,
    });

    let headerMap: Record<string, number> | null = null;
    const idx = (name: string) => headerMap?.[name.toLowerCase()];

    const batchSize = 2000;
    let batch: any[] = [];
    let count = 0;

    for await (const line of rl) {
        if (!line) continue;
        const c = parseCsv(line);

        if (!headerMap) {
            headerMap = {};
            c.forEach((h, i) => {
                headerMap![h.toLowerCase()] = i;
            });
            continue;
        }

        // Helper to get by multiple possible column names
        const get = (...names: string[]) => {
            for (const n of names) {
                const i = idx(n);
                if (i != null && i >= 0 && i < c.length) return c[i];
            }
            return "";
        };

        const uprn = get("UPRN");
        const postcode = get("POSTCODE");
        const ratingBand = get("ASSET_RATING_BAND", "CURRENT_ENERGY_RATING");
        const ratingScore = get("ASSET_RATING", "CURRENT_ENERGY_EFFICIENCY");
        const propertyType = get("PROPERTY_TYPE");
        const floorArea = get("FLOOR_AREA", "TOTAL_FLOOR_AREA");
        const lodgementDate = get("LODGEMENT_DATE", "LODGEMENT_DATETIME");
        const address = get("ADDRESS", "PROPERTY_ADDRESS", "ADDRESS1");
        const localAuthority = get("LOCAL_AUTHORITY_LABEL", "LOCAL_AUTHORITY");

        const record = {
            uprn: uprn || null,
            postcode: normPostcode(postcode),
            rating: ratingBand || null,
            score: toNumber(ratingScore),
            propertyType: propertyType || null,
            floorAreaSqm: toFloat(floorArea),
            lodgementDate: toDate(lodgementDate),
            address: address || null,
            localAuthority: localAuthority || null,
        };

        batch.push(record);
        count++;

        if (batch.length >= batchSize) {
            await prisma.rawEpcRecord.createMany({ data: batch });
            batch = [];
            if (count % 100000 === 0) {
                console.log(`  processed ${count.toLocaleString()} rows...`);
            }
        }
    }

    if (batch.length) {
        await prisma.rawEpcRecord.createMany({ data: batch });
    }

    return count;
}

async function main() {
    const root = path.join(process.cwd(), "data", "raw", "epc", "non-domestic");
    if (!fs.existsSync(root)) {
        console.log(`Folder not found: ${root}`);
        return;
    }

    const files = findCertificateFiles(root);
    if (files.length === 0) {
        console.log("No certificates.csv files found.");
        return;
    }

    let total = 0;
    for (const file of files) {
        console.log(`Ingesting ${path.relative(process.cwd(), file)}...`);
        const n = await ingestCertificates(file);
        total += n;
        console.log(`  inserted ${n.toLocaleString()} rows`);
    }

    console.log(
        `Done. Inserted ${total.toLocaleString()} non-domestic EPC certificate rows across ${files.length} files.`
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
