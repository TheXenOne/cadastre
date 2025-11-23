"use client";

import { useEffect, useRef, useState } from "react";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import type { Property } from "@/data/properties";
import { propertyTypeLabel } from "@/lib/propertyType";
import { tenureLabel } from "@/lib/tenure";
import { newBuildLabel } from "@/lib/newBuild";

type MapProps = {
    properties: Property[];
    selectedPropertyId?: number;
    onSelectProperty: (id: number | null) => void;
    onBoundsChange?: (bbox: string) => void;
};

export default function Map({
    properties,
    selectedPropertyId,
    onSelectProperty,
    onBoundsChange
}: MapProps) {
    const containerRef = useRef<HTMLDivElement | null>(null);
    const mapRef = useRef<maplibregl.Map | null>(null);
    const markersRef = useRef<Record<number, maplibregl.Marker>>({});
    const popupRef = useRef<maplibregl.Popup | null>(null);
    const boundariesRef = useRef<any | null>(null);

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

        map.on("moveend", () => {
            const b = map.getBounds();
            const west = b.getWest();
            const south = b.getSouth();
            const east = b.getEast();
            const north = b.getNorth();

            const bbox = `${west},${south},${east},${north}`;
            onBoundsChange?.(bbox);
        });

        map.addControl(new maplibregl.NavigationControl(), "top-right");

        mapRef.current = map;

        return () => {
            // Clean up popup + markers + map (helps in React StrictMode)
            if (popupRef.current) {
                popupRef.current.remove();
                popupRef.current = null;
            }
            Object.values(markersRef.current).forEach((m) => m.remove());
            markersRef.current = {};
            map.remove();
            mapRef.current = null;
        };
    }, []);

    const [boundariesLoaded, setBoundariesLoaded] = useState(false);

    // Load boundaries once
    useEffect(() => {
        if (!mapRef.current) return;
        const map = mapRef.current;

        const addBoundaries = async () => {
            const res = await fetch(
                "/data/boundaries/local_authority_boundaries.geojson"
            );
            const geojson = await res.json();
            boundariesRef.current = geojson;

            if (map.getSource("local-authorities")) return;

            map.addSource("local-authorities", {
                type: "geojson",
                data: geojson,
            });

            map.addLayer({
                id: "la-fill",
                type: "fill",
                source: "local-authorities",
                paint: {
                    "fill-color": "#ffffff",
                    "fill-opacity": 0.06,
                },
            });

            map.addLayer({
                id: "la-outline",
                type: "line",
                source: "local-authorities",
                paint: {
                    "line-color": "#000000ff",
                    "line-width": 3.0,
                    "line-opacity": 0.38,
                },
            });

            setBoundariesLoaded(true);
        };

        if (map.isStyleLoaded()) addBoundaries();
        else map.once("load", addBoundaries);
    }, []);

    // 3) Rebuild markers whenever the properties array changes
    useEffect(() => {
        if (!mapRef.current) return;

        const map = mapRef.current;

        // Remove existing markers
        Object.values(markersRef.current).forEach((marker) => {
            marker.remove();
        });
        markersRef.current = {};

        properties.forEach((property) => {
            const isSelected = property.id === selectedPropertyId;

            // Create custom DOM element for the marker
            const el = document.createElement("button");
            el.type = "button";
            el.className = `cad-marker${isSelected ? " cad-marker--selected" : ""}`;

            const inner = document.createElement("div");
            inner.className = "cad-marker__dot";
            el.appendChild(inner);

            el.addEventListener("click", (e) => {
                e.stopPropagation();
                if (onSelectProperty) {
                    onSelectProperty(property.id);
                }
            });

            const marker = new maplibregl.Marker({ element: el })
                .setLngLat([property.lng, property.lat])
                .addTo(map);

            markersRef.current[property.id] = marker;
        });
    }, [properties, selectedPropertyId, onSelectProperty]);

    // 4) When selectedPropertyId changes, fly + open/update popup
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
          <span>${propertyTypeLabel(property.propertyType)}</span>
        </div>

        <div class="cad-popup-row">
          <span class="cad-popup-row-label">Tenure:</span>
          <span>${tenureLabel(property.tenure)}</span>
        </div>

        <div class="cad-popup-row">
          <span class="cad-popup-row-label">Build:</span>
          <span>${newBuildLabel(property.newBuild)}</span>
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
            const popup = new maplibregl.Popup({ offset: 25 });

            popup.on("close", () => {
                if (onSelectProperty) onSelectProperty(null);
            });

            popup.addTo(map);
            popupRef.current = popup;
        }

        popupRef.current.setLngLat([property.lng, property.lat]).setHTML(html);

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
