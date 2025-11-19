"use client";

import { useState } from "react";
import Map from "@/components/Map";
import { properties } from "@/data/properties";

export default function Home() {
  // Keep track of which property (by id) is selected from the list.
  const [selectedPropertyId, setSelectedPropertyId] = useState<number | null>(
    null
  );

  return (
    <main
      style={{
        height: "100vh",
        overflow: "hidden",
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
          display: "flex",
          minHeight: 0,
        }}
      >
        {/* LEFT: property list */}
        <aside
          style={{
            width: 260,
            borderRight: "1px solid #333",
            backgroundColor: "#181818",
            color: "#f5f5f5",
            fontSize: "13px",
            overflowY: "auto",
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
            {properties.map((p) => {
              const isSelected = p.id === selectedPropertyId;
              return (
                <li
                  key={p.id}
                  onClick={() => setSelectedPropertyId(p.id)}
                  style={{
                    padding: "0.5rem 0.75rem",
                    borderBottom: "1px solid #222",
                    cursor: "pointer",
                    backgroundColor: isSelected ? "#252525" : "transparent",
                  }}
                >
                  <div style={{ fontWeight: 600, marginBottom: 2 }}>
                    {p.name}
                  </div>
                  <div style={{ opacity: 0.8 }}>{p.address}</div>
                </li>
              );
            })}
          </ul>
        </aside>

        {/* RIGHT: map area */}
        <div
          style={{
            flex: 1,
            position: "relative",
          }}
        >
          {/* Pass the selectedPropertyId down into the map */}
          <Map selectedPropertyId={selectedPropertyId ?? undefined} />
        </div>
      </section>
    </main>
  );
}
