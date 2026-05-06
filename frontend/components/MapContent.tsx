"use client";

import { useEffect, useState } from "react";
import { MapContainer, TileLayer, Marker, Popup, CircleMarker, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { workersApi } from "@/lib/api";

interface ZoneData {
  id: string;
  name: string;
  pin_code: string;
  lat: number;
  lng: number;
  flood_risk_index: number;
  zone_factor: number;
}

function MapResizer() {
  const map = useMap();
  useEffect(() => {
    const timeoutId = setTimeout(() => { map.invalidateSize(); }, 250);
    const resizeObserver = new ResizeObserver(() => {
      requestAnimationFrame(() => { map.invalidateSize(); });
    });
    const container = map.getContainer();
    if (container) resizeObserver.observe(container);
    return () => {
      clearTimeout(timeoutId);
      if (container) resizeObserver.unobserve(container);
      resizeObserver.disconnect();
    };
  }, [map]);
  return null;
}

const fixLeafletIcons = () => {
  delete (L.Icon.Default.prototype as any)._getIconUrl;
  L.Icon.Default.mergeOptions({
    iconRetinaUrl: "https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon-2x.png",
    iconUrl: "https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon.png",
    shadowUrl: "https://unpkg.com/leaflet@1.7.1/dist/images/marker-shadow.png",
  });
};

function riskColor(floodRisk: number) {
  if (floodRisk >= 0.7) return { stroke: "#EF4444", fill: "#EF4444" };
  if (floodRisk >= 0.45) return { stroke: "#F59E0B", fill: "#F59E0B" };
  return { stroke: "#10B981", fill: "#10B981" };
}

function riskLabel(floodRisk: number) {
  if (floodRisk >= 0.7) return "High";
  if (floodRisk >= 0.45) return "Medium";
  return "Low";
}

export default function MapContent({ recentClaims = [] }: { recentClaims?: any[] }) {
  const [zones, setZones] = useState<ZoneData[]>([]);

  useEffect(() => {
    fixLeafletIcons();
    workersApi.getZones().then(r => setZones(r.data)).catch(() => {});
  }, []);

  return (
    <MapContainer
      center={[19.0760, 72.8777]}
      zoom={11}
      scrollWheelZoom={false}
      zoomControl={false}
      className="h-full w-full bg-[#10162A] z-0"
    >
      <MapResizer />
      <TileLayer
        attribution="&copy; CARTO"
        url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
      />

      {zones.map((zone) => {
        const colors = riskColor(zone.flood_risk_index);
        return (
          <div key={zone.id}>
            <Marker position={[zone.lat, zone.lng]}>
              <Popup>
                <div style={{ padding: "10px 12px", minWidth: 168 }}>
                  <p style={{ fontWeight: 800, fontSize: 13, marginBottom: 8 }}>{zone.name}</p>
                  <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11 }}>
                      <span style={{ color: "#6B7280" }}>Flood Risk</span>
                      <span style={{ fontWeight: 700, color: colors.stroke }}>
                        {riskLabel(zone.flood_risk_index)} ({(zone.flood_risk_index * 100).toFixed(0)}%)
                      </span>
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11 }}>
                      <span style={{ color: "#6B7280" }}>Zone Factor</span>
                      <span style={{ fontWeight: 700 }}>{zone.zone_factor.toFixed(2)}×</span>
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11 }}>
                      <span style={{ color: "#6B7280" }}>Pin Code</span>
                      <span style={{ fontWeight: 700 }}>{zone.pin_code}</span>
                    </div>
                  </div>
                </div>
              </Popup>
            </Marker>
            <CircleMarker
              center={[zone.lat, zone.lng]}
              radius={38}
              pathOptions={{
                color: colors.stroke,
                fillColor: colors.fill,
                fillOpacity: 0.08,
                weight: 1.5,
                dashArray: "6, 8",
              }}
            />
          </div>
        );
      })}

      {recentClaims.slice(0, 15).map((c, i) => {
        const zone = zones.find((z) => z.id === (c.zone_id || "zone-bandra")) || zones[0];
        if (!zone) return null;
        const jitterLat = zone.lat + (Math.random() - 0.5) * 0.03;
        const jitterLng = zone.lng + (Math.random() - 0.5) * 0.03;
        const isFraud = c.as_score < 45 || c.status === "manual_review";
        return (
          <CircleMarker
            key={`claim-${c.id}-${i}`}
            center={[jitterLat, jitterLng]}
            radius={isFraud ? 10 : 7}
            pathOptions={{
              color: isFraud ? "#EF4444" : "#10B981",
              fillColor: isFraud ? "#EF4444" : "#10B981",
              fillOpacity: 0.8,
              weight: 3,
            }}
          >
            <Popup>
              <div style={{ padding: "10px 12px", textAlign: "center" }}>
                <p style={{ fontSize: 10, color: "#6B7280", textTransform: "uppercase", marginBottom: 4 }}>
                  #{c.id?.substring(0, 6).toUpperCase()}
                </p>
                <p style={{ fontSize: 20, fontWeight: 800 }}>₹{(c.payout_amount_rs || 0).toLocaleString()}</p>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 6, marginTop: 8 }}>
                  <div style={{ width: 8, height: 8, borderRadius: "50%", background: isFraud ? "#EF4444" : "#10B981" }} />
                  <span style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase" }}>
                    {isFraud ? "Under Review" : "Settled"}
                  </span>
                </div>
              </div>
            </Popup>
          </CircleMarker>
        );
      })}
    </MapContainer>
  );
}
