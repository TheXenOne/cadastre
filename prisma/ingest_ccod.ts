import "dotenv/config";
import fs from "node:fs";
import path from "node:path";
import readline from "node:readline";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";

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

function parseUkDate(d?: string) {
    if (!d) return null;
    const [dd, mm, yyyy] = d.split("-");
    if (!dd || !mm || !yyyy) return null;
    const iso = `${yyyy}-${mm}-${dd}T00:00:00.000Z`;
    const dt = new Date(iso);
    return isNaN(dt.getTime()) ? null : dt;
}

async function ingestFile(filePath: string) {
    const rl = readline.createInterface({
        input: fs.createReadStream(filePath),
        crlfDelay: Infinity,
    });

    let headerMap: Record<string, number> | null = null;
    const batchSize = 1000;
    let batch: any[] = [];
    let count = 0;

    for await (const line of rl) {
        if (!line) continue;
        const c = parseCsv(line);

        if (!headerMap) {
            // build header -> index map
            headerMap = {};
            c.forEach((h, i) => {
                headerMap![h.toLowerCase()] = i;
            });
            continue;
        }

        const idx = (name: string) => headerMap![name.toLowerCase()];

        const record = {
            titleNumber: c[idx("Title Number")] || null,
            tenure: c[idx("Tenure")] || null,
            propertyAddress: c[idx("Property Address")] || null,
            district: c[idx("District")] || null,
            county: c[idx("County")] || null,
            region: c[idx("Region")] || null,
            postcode: normPostcode(c[idx("Postcode")]),
            multipleAddressIndicator: c[idx("Multiple Address Indicator")] || null,
            pricePaid: c[idx("Price Paid")] ? Number(c[idx("Price Paid")]) : null,

            proprietorName1: c[idx("Proprietor Name (1)")] || null,
            companyRegistrationNo1: c[idx("Company Registration No. (1)")] || null,
            proprietorshipCategory1: c[idx("Proprietorship Category (1)")] || null,
            proprietorAddress1_1: c[idx("Proprietor (1) Address (1)")] || null,
            proprietorAddress1_2: c[idx("Proprietor (1) Address (2)")] || null,
            proprietorAddress1_3: c[idx("Proprietor (1) Address (3)")] || null,

            proprietorName2: c[idx("Proprietor Name (2)")] || null,
            companyRegistrationNo2: c[idx("Company Registration No. (2)")] || null,
            proprietorshipCategory2: c[idx("Proprietorship Category (2)")] || null,
            proprietorAddress2_1: c[idx("Proprietor (2) Address (1)")] || null,
            proprietorAddress2_2: c[idx("Proprietor (2) Address (2)")] || null,
            proprietorAddress2_3: c[idx("Proprietor (2) Address (3)")] || null,

            proprietorName3: c[idx("Proprietor Name (3)")] || null,
            companyRegistrationNo3: c[idx("Company Registration No. (3)")] || null,
            proprietorshipCategory3: c[idx("Proprietorship Category (3)")] || null,
            proprietorAddress3_1: c[idx("Proprietor (3) Address (1)")] || null,
            proprietorAddress3_2: c[idx("Proprietor (3) Address (2)")] || null,
            proprietorAddress3_3: c[idx("Proprietor (3) Address (3)")] || null,

            proprietorName4: c[idx("Proprietor Name (4)")] || null,
            companyRegistrationNo4: c[idx("Company Registration No. (4)")] || null,
            proprietorshipCategory4: c[idx("Proprietorship Category (4)")] || null,
            proprietorAddress4_1: c[idx("Proprietor (4) Address (1)")] || null,
            proprietorAddress4_2: c[idx("Proprietor (4) Address (2)")] || null,
            proprietorAddress4_3: c[idx("Proprietor (4) Address (3)")] || null,

            dateProprietorAdded: parseUkDate(c[idx("Date Proprietor Added")]),
            additionalProprietorIndicator:
                c[idx("Additional Proprietor Indicator")] || null,
        };

        batch.push(record);
        count++;

        if (batch.length >= batchSize) {
            await prisma.rawCcodRecord.createMany({ data: batch });
            batch = [];
        }
    }

    if (batch.length) {
        await prisma.rawCcodRecord.createMany({ data: batch });
    }

    return count;
}

async function main() {
    const dir = path.join(process.cwd(), "data", "raw", "ccod");
    const files = fs
        .readdirSync(dir)
        .filter(f => f.toLowerCase().endsWith(".csv"))
        .map(f => path.join(dir, f));

    if (files.length === 0) {
        console.log("No CCOD CSV files found in data/raw/ccod/");
        return;
    }

    let total = 0;
    for (const file of files) {
        console.log(`Ingesting ${path.basename(file)}...`);
        const n = await ingestFile(file);
        total += n;
        console.log(`  inserted ${n} rows`);
    }

    console.log(`Done. Inserted ${total} CCOD rows.`);
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
