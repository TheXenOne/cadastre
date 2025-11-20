"use client";

import { useEffect, useRef } from "react";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import type { Property } from "@/data/properties";

// Props: the properties to render + which one is selected
type MapProps = {
    properties: Property[];
    selectedPropertyId?: number;
};

export default function Map({ properties, selectedPropertyId }: MapProps) {
    const containerRef = useRef<HTMLDivElement | null>(null);
    const mapRef = useRef<maplibregl.Map | null>(null);
    const markersRef = useRef<Record<number, maplibregl.Marker>>({});

    // 1) Create the map once
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

        mapRef.current = map;

        return () => {
            map.remove();
        };
    }, []);

    // 2) Whenever the properties array changes, rebuild markers
    useEffect(() => {
        if (!mapRef.current) return;

        const map = mapRef.current;

        // Remove any existing markers
        Object.values(markersRef.current).forEach((marker) => marker.remove());
        markersRef.current = {};

        // Add markers for each property
        properties.forEach((property) => {
            const priceText =
                property.lastSalePrice != null
                    ? `£${property.lastSalePrice.toLocaleString("en-GB")}`
                    : "Unknown";

            const lastSaleDateText =
                property.lastSaleDate != null
                    ? new Date(property.lastSaleDate).toLocaleDateString("en-GB")
                    : "Unknown";


            const rateableValueText =
                property.rateableValue != null
                    ? `£${property.rateableValue.toLocaleString("en-GB")}`
                    : "Unknown";

            const epcText = property.epcRating ?? "Unknown";

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

      <div class="cad-popup-row">
        <span class="cad-popup-row-label">Last sale:</span>
        <span>${priceText} (${lastSaleDateText})</span>
      </div>

      <div class="cad-popup-row">
        <span class="cad-popup-row-label">Rateable value:</span>
        <span>${rateableValueText}</span>
      </div>

      <div class="cad-popup-row">
        <span class="cad-popup-row-label">EPC:</span>
        <span>${epcText}</span>
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

            markersRef.current[property.id] = marker;
        });
    }, [properties]);

    // 3) When selectedPropertyId changes, fly to it and open its popup
    useEffect(() => {
        if (!mapRef.current || selectedPropertyId == null) return;

        const property = properties.find((p) => p.id === selectedPropertyId);
        if (!property) return;

        const marker = markersRef.current[selectedPropertyId];
        if (!marker) return;

        mapRef.current.flyTo({
            center: [property.lng, property.lat],
            zoom: 14,
            essential: true,
        });

        marker.togglePopup();
    }, [selectedPropertyId, properties]);

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
