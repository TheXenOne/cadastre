import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function GET(req: Request) {
    const { searchParams } = new URL(req.url);
    const district = searchParams.get("district"); // e.g. "HARINGEY"
    const take = Number(searchParams.get("take") ?? 500);

    const properties = await prisma.property.findMany({
        where: district ? { district } : undefined,
        orderBy: { lastSaleDate: "desc" },
        take,
    });

    return NextResponse.json(properties);
}
