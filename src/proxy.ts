// src/proxy.ts
import { NextResponse } from "next/server";
import { auth0 } from "./lib/auth0";

export async function proxy(request: Request) {
    const url = new URL(request.url);

    // If allowlist denies access, Auth0 sends back error=access_denied to callback
    if (url.pathname === "/auth/callback") {
        const err = url.searchParams.get("error");
        if (err === "access_denied") {
            return NextResponse.redirect(new URL("/denied", url.origin));
        }
    }

    return await auth0.middleware(request);
}

export const config = {
    matcher: [
        "/((?!_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt).*)",
    ],
};
