import { useEffect, useRef } from "react";
import L from "leaflet";
import type { Sensor, Zone } from "@/lib/types";

const RISK_FILL: Record<string, string> = {
  critical: "#DC2626",
  high: "#EA580C",
  medium: "#D97706",
  low: "#15803D",
};

export interface GISLayerState {
  sensors: boolean;
  hazardZones: boolean;
  rainfall: boolean;
  satellite: boolean;
  boundaries: boolean;
}

export const DEFAULT_LAYERS: GISLayerState = {
  sensors: true,
  hazardZones: true,
  rainfall: true,
  satellite: false,
  boundaries: true,
};

/** Leaflet + OpenStreetMap map with hazard-zone circles and sensor markers. */
export default function GISMap({
  zones,
  sensors,
  layers = DEFAULT_LAYERS,
  height = "100%",
  onSelectZone,
  testId = "gis-map",
}: {
  zones: Zone[];
  sensors: Sensor[];
  layers?: GISLayerState;
  height?: string;
  onSelectZone?: (zone: Zone) => void;
  testId?: string;
}) {
  const holder = useRef<HTMLDivElement | null>(null);
  const map = useRef<L.Map | null>(null);
  const overlay = useRef<L.LayerGroup | null>(null);
  const tiles = useRef<L.TileLayer | null>(null);
  const selectRef = useRef(onSelectZone);
  selectRef.current = onSelectZone;

  useEffect(() => {
    if (!holder.current || map.current) return;
    const instance = L.map(holder.current, { center: [21.5, 79.0], zoom: 5, zoomControl: true, attributionControl: true });
    map.current = instance;
    overlay.current = L.layerGroup().addTo(instance);
    return () => {
      instance.remove();
      map.current = null;
      overlay.current = null;
      tiles.current = null;
    };
  }, []);

  // Base tile layer follows the satellite toggle.
  useEffect(() => {
    if (!map.current) return;
    if (tiles.current) tiles.current.remove();
    const url = layers.satellite
      ? "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
      : "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png";
    tiles.current = L.tileLayer(url, {
      maxZoom: 17,
      attribution: layers.satellite ? "Imagery © Esri" : "© OpenStreetMap contributors",
    }).addTo(map.current);
  }, [layers.satellite]);

  useEffect(() => {
    const group = overlay.current;
    if (!group) return;
    group.clearLayers();

    if (layers.hazardZones) {
      zones.forEach((zone) => {
        const colour = RISK_FILL[zone.risk_level] ?? "#0F4C81";
        const circle = L.circle([zone.lat, zone.lng], {
          radius: zone.radius_km * 1000,
          color: colour,
          weight: 1.5,
          fillColor: colour,
          fillOpacity: 0.14,
        }).bindPopup(
          `<strong>${zone.name}</strong><br/>${zone.district}, ${zone.state}<br/>` +
            `Risk: <b style="color:${colour}">${zone.risk_level.toUpperCase()} (${zone.risk_score}%)</b><br/>` +
            `Rainfall ${zone.rainfall_mm} mm/h · Water ${zone.water_level_m} m<br/>${zone.sensor_count} sensors`,
        );
        circle.on("click", () => selectRef.current?.(zone));
        group.addLayer(circle);

        if (layers.boundaries) {
          group.addLayer(
            L.marker([zone.lat, zone.lng], {
              icon: L.divIcon({
                className: "",
                html: `<div style="white-space:nowrap;transform:translate(-50%,-140%);background:#0B2545;color:#fff;font:600 10px/1.4 'IBM Plex Sans',sans-serif;padding:2px 6px;border-radius:4px;">${zone.name}</div>`,
                iconSize: [0, 0],
              }),
              interactive: false,
            }),
          );
        }

        if (layers.rainfall && zone.rainfall_mm > 30) {
          group.addLayer(
            L.circle([zone.lat, zone.lng], {
              radius: zone.radius_km * 1450,
              color: "#0D9488",
              weight: 1,
              dashArray: "4 5",
              fillColor: "#0D9488",
              fillOpacity: 0.07,
            }),
          );
        }
      });
    }

    if (layers.sensors) {
      sensors.forEach((sensor) => {
        const online = sensor.status === "online";
        group.addLayer(
          L.circleMarker([sensor.lat, sensor.lng], {
            radius: 5,
            color: online ? "#0F4C81" : "#94A3B8",
            weight: 2,
            fillColor: online ? "#22C55E" : "#CBD5E1",
            fillOpacity: 1,
          }).bindPopup(
            `<strong>${sensor.code}</strong><br/>${sensor.name}<br/>` +
              `Reading: <b>${sensor.last_value} ${sensor.unit}</b><br/>` +
              `Status: ${sensor.status} · Battery ${sensor.battery}%`,
          ),
        );
      });
    }
  }, [zones, sensors, layers.hazardZones, layers.sensors, layers.rainfall, layers.boundaries]);

  return <div ref={holder} style={{ height, width: "100%" }} className="z-0 rounded-lg" data-testid={testId} />;
}
