"use client";
// This component runs in the browser (can use window, etc.).

import { useEffect, useRef } from "react";
import maplibregl from "maplibre-gl";
// We *can* add the CSS later; the map will still render without it for now.
// import "maplibre-gl/dist/maplibre-gl.css";

export default function Map() {
    // This ref points to the <div> we render below.
    const containerRef = useRef<HTMLDivElement | null>(null);

    // Keep a reference to the map instance so we don't recreate it.
    const mapRef = useRef<maplibregl.Map | null>(null);

    useEffect(() => {
        // If we don't have a container yet, or we've already made a map, do nothing.
        if (!containerRef.current || mapRef.current) return;

        // Create the MapLibre map.
        const map = new maplibregl.Map({
            container: containerRef.current, // HTML element to render into
            style: "https://demotiles.maplibre.org/style.json", // demo basemap style
            center: [-0.1, 51.5], // [lng, lat] – roughly central London
            zoom: 11,             // zoom level
        });

        // Add zoom/rotation controls in the top-right corner.
        map.addControl(new maplibregl.NavigationControl(), "top-right");

        // Save the map instance.
        mapRef.current = map;

        // Cleanup: when React unmounts this component, remove the map.
        return () => {
            map.remove();
        };
    }, []); // run once on mount

    // This div fills the whole <section> because of the absolute positioning.
    return (
        <div
            ref={containerRef}
            style={{
                position: "absolute",
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
            }}
        />
    );
}
