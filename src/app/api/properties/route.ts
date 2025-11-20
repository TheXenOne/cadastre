import { NextResponse } from "next/server";
// Import the JSON file we just created
import properties from "@/../public/data/properties.json";

export async function GET() {
    // Just return the JSON as-is for now
    return NextResponse.json(properties);
}
