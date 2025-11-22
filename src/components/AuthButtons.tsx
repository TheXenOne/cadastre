// src/components/AuthButtons.tsx
"use client";

import { useUser } from "@auth0/nextjs-auth0/client";

export default function AuthButtons() {
    const { user, isLoading } = useUser();
    if (isLoading) return null;

    return user ? (
        <a href="/auth/logout" style={{ color: "#fff" }}>Log out</a>
    ) : (
        <a href="/auth/login" style={{ color: "#fff" }}>Log in</a>
    );
}
