// app/admin/AdminMap.tsx
'use client'

import { useEffect, useRef } from 'react'
import dynamic from 'next/dynamic'
import L from '../lib/leaflet'  // поправьте, если leaflet.ts лежит в другом месте

const MapContainer = dynamic(
  () => import('react-leaflet').then(m => m.MapContainer),
  { ssr: false }
)
const TileLayer = dynamic(
  () => import('react-leaflet').then(m => m.TileLayer),
  { ssr: false }
)

export function AdminMap({ ip }: { ip: string }) {
  const mapRef = useRef<any>(null)

  useEffect(() => {
    if (!mapRef.current) return
    fetch(`https://ipapi.co/${ip}/json/`)
      .then(r => r.json())
      .then(data => {
        if (data.latitude && data.longitude) {
          mapRef.current.setView([data.latitude, data.longitude], 4)
          new L.Marker([data.latitude, data.longitude]).addTo(mapRef.current)
        }
      })
  }, [ip])

  return (
    <MapContainer
      whenCreated={map => (mapRef.current = map)}
      center={[0, 0]}
      zoom={2}
      style={{ height: 120, width: 160 }}
    >
      <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
    </MapContainer>
  )
}
