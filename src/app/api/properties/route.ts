import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function GET(req: Request) {
    const { searchParams } = new URL(req.url);

    const take = Number(searchParams.get("take") ?? 500);

    // bbox format: "west,south,east,north"
    const bboxParam = searchParams.get("bbox");
    let bboxWhere: any = undefined;

    if (bboxParam) {
        const parts = bboxParam.split(",").map(Number);
        if (parts.length === 4 && parts.every((n) => Number.isFinite(n))) {
            const [west, south, east, north] = parts;
            bboxWhere = {
                lat: { gte: south, lte: north },
                lng: { gte: west, lte: east },
            };
        }
    }

    // cursor pagination
    const cursorParam = searchParams.get("cursor"); // Property.id
    const cursorId = cursorParam ? Number(cursorParam) : null;

    const properties = await prisma.property.findMany({
        where: bboxWhere ?? undefined,
        orderBy: [
            { lastSaleDate: "desc" },
            { id: "desc" }, // tie-breaker for stable paging
        ],
        take,
        ...(cursorId
            ? {
                cursor: { id: cursorId },
                skip: 1, // don't repeat the cursor row
            }
            : {}),
    });

    const nextCursor =
        properties.length === take
            ? properties[properties.length - 1].id
            : null;

    return NextResponse.json({ properties, nextCursor });
}
