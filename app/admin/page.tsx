// File: app/admin/page.tsx

// 1) Настраиваем Leaflet-иконки (путь к marker-icon.png и shadow.png)
import '@/lib/leaflet'

// 2) Динамический импорт React-Leaflet, чтобы обойти SSR
import dynamic from 'next/dynamic'

// 3) Остальные импорты React и Supabase
'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@supabase/supabase-js'

// 4) Динамически подгружаем компоненты карты только в браузере
const MapContainer = dynamic(
  () => import('react-leaflet').then((m) => m.MapContainer),
  { ssr: false }
)
const TileLayer = dynamic(
  () => import('react-leaflet').then((m) => m.TileLayer),
  { ssr: false }
)
const Marker = dynamic(
  () => import('react-leaflet').then((m) => m.Marker),
  { ssr: false }
)

// 5) Тип строки таблицы
type MessageRow = {
  id: string
  image_url: string
  views: number
  last_read_at: string | null
  client_ip: string | null
}

export default function AdminPage() {
  const [rows, setRows] = useState<MessageRow[]>([])

  useEffect(() => {
    const sb = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_KEY!
    )
    sb
      .from<MessageRow>('messages')
      .select('id, image_url, views, last_read_at, client_ip')
      .order('created_at', { ascending: false })
      .then(({ data, error }) => {
        if (error) console.error(error)
        else setRows(data!)
      })
  }, [])

  return (
    <main className="p-8 bg-gray-900 min-h-screen text-white">
      <h1 className="text-2xl mb-4">Admin: Messages</h1>
      <table className="w-full table-auto border-collapse">
        <thead>
          <tr>
            <th className="px-4 py-2">ID</th>
            <th className="px-4 py-2">Image</th>
            <th className="px-4 py-2">Views</th>
            <th className="px-4 py-2">Last Read</th>
            <th className="px-4 py-2">IP</th>
            <th className="px-4 py-2">Location</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.id} className="border-t border-gray-700">
              <td className="px-4 py-2">{row.id}</td>
              <td className="px-4 py-2">
                <img
                  src={row.image_url}
                  alt=""
                  className="h-12 w-12 object-cover rounded"
                />
              </td>
              <td className="px-4 py-2">{row.views}</td>
              <td className="px-4 py-2">
                {row.last_read_at
                  ? new Date(row.last_read_at).toLocaleString()
                  : '—'}
              </td>
              <td className="px-4 py-2">{row.client_ip || '—'}</td>
              <td className="px-4 py-2">
                {row.client_ip ? (
                  <MapContainer
                    center={[0, 0]}
                    zoom={2}
                    style={{ height: 100, width: 150 }}
                    whenCreated={(map) => {
                      fetch(`https://ipapi.co/${row.client_ip}/json/`)
                        .then((r) => r.json())
                        .then((data: any) => {
                          if (data.latitude && data.longitude) {
                            map.setView([data.latitude, data.longitude], 4)
                            new Marker([data.latitude, data.longitude]).addTo(map)
                          }
                        })
                    }}
                  >
                    <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                  </MapContainer>
                ) : (
                  '—'
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </main>
  )
}
