"use client";

import Map from "@/components/Map";
import { properties } from "@/data/properties";

export default function Home() {
  return (
    <main
      style={{
        height: "100vh",     // exactly one screen
        overflow: "hidden",  // no page scrolling
        display: "flex",
        flexDirection: "column",
      }}
    >
      {/* Top header bar */}
      <header
        style={{
          padding: "1rem",
          borderBottom: "1px solid #333",
          backgroundColor: "#111",
          color: "#f5f5f5",
          fontSize: "14px",
        }}
      >
        <h1>Cadastre – Local Map Prototype</h1>
      </header>

      {/* Main content: sidebar + map */}
      <section
        style={{
          flex: 1,
          display: "flex",   // lay out sidebar and map next to each other
          minHeight: 0,      // helps prevent flex children from overflowing
        }}
      >
        {/* LEFT: simple property list */}
        <aside
          style={{
            width: 260,
            borderRight: "1px solid #333",
            backgroundColor: "#181818",
            color: "#f5f5f5",
            fontSize: "13px",
            overflowY: "auto", // scroll list if it’s tall
          }}
        >
          <div
            style={{
              padding: "0.75rem 0.75rem 0.25rem",
              borderBottom: "1px solid #333",
              fontWeight: 600,
            }}
          >
            Properties ({properties.length})
          </div>

          <ul style={{ listStyle: "none", margin: 0, padding: 0 }}>
            {properties.map((p) => (
              <li
                key={p.id}
                style={{
                  padding: "0.5rem 0.75rem",
                  borderBottom: "1px solid #222",
                }}
              >
                <div style={{ fontWeight: 600, marginBottom: 2 }}>
                  {p.name}
                </div>
                <div style={{ opacity: 0.8 }}>{p.address}</div>
              </li>
            ))}
          </ul>
        </aside>

        {/* RIGHT: map area */}
        <div
          style={{
            flex: 1,
            position: "relative", // so Map can absolutely fill this
          }}
        >
          <Map />
        </div>
      </section>
    </main>
  );
}
