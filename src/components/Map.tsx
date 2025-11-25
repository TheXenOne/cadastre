"use client";

import { useEffect, useRef, useState } from "react";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import type { Property } from "@/data/properties";
import { propertyTypeLabel } from "@/lib/propertyType";
import { tenureLabel } from "@/lib/tenure";
import { newBuildLabel } from "@/lib/newBuild";

type ServerCluster = { lng: number; lat: number; count: number; clusterId: number | null };

type MapProps = {
    properties: Property[];
    serverClusters: ServerCluster[];
    selectedPropertyId?: number;
    onSelectProperty: (id: number | null) => void;
    onBoundsChange?: (bbox: string, zoom: number) => void;
};

export default function Map({
    properties,
    serverClusters,
    selectedPropertyId,
    onSelectProperty,
    onBoundsChange
}: MapProps) {
    const containerRef = useRef<HTMLDivElement | null>(null);
    const mapRef = useRef<maplibregl.Map | null>(null);
    const popupRef = useRef<maplibregl.Popup | null>(null);
    const boundariesRef = useRef<any | null>(null);
    const lastFlyToIdRef = useRef<number | null>(null);
    const lastSelectedRef = useRef<Property | null>(null);

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

        const emitBounds = () => {
            const b = map.getBounds();
            const bbox = `${b.getWest()},${b.getSouth()},${b.getEast()},${b.getNorth()}`;
            const zoom = map.getZoom();
            onBoundsChange?.(bbox, zoom);
        };

        map.on("load", () => {
            // --- clustered source ---
            map.addSource("properties", {
                type: "geojson",
                data: {
                    type: "FeatureCollection",
                    features: [],
                },
                cluster: true,
                clusterRadius: 50,   // px; tweak later
                clusterMaxZoom: 14,  // clusters stop past this zoom
            });

            // --- clusters (circles) ---
            map.addLayer({
                id: "clusters",
                type: "circle",
                source: "properties",
                filter: ["has", "point_count"],
                paint: {
                    // size scales with count
                    "circle-radius": [
                        "step",
                        ["get", "point_count"],
                        14,   // <= first step
                        50, 18,
                        200, 24,
                        1000, 30,
                    ],
                    "circle-color": [
                        "step",
                        ["get", "point_count"],
                        "#5b8def",
                        50, "#4f7fe0",
                        200, "#3f6fce",
                        1000, "#2f5eb8",
                    ],
                    "circle-opacity": 0.85,
                    "circle-stroke-width": 1,
                    "circle-stroke-color": "#0b0b0b",
                },
            });

            // --- cluster count labels ---
            map.addLayer({
                id: "cluster-count",
                type: "symbol",
                source: "properties",
                filter: ["has", "point_count"],
                layout: {
                    "text-field": "{point_count_abbreviated}",
                    "text-font": ["Open Sans Bold", "Arial Unicode MS Bold"],
                    "text-size": 12,
                },
                paint: {
                    "text-color": "#ffffff",
                },
            });

            // --- unclustered points (single properties) ---
            map.addLayer({
                id: "unclustered-point",
                type: "circle",
                source: "properties",
                filter: ["!", ["has", "point_count"]],
                paint: {
                    "circle-radius": 6,
                    "circle-color": "#7dd3fc",
                    "circle-stroke-width": 1,
                    "circle-stroke-color": "#0b0b0b",
                },
            });

            // --- server-side clusters (Supercluster results, no MapLibre clustering) ---
            map.addSource("server-clusters", {
                type: "geojson",
                data: { type: "FeatureCollection", features: [] },
            });

            map.addLayer({
                id: "server-clusters-layer",
                type: "circle",
                source: "server-clusters",
                paint: {
                    "circle-radius": [
                        "step",
                        ["get", "count"],
                        14,
                        50, 18,
                        200, 24,
                        1000, 30,
                        5000, 36,
                    ],
                    "circle-color": [
                        "step",
                        ["get", "count"],
                        "#5b8def",
                        50, "#4f7fe0",
                        200, "#3f6fce",
                        1000, "#2f5eb8",
                    ],
                    "circle-opacity": 0.9,
                    "circle-stroke-width": 1,
                    "circle-stroke-color": "#0b0b0b",
                },
            });

            map.addLayer({
                id: "server-clusters-count",
                type: "symbol",
                source: "server-clusters",
                layout: {
                    "text-field": ["to-string", ["get", "count"]],
                    "text-size": 12,
                },
                paint: { "text-color": "#fff" },
            });

            const updateClusterVisibility = () => {
                const z = map.getZoom();
                const lowZoom = z < 12;

                map.setLayoutProperty("server-clusters-layer", "visibility", lowZoom ? "visible" : "none");
                map.setLayoutProperty("server-clusters-count", "visibility", lowZoom ? "visible" : "none");

                map.setLayoutProperty("clusters", "visibility", lowZoom ? "none" : "visible");
                map.setLayoutProperty("cluster-count", "visibility", lowZoom ? "none" : "visible");
                map.setLayoutProperty("unclustered-point", "visibility", lowZoom ? "none" : "visible");
            };

            updateClusterVisibility();
            map.on("zoomend", updateClusterVisibility);

            // --- ensure clusters render on top of basemap layers ---
            // (move to top in case style has symbol layers above)
            try {
                map.moveLayer("clusters");
                map.moveLayer("cluster-count");
                map.moveLayer("unclustered-point");
            } catch (e) {
                // ignore if already top
            }

            // --- selected property overlay (always on top) ---
            map.addSource("selected-property", {
                type: "geojson",
                data: {
                    type: "FeatureCollection",
                    features: [],
                },
            });

            map.addLayer({
                id: "selected-property-layer",
                type: "circle",
                source: "selected-property",
                paint: {
                    "circle-radius": 8,
                    "circle-color": "#fbbf24",       // amber highlight
                    "circle-stroke-width": 2,
                    "circle-stroke-color": "#0b0b0b",
                },
            });

            // ---- DEBUG: log everything under cursor on any click ----
            map.on("click", (e) => {
                const hits = map.queryRenderedFeatures(e.point);

                console.log("CLICK @", e.lngLat, "hits:", hits.length);

                console.log(
                    hits.map((h) => ({
                        layer: h.layer?.id,
                        type: h.layer?.type,
                        source: h.source,
                        sourceLayer: h.sourceLayer,
                        props: h.properties,
                    }))
                );
            });

            map.on("click", (e) => {
                const hits = map.queryRenderedFeatures(e.point);

                // only features from our clustered source
                const propHits = hits.filter((h) => h.source === "properties");
                if (propHits.length === 0) return;

                // Prefer a cluster hit (either layer could be first)
                const clusterHit = propHits.find((h) => h.properties?.cluster_id != null);

                if (clusterHit) {
                    const clusterId = Number(clusterHit.properties.cluster_id);
                    const source = map.getSource("properties") as any;
                    if (!source) return;

                    const doZoom = (zoom: number) => {
                        const [lng, lat] = (clusterHit.geometry as any).coordinates;
                        map.easeTo({ center: [lng, lat], zoom });
                    };

                    // Support both Promise-style and callback-style APIs
                    const maybePromise = source.getClusterExpansionZoom(clusterId, (err: any, zoom: number) => {
                        if (err) {
                            console.error("getClusterExpansionZoom error", err);
                            return;
                        }
                        doZoom(zoom);
                    });

                    if (maybePromise && typeof maybePromise.then === "function") {
                        maybePromise.then((zoom: number) => doZoom(zoom)).catch((err: any) => {
                            console.error("getClusterExpansionZoom promise error", err);
                        });
                    }

                    return;
                }

                // Otherwise it's an unclustered property point
                const pointHit = propHits.find((h) => h.properties?.id != null);
                if (pointHit) {
                    onSelectProperty(Number(pointHit.properties.id));
                }
            });

            const setPointer = () => (map.getCanvas().style.cursor = "pointer");
            const clearPointer = () => (map.getCanvas().style.cursor = "");

            map.on("mouseenter", "clusters", setPointer);
            map.on("mouseleave", "clusters", clearPointer);
            map.on("mouseenter", "cluster-count", setPointer);
            map.on("mouseleave", "cluster-count", clearPointer);
            map.on("mouseenter", "unclustered-point", setPointer);
            map.on("mouseleave", "unclustered-point", clearPointer);

            // --- click a single (unclustered) point to select it ---
            map.on("click", "unclustered-point", (e) => {
                const features = map.queryRenderedFeatures(e.point, {
                    layers: ["unclustered-point"],
                });
                const f = features[0];
                if (!f) return;

                const id = f.properties?.id;
                if (id != null) {
                    onSelectProperty(Number(id));
                }
            });

            map.on("mouseenter", "unclustered-point", () => {
                map.getCanvas().style.cursor = "pointer";
            });
            map.on("mouseleave", "unclustered-point", () => {
                map.getCanvas().style.cursor = "";
            });

            // --- click server-side clusters to zoom in enough for client clusters to take over ---
            map.on("click", "server-clusters-layer", (e) => {
                const f = e.features?.[0];
                if (!f) return;

                const [lng, lat] = (f.geometry as any).coordinates;

                // jump zoom upward; once we hit >=12 the client clustering/points take over
                const targetZoom = Math.max(map.getZoom() + 2, 12);
                map.easeTo({ center: [lng, lat], zoom: targetZoom });
            });

            map.on("mouseenter", "server-clusters-layer", setPointer);
            map.on("mouseleave", "server-clusters-layer", clearPointer);

            // NOTE: do NOT create DOM markers anymore.
        });
        map.on("moveend", emitBounds);

        map.addControl(new maplibregl.NavigationControl(), "top-right");

        mapRef.current = map;

        return () => {
            // Clean up popup + markers + map (helps in React StrictMode)
            if (popupRef.current) {
                popupRef.current.remove();
                popupRef.current = null;
            }

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

            const beforeId = map.getLayer("clusters") ? "clusters" : undefined;

            // fill BELOW clusters
            map.addLayer(
                {
                    id: "la-fill",
                    type: "fill",
                    source: "local-authorities",
                    paint: {
                        "fill-color": "#ffffff",
                        "fill-opacity": 0.06,
                    },
                },
                beforeId
            );

            // outline BELOW clusters
            map.addLayer(
                {
                    id: "la-outline",
                    type: "line",
                    source: "local-authorities",
                    paint: {
                        "line-color": "#000000ff",
                        "line-width": 3.0,
                        "line-opacity": 0.38,
                    },
                },
                beforeId
            );

            setBoundariesLoaded(true);
        };

        if (map.isStyleLoaded()) addBoundaries();
        else map.once("load", addBoundaries);
    }, []);

    useEffect(() => {
        const map = mapRef.current;
        if (!map) return;
        const source = map.getSource("properties") as maplibregl.GeoJSONSource | undefined;
        if (!source) return;

        const geojson = {
            type: "FeatureCollection" as const,
            features: properties.map((p) => ({
                type: "Feature" as const,
                geometry: {
                    type: "Point" as const,
                    coordinates: [p.lng, p.lat],
                },
                properties: {
                    id: p.id,
                    name: p.name,
                    fullAddress: p.fullAddress,
                    lastSalePrice: p.lastSalePrice,
                    lastSaleDate: p.lastSaleDate,
                    epcRating: p.epcRating,
                },
            })),
        };

        source.setData(geojson);
    }, [properties]);

    useEffect(() => {
        const map = mapRef.current;
        if (!map) return;
        const src = map.getSource("server-clusters") as maplibregl.GeoJSONSource | undefined;
        if (!src) return;

        console.log("[D client] serverClusters -> map source", {
            zoom: map.getZoom(),
            len: serverClusters.length,
            min: serverClusters.reduce((m, c) => Math.min(m, c.count), Infinity),
            max: serverClusters.reduce((m, c) => Math.max(m, c.count), -Infinity),
            top5: [...serverClusters].sort((a, b) => b.count - a.count).slice(0, 5),
        });

        src.setData({
            type: "FeatureCollection",
            features: serverClusters.map((c) => ({
                type: "Feature",
                geometry: { type: "Point", coordinates: [c.lng, c.lat] },
                properties: { count: c.count },
            })),
        });
    }, [serverClusters]);

    useEffect(() => {
        const map = mapRef.current;
        if (!map) return;
        const src = map.getSource("selected-property") as maplibregl.GeoJSONSource | undefined;
        if (!src) return;

        // if selection cleared, clear overlay
        if (selectedPropertyId == null) {
            lastSelectedRef.current = null;
            src.setData({ type: "FeatureCollection", features: [] });
            return;
        }

        // try to find selected in current viewport set
        const p = properties.find((x) => x.id === selectedPropertyId) ?? lastSelectedRef.current;
        if (!p) return;

        // remember latest known selected coords/details
        lastSelectedRef.current = p;

        src.setData({
            type: "FeatureCollection",
            features: [
                {
                    type: "Feature",
                    geometry: { type: "Point", coordinates: [p.lng, p.lat] },
                    properties: { id: p.id },
                },
            ],
        });
    }, [selectedPropertyId, properties]);

    // 4) When selectedPropertyId changes, fly + open/update popup
    useEffect(() => {
        if (!mapRef.current) return;

        const map = mapRef.current;

        // If nothing selected, close any existing popup and stop
        if (selectedPropertyId == null) {
            lastFlyToIdRef.current = null;
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
            const popup = new maplibregl.Popup({ offset: 25, closeOnClick: false });

            popup.on("close", () => {
                if (onSelectProperty) onSelectProperty(null);
            });

            popup.addTo(map);
            popupRef.current = popup;
        }

        popupRef.current.setLngLat([property.lng, property.lat]).setHTML(html);

        // Fly to the property ONLY when the selection ID changes
        if (lastFlyToIdRef.current !== selectedPropertyId) {
            map.flyTo({
                center: [property.lng, property.lat],
                zoom: 14,
                essential: true,
            });
            lastFlyToIdRef.current = selectedPropertyId;
        }
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
