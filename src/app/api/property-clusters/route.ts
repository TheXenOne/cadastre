import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import Supercluster from "supercluster";

type PointProps = { id: number };
type ClusterProps = {
    cluster: boolean;
    point_count: number;
    point_count_abbreviated: number;
};

// Cached Supercluster index (rebuilt occasionally)
let index: Supercluster<PointProps, ClusterProps> | null = null;
let indexUpdatedAt = 0;
const INDEX_TTL_MS = 5 * 60 * 1000; // 5 mins

async function buildIndex() {
    const rows = await prisma.property.findMany({
        where: {
            lat: { gte: -90, lte: 90 },
            lng: { gte: -180, lte: 180 },
            NOT: [{ lat: 0, lng: 0 }],
        },
        select: { id: true, lng: true, lat: true },
    });

    console.log(`[clusters] buildIndex rows=${rows.length}`);

    console.log("[clusters] buildIndex rows:", rows.length);

    const roundedCounts = new Map<string, number>();
    for (const r of rows) {
        const k = `${r.lng.toFixed(5)},${r.lat.toFixed(5)}`;
        roundedCounts.set(k, (roundedCounts.get(k) ?? 0) + 1);
    }
    const top = [...roundedCounts.entries()]
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5);

    console.log("[clusters] top rounded coord buckets:", top);

    // Quick sanity on coordinate spread + obvious defaults
    let minLat = Infinity, maxLat = -Infinity, minLng = Infinity, maxLng = -Infinity;
    let defaultCentre = 0;  // your map default centre
    let zeroZero = 0;

    for (const r of rows) {
        const { lat, lng } = r;
        if (lat < minLat) minLat = lat;
        if (lat > maxLat) maxLat = lat;
        if (lng < minLng) minLng = lng;
        if (lng > maxLng) maxLng = lng;

        if (lat === 51.5 && lng === -0.1) defaultCentre++;
        if (lat === 0 && lng === 0) zeroZero++;
    }

    console.log(
        `[clusters] lat range ${minLat}..${maxLat}, lng range ${minLng}..${maxLng}`
    );
    console.log(
        `[clusters] default-centre(51.5,-0.1)=${defaultCentre}, zeroZero=${zeroZero}`
    );

    // Filter out invalid / junk coordinates in JS (Prisma types say number)
    const safeRows = rows.filter((r) => {
        if (!Number.isFinite(r.lng) || !Number.isFinite(r.lat)) return false;

        // drop the common junk location
        if (r.lng === 0 && r.lat === 0) return false;

        // rough UK bounding box to avoid outliers
        if (r.lng < -9 || r.lng > 2) return false;
        if (r.lat < 49 || r.lat > 61) return false;

        return true;
    });

    const points = safeRows.map((r) => ({
        type: "Feature" as const,
        geometry: {
            type: "Point" as const,
            coordinates: [r.lng, r.lat],
        },
        properties: { id: r.id },
    }));

    const sc = new Supercluster<PointProps, ClusterProps>({
        radius: 60,
        maxZoom: 14,
    });

    sc.load(points as any);
    index = sc;
    indexUpdatedAt = Date.now();
}

async function getIndex() {
    if (!index || Date.now() - indexUpdatedAt > INDEX_TTL_MS) {
        await buildIndex();
    }
    return index!;
}

export async function GET(req: Request) {
    const { searchParams } = new URL(req.url);

    const bboxStr = searchParams.get("bbox");
    const zoomStr = searchParams.get("zoom");

    if (!bboxStr || !zoomStr) {
        return NextResponse.json({ error: "bbox and zoom required" }, { status: 400 });
    }

    const parts = bboxStr.split(",").map((x) => Number(x));
    if (parts.length !== 4 || parts.some((n) => !Number.isFinite(n))) {
        return NextResponse.json({ error: "invalid bbox" }, { status: 400 });
    }

    // bbox is west,south,east,north (lng,lat,lng,lat)
    const [west, south, east, north] = parts;

    const zRaw = Math.floor(Number(zoomStr));
    const zoom = Math.max(0, Math.min(20, zRaw));

    const sc = await getIndex();
    const clusters = sc.getClusters([west, south, east, north], zoom);

    console.log(`[clusters] GET bbox=${bboxStr} zoom=${zoom} -> rawClusters=${clusters.length}`);

    // Find the largest few clusters to spot megacluster source
    const counts = clusters.map((c: any) =>
        c.properties?.cluster ? c.properties.point_count : 1
    );
    counts.sort((a: number, b: number) => b - a);
    console.log(
        `[clusters] topCounts=${counts.slice(0, 5).join(", ")}`
    );

    return NextResponse.json({
        clusters: clusters.map((c: any) => {
            const [lng, lat] = c.geometry.coordinates;
            return {
                lng,
                lat,
                count: c.properties.cluster ? c.properties.point_count : 1,
            };
        }),
    });
}
