import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function GET() {
    const rows = await prisma.property.findMany({
        distinct: ["district"],
        where: { district: { not: null } },
        select: { district: true },
        orderBy: { district: "asc" },
    });

    const boroughs = rows
        .map(r => r.district!)
        .filter(Boolean);

    return NextResponse.json(boroughs);
}
