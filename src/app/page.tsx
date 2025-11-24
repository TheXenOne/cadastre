"use client";

import { useEffect, useRef, useState } from "react";
import { useUser } from "@auth0/nextjs-auth0/client";

import Map from "@/components/Map";
import AuthButtons from "@/components/AuthButtons";
import type { Property } from "@/data/properties";

import { propertyTypeLabel } from "@/lib/propertyType";
import { tenureLabel } from "@/lib/tenure";
import { newBuildLabel } from "@/lib/newBuild";

export default function Home() {
  const { user, isLoading } = useUser();

  const [properties, setProperties] = useState<Property[]>([]);
  const [selectedPropertyId, setSelectedPropertyId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const itemRefs = useRef<Record<number, HTMLLIElement | null>>({});

  const [bbox, setBbox] = useState<string | null>(null);
  const bboxDebounceRef = useRef<NodeJS.Timeout | null>(null);
  const [zoom, setZoom] = useState<number>(11);

  // Fetch properties when filter changes (only when logged in)
  useEffect(() => {
    if (!user) return;
    if (!bbox) return; // don't fetch until we have bounds

    const controller = new AbortController();

    const fetchProperties = async () => {
      try {
        setLoading(true);
        setError(null);

        const autoTake =
          zoom >= 15 ? 500 :
            zoom >= 13 ? 1200 :
              zoom >= 11 ? 2500 :
                zoom >= 9 ? 6000 :
                  12000;

        const params = new URLSearchParams();
        params.set("bbox", bbox);
        params.set("take", String(autoTake));

        const res = await fetch(`/api/properties?${params.toString()}`, {
          signal: controller.signal,
        });
        if (!res.ok) throw new Error(`Request failed with status ${res.status}`);

        const data = (await res.json()) as { properties: Property[]; nextCursor: number | null };
        setProperties(data.properties);

        // keep selection if it's still in the new result set
        setSelectedPropertyId((prev) => {
          if (prev == null) return null;
          return data.properties.some((p) => p.id === prev) ? prev : null;
        });
      } catch (err: any) {
        if (err.name !== "AbortError") {
          console.error(err);
          setError("Failed to load properties.");
        }
      } finally {
        setLoading(false);
      }
    };

    fetchProperties();
    return () => controller.abort();
  }, [user, bbox, zoom]);

  // Scroll selected item into view
  useEffect(() => {
    if (selectedPropertyId == null) return;
    const el = itemRefs.current[selectedPropertyId];
    if (el) el.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }, [selectedPropertyId]);

  // ---- gated rendering AFTER hooks ----
  if (isLoading) {
    return <main style={{ padding: 20 }}>Loading…</main>;
  }

  if (!user) {
    return (
      <main style={{ height: "100vh", display: "grid", placeItems: "center" }}>
        <div style={{ textAlign: "center" }}>
          <h1>Cadastre</h1>
          <p>Please log in to use the map.</p>
          <a href="/auth/login">Log in</a>
        </div>
      </main>
    );
  }

  return (
    <main style={{ height: "100vh", overflow: "hidden", display: "flex", flexDirection: "column" }}>
      <header
        style={{
          padding: "1rem",
          borderBottom: "1px solid #333",
          backgroundColor: "#111",
          color: "#f5f5f5",
          fontSize: "14px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <h1>Cadastre</h1>
        <AuthButtons />
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
              Borough / Local Authority
            </label>
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
                    ref={(el) => {
                      itemRefs.current[p.id] = el;
                    }}
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
                      {propertyTypeLabel(p.propertyType)} • {tenureLabel(p.tenure)} • {newBuildLabel(p.newBuild)}
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
            onBoundsChange={(nextBbox, nextZoom) => {
              if (bboxDebounceRef.current) clearTimeout(bboxDebounceRef.current);
              bboxDebounceRef.current = setTimeout(() => {
                setBbox(nextBbox);
                setZoom(nextZoom);
              }, 250);
            }}
          />


        </div>
      </section>
    </main>
  );
}
