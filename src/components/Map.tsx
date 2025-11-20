"use client";

import { useEffect, useRef } from "react";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { properties } from "@/data/properties";

// Props: optional selected property ID
type MapProps = {
    selectedPropertyId?: number;
};

export default function Map({ selectedPropertyId }: MapProps) {
    const containerRef = useRef<HTMLDivElement | null>(null);
    const mapRef = useRef<maplibregl.Map | null>(null);

    // Keep a lookup from property id -> marker
    const markersRef = useRef<Record<number, maplibregl.Marker>>({});

    // 1) Create the map and markers once
    useEffect(() => {
        if (!containerRef.current || mapRef.current) return;

        const map = new maplibregl.Map({
            container: containerRef.current,
            style: {
                version: 8,
                sources: {
                    "osm-tiles": {
                        type: "raster",
                        tiles: ["https://tile.openstreetmap.org/{z}/{x}/{y}.png"],
                        tileSize: 256,
                        attribution:
                            '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
                    },
                },
                layers: [
                    {
                        id: "osm-tiles",
                        type: "raster",
                        source: "osm-tiles",
                    },
                ],
            },
            center: [-0.1, 51.5],
            zoom: 11,
        });

        map.addControl(new maplibregl.NavigationControl(), "top-right");

        // Create a marker + popup for each property and remember the marker
        properties.forEach((property) => {
            const popup = new maplibregl.Popup({
                offset: 25,
            }).setHTML(
                `
  <div class="cad-popup">
    <div class="cad-popup-title">${property.name}</div>
    <div class="cad-popup-subtitle">${property.fullAddress}</div>

    <div class="cad-popup-row">
      <span class="cad-popup-row-label">Type:</span>
      <span>${property.propertyType.toUpperCase()}</span>
    </div>

    <div class="cad-popup-row">
      <span class="cad-popup-row-label">Owner:</span>
      <span>${property.ownerName}</span>
    </div>

    ${property.contactSummary
                    ? `<div class="cad-popup-row">
             <span class="cad-popup-row-label">Contact:</span>
             <span>${property.contactSummary}</span>
           </div>`
                    : ""
                }
  </div>
  `
            );

            const marker = new maplibregl.Marker()
                .setLngLat([property.lng, property.lat])
                .setPopup(popup)
                .addTo(map);

            // Store marker keyed by property id
            markersRef.current[property.id] = marker;
        });

        mapRef.current = map;

        return () => {
            map.remove();
        };
    }, []);

    // 2) Whenever selectedPropertyId changes, fly to it and open its popup
    useEffect(() => {
        if (!mapRef.current || selectedPropertyId == null) return;

        const property = properties.find((p) => p.id === selectedPropertyId);
        if (!property) return;

        const marker = markersRef.current[selectedPropertyId];
        if (!marker) return;

        // Fly to the property location
        mapRef.current.flyTo({
            center: [property.lng, property.lat],
            zoom: 14,
            essential: true,
        });

        // Open this marker's popup (or close+open if it was already visible)
        marker.togglePopup();
    }, [selectedPropertyId]);

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
