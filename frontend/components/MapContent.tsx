"use client";

import { useEffect } from "react";
import { MapContainer, TileLayer, Marker, Popup, CircleMarker, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

// Formats map upon any resize or rendering anomaly 
function MapResizer() {
  const map = useMap();
  useEffect(() => {
    // Initial invalidate
    const timeoutId = setTimeout(() => {
      map.invalidateSize();
    }, 250);
    
    // Resize observer for container changes (like tabs)
    const resizeObserver = new ResizeObserver(() => {
      requestAnimationFrame(() => {
        map.invalidateSize();
      });
    });
    
    const container = map.getContainer();
    if (container) {
      resizeObserver.observe(container);
    }
    
    return () => {
      clearTimeout(timeoutId);
      if (container) {
        resizeObserver.unobserve(container);
      }
      resizeObserver.disconnect();
    };
  }, [map]);
  return null;
}

// Fix for default Leaflet icon assets in Next.js
const fixLeafletIcons = () => {
  delete (L.Icon.Default.prototype as any)._getIconUrl;
  L.Icon.Default.mergeOptions({
    iconRetinaUrl: "https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon-2x.png",
    iconUrl: "https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon.png",
    shadowUrl: "https://unpkg.com/leaflet@1.7.1/dist/images/marker-shadow.png",
  });
};

const ZONES = [
  { id: "zone-bandra", name: "Bandra West", coords: [19.0596, 72.8295] },
  { id: "zone-andheri", name: "Andheri West", coords: [19.1363, 72.8277] },
  { id: "zone-powai", name: "Powai", coords: [19.1176, 72.9060] },
  { id: "zone-dharavi", name: "Dharavi-Sion", coords: [19.0402, 72.8596] },
  { id: "zone-dadar", name: "Dadar", coords: [19.0178, 72.8478] }
];

export default function MapContent({ recentClaims = [] }: { recentClaims?: any[] }) {
  useEffect(() => {
    fixLeafletIcons();
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
        attribution='&copy; CARTO'
        url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
      />
      
      {ZONES.map((zone) => (
        <div key={zone.id}>
          <Marker position={zone.coords as [number, number]}>
            <Popup>
              <div className="p-2">
                 <p className="text-[var(--color-accent)] font-black uppercase text-[10px] tracking-widest">{zone.name}</p>
                 <p className="text-[var(--color-accent)]/40 text-[9px] font-bold uppercase mt-1">Status: Active</p>
              </div>
            </Popup>
          </Marker>
          <CircleMarker
            center={zone.coords as [number, number]}
            radius={35}
            pathOptions={{
              color: '#1B4332',
              fillColor: '#1B4332',
              fillOpacity: 0.05,
              weight: 1,
              dashArray: '5, 10'
            }}
          />
        </div>
      ))}

      {recentClaims.slice(0, 15).map((c, i) => {
        const zone = ZONES.find((z) => z.id === (c.zone_id || 'zone-bandra')) || ZONES[0];
        const jitterLat = zone.coords[0] + (Math.random() - 0.5) * 0.03;
        const isCoastal = ['zone-bandra', 'zone-dadar', 'zone-andheri'].includes(zone.id);
        const lngJitter = isCoastal ? (Math.random() * 0.025) : ((Math.random() - 0.5) * 0.03);
        const jitterLng = zone.coords[1] + lngJitter;
        const isFraud = c.as_score < 45 || c.status === 'manual_review';
        
        return (
          <CircleMarker
            key={`claim-${c.id}-${i}`}
            center={[jitterLat, jitterLng]}
            radius={isFraud ? 10 : 7}
            pathOptions={{
              color: isFraud ? '#F87171' : '#1B4332',
              fillColor: isFraud ? '#F87171' : '#1B4332',
              fillOpacity: 0.8,
              weight: 3
            }}
          >
            <Popup>
              <div className="p-3 text-center">
                <p className="text-[10px] font-black text-[var(--color-accent)]/40 uppercase mb-1">#{c.id?.substring(0,6).toUpperCase()}</p>
                <p className="text-xl font-black text-[var(--color-accent)] tracking-tighter">₹{(c.payout_amount_rs || 0).toLocaleString()}</p>
                <div className="mt-3 flex items-center justify-center gap-2">
                    <div className={`w-2 h-2 rounded-full ${isFraud ? 'bg-red-500' : 'bg-white/10'}`}></div>
                    <span className="text-[10px] font-black uppercase tracking-widest text-[var(--color-accent)]">{isFraud ? 'Alert' : 'Settled'}</span>
                </div>
              </div>
            </Popup>
          </CircleMarker>
        );
      })}
    </MapContainer>
  );
}
