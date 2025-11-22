import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

function normPostcode(pc?: string | null) {
  return (pc ?? "").replace(/\s+/g, "").toUpperCase();
}

async function main() {
  console.log("Loading distinct Property postcodes...");

  // 1) Get distinct postcodes from canonical Property (relatively small)
  const propPostcodesRaw = await prisma.property.findMany({
    where: { postcode: { not: null } },
    distinct: ["postcode"],
    select: { postcode: true },
  });

  const propPostcodes = propPostcodesRaw
    .map(p => normPostcode(p.postcode))
    .filter(Boolean);

  console.log(`Found ${propPostcodes.length.toLocaleString()} distinct Property postcodes.`);

  // 2) Process in chunks so we can show progress
  const chunkSize = 500;
  let chunksDone = 0;
  let updatedPostcodes = 0;

  for (let i = 0; i < propPostcodes.length; i += chunkSize) {
    const chunk = propPostcodes.slice(i, i + chunkSize);

    // fetch all EPC rows for these postcodes, newest first per postcode
    const epcs = await prisma.rawEpcRecord.findMany({
      where: {
        postcode: { in: chunk },
        rating: { not: null },
      },
      orderBy: [
        { postcode: "asc" },
        { lodgementDate: "desc" },
      ],
      select: {
        postcode: true,
        rating: true,
        lodgementDate: true,
      },
    });

    // pick latest per postcode from sorted list
    const latestByPc = new Map<string, string>();
    for (const r of epcs) {
      const pc = normPostcode(r.postcode);
      if (!pc || latestByPc.has(pc) || !r.rating) continue;
      latestByPc.set(pc, r.rating);
    }

    // update canonical properties (loop per postcode so values can differ)
    for (const [pc, rating] of latestByPc.entries()) {
      const res = await prisma.property.updateMany({
        where: { postcode: pc },
        data: { epcRating: rating },
      });
      if (res.count > 0) updatedPostcodes++;
    }

    chunksDone++;
    if (chunksDone % 10 === 0 || i + chunkSize >= propPostcodes.length) {
      const done = Math.min(i + chunkSize, propPostcodes.length);
      console.log(
        `Progress: ${done.toLocaleString()}/${propPostcodes.length.toLocaleString()} postcodes scanned. ` +
        `Postcodes updated so far: ${updatedPostcodes.toLocaleString()}`
      );
    }
  }

  console.log(
    `Done. EPC linked to Property. Postcodes updated: ${updatedPostcodes.toLocaleString()}.`
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
