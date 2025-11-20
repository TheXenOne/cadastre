"use client";

import { useEffect, useState } from "react";
import Map from "@/components/Map";
import type { Property } from "@/data/properties";
import { propertyTypeLabel } from "@/lib/propertyType";

export default function Home() {
  const [properties, setProperties] = useState<Property[]>([]);
  const [selectedPropertyId, setSelectedPropertyId] = useState<number | null>(
    null
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [district, setDistrict] = useState("HARINGEY");
  const [take, setTake] = useState(500);

  // Fetch properties from the API when the page first loads
  useEffect(() => {
    const fetchProperties = async () => {
      try {
        setLoading(true);
        setError(null);

        const res = await fetch(`/api/properties?district=${district}&take=${take}`);
        if (!res.ok) {
          throw new Error(`Request failed with status ${res.status}`);
        }

        const data = (await res.json()) as Property[];
        setProperties(data);
      } catch (err: any) {
        console.error(err);
        setError("Failed to load properties.");
      } finally {
        setLoading(false);
      }
    };

    fetchProperties();
  }, []);

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
            Properties
            {loading
              ? " (loading…)"
              : error
                ? ""
                : ` (${properties.length})`}
          </div>

          <div style={{ padding: "0.5rem 0.75rem", borderBottom: "1px solid #333" }}>
            <div style={{ marginBottom: 6, fontWeight: 600 }}>Filter</div>

            <label style={{ display: "block", fontSize: 12, opacity: 0.8 }}>
              District
            </label>
            <input
              value={district}
              onChange={(e) => setDistrict(e.target.value.toUpperCase())}
              placeholder="e.g. HARINGEY"
              style={{
                width: "100%",
                marginTop: 4,
                marginBottom: 8,
                padding: "6px 8px",
                borderRadius: 6,
                border: "1px solid #444",
                background: "#111",
                color: "#fff",
                fontSize: 13,
              }}
            />

            <label style={{ display: "block", fontSize: 12, opacity: 0.8 }}>
              Max results
            </label>
            <input
              type="number"
              value={take}
              onChange={(e) => setTake(Number(e.target.value) || 100)}
              min={50}
              max={5000}
              step={50}
              style={{
                width: "100%",
                marginTop: 4,
                padding: "6px 8px",
                borderRadius: 6,
                border: "1px solid #444",
                background: "#111",
                color: "#fff",
                fontSize: 13,
              }}
            />
          </div>

          {error && (
            <div style={{ padding: "0.75rem", color: "#ff8a8a" }}>{error}</div>
          )}

          {!loading && !error && properties.length === 0 && (
            <div style={{ padding: "0.75rem", opacity: 0.8 }}>
              No properties found.
            </div>
          )}

          {!loading && !error && properties.length > 0 && (
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
                    <div
                      style={{
                        opacity: 0.8,
                        marginBottom: 2,
                        fontSize: "12px",
                      }}
                    >
                      {p.fullAddress}
                    </div>
                    <div
                      style={{
                        opacity: 0.7,
                        fontSize: "11px",
                      }}
                    >
                      {propertyTypeLabel(p.propertyType)} • {p.ownerName}
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </aside>

        {/* RIGHT: map area */}
        <div
          style={{
            flex: 1,
            position: "relative",
          }}
        >
          <Map
            properties={properties}
            selectedPropertyId={selectedPropertyId ?? undefined}
            onSelectProperty={setSelectedPropertyId}
          />
        </div>
      </section>
    </main>
  );
}
