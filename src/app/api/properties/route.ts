import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function GET() {
    const properties = await prisma.property.findMany({
        orderBy: { id: "asc" },
    });

    return NextResponse.json(properties);
}
