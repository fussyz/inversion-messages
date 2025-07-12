// File: app/admin/AdminPageClient.tsx
'use client'

import '../lib/leaflet'
import dynamic from 'next/dynamic'
import { useEffect, useState } from 'react'
import { createClient } from '@supabase/supabase-js'
import { nanoid } from 'nanoid'

const MapContainer = dynamic(
  () => import('react-leaflet').then(m => m.MapContainer),
  { ssr: false }
)
const TileLayer = dynamic(
  () => import('react-leaflet').then(m => m.TileLayer),
  { ssr: false }
)
const Marker = dynamic(
  () => import('react-leaflet').then(m => m.Marker),
  { ssr: false }
)

const sb = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_KEY!
)

type MessageRow = {
  id: string
  image_url: string
  views: number
  last_read_at: string | null
  client_ip: string | null
}

export default function AdminPageClient() {
  const [rows, setRows]     = useState<MessageRow[]>([])
  const [file, setFile]     = useState<File | null>(null)
  const [days, setDays]     = useState<number>(0)
  const [loading, setLoading] = useState(false)

  // подтягиваем статистику
  const fetchRows = () => {
    sb
      .from<MessageRow>('messages')
      .select('id, image_url, views, last_read_at, client_ip')
      .order('created_at', { ascending: false })
      .then(({ data }) => setRows(data || []))
  }

  useEffect(fetchRows, [])

  // загрузка картинки + вычисление expire_at
  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!file) return alert('Выберите файл!')

    setLoading(true)
    try {
      const id = nanoid()
      const path = `images/${id}-${file.name}`

      // 1) закачка в Storage
      await sb.storage.from('images').upload(path, file, { upsert: true })

      // 2) signed URL на N дней
      const keepSeconds = days > 0 ? days * 24 * 3600 : 60 * 60 * 24 * 365 * 10
      const { data: urlData } = await sb
        .storage
        .from('images')
        .createSignedUrl(path, keepSeconds)

      // 3) готовим expire_at
      const expire_at = days > 0
        ? new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString()
        : null

      // 4) вставляем запись
      await sb.from('messages').insert({
        id,
        image_url: urlData!.signedUrl,
        auto_delete: days > 0,
        expire_at,
      })

      // сбрасываем форму и обновляем
      setFile(null)
      setDays(0)
      fetchRows()

    } catch (err: any) {
      console.error(err)
      alert('Ошибка загрузки: ' + err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="p-8 bg-gray-900 min-h-screen text-white space-y-8">
      {/* === Upload Form === */}
      <section>
        <h2 className="text-2xl mb-3">🎛 Upload Message</h2>
        <form onSubmit={handleUpload} className="flex items-center space-x-4">
          <input
            type="file"
            accept="image/*"
            onChange={e => setFile(e.target.files?.[0] || null)}
            className="text-black"
          />
          <input
            type="number"
            min={0}
            value={days}
            onChange={e => setDays(+e.target.value)}
            placeholder="Сколько дней хранить (0 = навсегда)"
            className="w-36 p-1 text-black"
          />
          <button
            type="submit"
            disabled={loading}
            className="px-4 py-2 bg-blue-600 rounded hover:bg-blue-500 disabled:opacity-50"
          >
            {loading ? 'Uploading…' : 'Upload'}
          </button>
        </form>
      </section>

      {/* === Statistics Table === */}
      <section>
        <h2 className="text-2xl mb-3">📊 Statistics</h2>
        <table className="w-full table-auto border-collapse">
          <thead>
            <tr className="border-b border-gray-700">
              <th className="px-3 py-2">ID</th>
              <th className="px-3 py-2">Image</th>
              <th className="px-3 py-2">Views</th>
              <th className="px-3 py-2">Last Read</th>
              <th className="px-3 py-2">IP</th>
              <th className="px-3 py-2">Location</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(row => (
              <tr key={row.id} className="border-t border-gray-700">
                <td className="px-3 py-2 break-all">{row.id}</td>
                <td className="px-3 py-2">
                  <img
                    src={row.image_url}
                    alt=""
                    className="h-12 w-12 object-cover rounded"
                  />
                </td>
                <td className="px-3 py-2">{row.views}</td>
                <td className="px-3 py-2">
                  {row.last_read_at
                    ? new Date(row.last_read_at).toLocaleString()
                    : '—'}
                </td>
                <td className="px-3 py-2">{row.client_ip || '—'}</td>
                <td className="px-3 py-2">
                  {row.client_ip ? (
                    <MapContainer
                      center={[0, 0]}
                      zoom={2}
                      style={{ height: 120, width: 160 }}
                      whenCreated={map => {
                        fetch(`https://ipapi.co/${row.client_ip}/json/`)
                          .then(r => r.json())
                          .then(data => {
                            if (data.latitude && data.longitude) {
                              map.setView([data.latitude, data.longitude], 4)
                              new Marker([data.latitude, data.longitude]).addTo(map)
                            }
                          })
                      }}
                    >
                      <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                    </MapContainer>
                  ) : '—'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </main>
  )
}
