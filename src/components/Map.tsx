"use client";

import { useEffect, useRef } from "react";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import type { Property } from "@/data/properties";

type MapProps = {
    properties: Property[];
    selectedPropertyId?: number;
    onSelectProperty?: (id: number | null) => void;
};

export default function Map({
    properties,
    selectedPropertyId,
    onSelectProperty,
}: MapProps) {
    const containerRef = useRef<HTMLDivElement | null>(null);
    const mapRef = useRef<maplibregl.Map | null>(null);
    const markersRef = useRef<Record<number, maplibregl.Marker>>({});
    const popupRef = useRef<maplibregl.Popup | null>(null);

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
            // clean up popup + markers
            if (popupRef.current) {
                popupRef.current.remove();
                popupRef.current = null;
            }
            Object.values(markersRef.current).forEach((m) => m.remove());
            markersRef.current = {};
            map.remove();
        };
    }, []);

    // 2) Rebuild markers whenever the properties array changes
    useEffect(() => {
        if (!mapRef.current) return;

        const map = mapRef.current;

        // Remove existing markers
        Object.values(markersRef.current).forEach((marker) => {
            marker.remove();
        });
        markersRef.current = {};

        // Add a marker for each property
        properties.forEach((property) => {
            const marker = new maplibregl.Marker()
                .setLngLat([property.lng, property.lat])
                .addTo(map);

            marker.getElement().addEventListener("click", () => {
                if (onSelectProperty) {
                    onSelectProperty(property.id);
                }
            });

            markersRef.current[property.id] = marker;
        });
    }, [properties, onSelectProperty]);

    // 3) When selectedPropertyId changes, fly + open/update popup
    useEffect(() => {
        if (!mapRef.current) return;

        const map = mapRef.current;

        // If nothing selected, close any existing popup and stop
        if (selectedPropertyId == null) {
            if (popupRef.current) {
                popupRef.current.remove();
                popupRef.current = null;
            }
            return;
        }

        const property = properties.find((p) => p.id === selectedPropertyId);
        if (!property) return;

        // Build the strings for this property
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

        const html = `
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
    `;

        // Create the popup once, then just update it
        if (!popupRef.current) {
            const popup = new maplibregl.Popup({
                offset: 25,
                // optional: keep popup open when clicking map
                // closeOnClick: false,
            });

            popup.on("close", () => {
                // User clicked the X or map closed it:
                if (onSelectProperty) onSelectProperty(null);
            });

            popup.addTo(map);
            popupRef.current = popup;
        }

        popupRef.current
            .setLngLat([property.lng, property.lat])
            .setHTML(html);

        // Fly to the property
        map.flyTo({
            center: [property.lng, property.lat],
            zoom: 14,
            essential: true,
        });
    }, [selectedPropertyId, properties, onSelectProperty]);

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
