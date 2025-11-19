"use client";
// ^ This tells Next.js that this page runs in the browser,
//   so it can use client-side stuff and client components.

import Map from "@/components/Map"; // Import the Map component we just created.

export default function Home() {
  return (
    // Main layout container for the page.
    <main
      style={{
        height: "100vh",      // exactly one viewport height
        overflow: "hidden",   // don't let the page scroll
        display: "flex",
        flexDirection: "column",
      }}
    >
      {/* Simple header bar at the top */}
      <header
        style={{
          padding: "1rem",
          borderBottom: "1px solid #ddd",
        }}
      >
        <h1>Cadastre – Local Map Prototype</h1>
      </header>

      {/* This section fills the rest of the page and holds the map */}
      <section
        style={{
          flex: 1,              // take all remaining space under the header
          position: "relative", // so children can absolutely fill this area
        }}
      >
        <Map />
      </section>
    </main>
  );
}
