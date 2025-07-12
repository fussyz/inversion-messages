'use client';

// настраиваем пути к marker-icon.png из app/lib/leaflet.ts
import '../lib/leaflet';

import { useEffect, useRef } from 'react';
import dynamic from 'next/dynamic';

const MapContainer = dynamic(
  () => import('react-leaflet').then(m => m.MapContainer),
  { ssr: false }
);
const TileLayer = dynamic(
  () => import('react-leaflet').then(m => m.TileLayer),
  { ssr: false }
);
const Marker = dynamic(
  () => import('react-leaflet').then(m => m.Marker),
  { ssr: false }
);

export function AdminMap({ ip }: { ip: string }) {
  const ref = useRef<any>(null);

  useEffect(() => {
    if (!ref.current) return;
    fetch(`https://ipapi.co/${ip}/json/`)
      .then(r => r.json())
      .then(data => {
        if (data.latitude && data.longitude) {
          ref.current.setView([data.latitude, data.longitude], 4);
          new L.Marker([data.latitude, data.longitude]).addTo(ref.current);
        }
      });
  }, [ip]);

  return (
    <MapContainer
      whenCreated={map => (ref.current = map)}
      center={[0, 0]}
      zoom={2}
      style={{ height: 100, width: 150 }}
    >
      <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
    </MapContainer>
  );
}
