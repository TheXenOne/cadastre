import { NextResponse } from "next/server";
import { auth0 } from "./lib/auth0";

export async function proxy(request: Request) {
    const url = new URL(request.url);

    if (url.pathname === "/auth/callback") {
        const err = url.searchParams.get("error");
        if (err === "access_denied") {
            // just logout and return home (no query string)
            return NextResponse.redirect(new URL("/auth/logout", url.origin));
        }
    }

    return await auth0.middleware(request);
}

export const config = {
    matcher: [
        "/((?!_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt).*)",
    ],
};
