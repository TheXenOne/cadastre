// This file defines the *main page* of your app.
// In the Next.js App Router, `app/page.tsx` is what shows up at "/" (the home URL).

// We export a React component called `Home`.
// Next.js will render this component when someone visits http://localhost:3000
export default function Home() {
  return (
    // <main> is a semantic HTML tag that describes the main content of the page.
    // Here we give it inline styles (a bit like setting properties in a Unity/UE inspector).
    <main
      style={{
        // Take at least the full height of the browser window.
        minHeight: "100vh",
        // Use flexbox layout so we can easily arrange header + content.
        display: "flex",
        // Stack children (header + section) vertically.
        flexDirection: "column",
      }}
    >
      {/* HEADER AREA */}
      <header
        style={{
          // Add some space inside the header.
          padding: "1rem",
          // A light line at the bottom to separate it from the content.
          borderBottom: "1px solid #ddd",
        }}
      >
        {/* This is just a title at the top of the page. */}
        <h1>Cadastre – Local Map Prototype</h1>
      </header>

      {/* MAIN CONTENT AREA – this is where the map will go later */}
      <section
        style={{
          // Make this section take up all remaining vertical space.
          flex: 1,
          // Center its children vertically and horizontally.
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        {/* Temporary placeholder text so we know where the map will be rendered. */}
        <p>Map will go here.</p>
      </section>
    </main>
  );
}
