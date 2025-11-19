"use client";

import { useEffect, useRef } from "react";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";

// Hard-coded sample properties for now.
const properties = [
    {
        id: 1,
        name: "Test Office A",
        address: "Somewhere in the City",
        lng: -0.09,
        lat: 51.515,
    },
    {
        id: 2,
        name: "Test Office B",
        address: "Somewhere in Westminster",
        lng: -0.13,
        lat: 51.505,
    },
];

export default function Map() {
    const containerRef = useRef<HTMLDivElement | null>(null);
    const mapRef = useRef<maplibregl.Map | null>(null);

    useEffect(() => {
        if (!containerRef.current || mapRef.current) return;

        const map = new maplibregl.Map({
            container: containerRef.current,
            // Style object using standard OpenStreetMap raster tiles
            style: {
                version: 8,
                sources: {
                    "osm-tiles": {
                        type: "raster",
                        tiles: [
                            // Public OSM tile server – fine for dev / light usage
                            "https://tile.openstreetmap.org/{z}/{x}/{y}.png",
                        ],
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
            center: [-0.1, 51.5], // [lng, lat] – near central London
            zoom: 11,
        });

        map.addControl(new maplibregl.NavigationControl(), "top-right");

        // Add a marker for each hard-coded property.
        properties.forEach((property) => {
            // Create a popup with some simple HTML.
            const popup = new maplibregl.Popup({ offset: 25 }).setHTML(
                `
                <div style="
                    font-size: 13px;
                    color: #000;
                ">
                <div style="font-weight: 600; margin-bottom: 4px;">
                    ${property.name}
                </div>
                <div>
                    ${property.address}
                </div>
              </div>
            `
            );

            // Create the marker and attach the popup.
            new maplibregl.Marker()
                .setLngLat([property.lng, property.lat])
                .setPopup(popup)
                .addTo(map);
        });

        mapRef.current = map;

        return () => {
            map.remove();
        };
    }, []);

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
