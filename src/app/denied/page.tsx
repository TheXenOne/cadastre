export default function DeniedPage() {
    return (
        <main
            style={{
                height: "100vh",
                display: "grid",
                placeItems: "center",
                background: "#0a0a0a",
                color: "#ededed",
                padding: 24,
            }}
        >
            <div
                style={{
                    width: "100%",
                    maxWidth: 440,
                    background: "#181818",
                    border: "1px solid #333",
                    borderRadius: 12,
                    padding: 20,
                    textAlign: "center",
                }}
            >
                <h1 style={{ fontSize: 20, marginBottom: 8 }}>Access denied</h1>
                <p style={{ opacity: 0.85, marginBottom: 16 }}>
                    This dev site is in private alpha. Your email isn’t white-listed yet.
                </p>

                <a
                    href="/auth/logout"
                    style={{
                        display: "inline-block",
                        padding: "8px 12px",
                        borderRadius: 8,
                        background: "#2a2a2a",
                        color: "#fff",
                        textDecoration: "none",
                        fontSize: 13,
                    }}
                >
                    Log out
                </a>
            </div>
        </main>
    );
}
