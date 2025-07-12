'use client'

import '../lib/leaflet'
import dynamic from 'next/dynamic'
import { useEffect, useRef, useState } from 'react'
import { createClient } from '@supabase/supabase-js'
import { nanoid } from 'nanoid'
import QRCode from 'react-qr-code'

const sb = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_KEY!
)

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

type MessageRow = {
  id: string
  image_url: string
  views: number
  last_read_at: string | null
  client_ip: string | null
}

export default function AdminPageClient() {
  const [rows, setRows]           = useState<MessageRow[]>([])
  const [file, setFile]           = useState<File | null>(null)
  const [days, setDays]           = useState(0)
  const [deleteOnRead, setDelete] = useState(false)
  const [loading, setLoading]     = useState(false)

  // для модалки
  const [modalOpen, setModalOpen] = useState(false)
  const [modalLink, setModalLink] = useState('')
  const qrRef = useRef<SVGSVGElement>(null)

  const fetchRows = () => {
    sb.from<MessageRow>('messages')
      .select('id, image_url, views, last_read_at, client_ip')
      .order('created_at', { ascending: false })
      .then(({ data }) => setRows(data || []))
  }
  useEffect(fetchRows, [])

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!file) return alert('Выберите файл!')

    setLoading(true)
    try {
      const id = nanoid()
      const path = `images/${id}-${file.name}`

      await sb.storage.from('images').upload(path, file, { upsert: true })

      const keepSeconds = deleteOnRead
        ? 60 * 60 * 24 * 365 * 10
        : days > 0
          ? days * 24 * 3600
          : 60 * 60 * 24 * 365 * 10

      const { data: urlData } = await sb
        .storage
        .from('images')
        .createSignedUrl(path, keepSeconds)

      const auto_delete = deleteOnRead || days > 0
      const expire_at   = days > 0
        ? new Date(Date.now() + days * 86400000).toISOString()
        : null

      await sb.from('messages').insert({
        id,
        image_url: urlData!.signedUrl,
        auto_delete,
        expire_at,
      })

      // подготовим модалку
      const msgLink = `${window.location.origin}/message/${id}`
      setModalLink(msgLink)
      setModalOpen(true)

      setFile(null)
      setDays(0)
      setDelete(false)
      fetchRows()

    } catch (err: any) {
      console.error(err)
      alert('Ошибка: ' + err.message)
    } finally {
      setLoading(false)
    }
  }

  const downloadQR = () => {
    if (!qrRef.current) return
    const svg = qrRef.current.outerHTML
    const blob = new Blob([svg], { type: 'image/svg+xml' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'qr-code.svg'
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <main className="p-8 bg-gray-900 min-h-screen text-white space-y-8">
      {/* ==== Форма ==== */}
      <section>
        <h2 className="text-2xl mb-3">🎛 Upload Message</h2>
        <form onSubmit={handleUpload} className="flex flex-wrap items-center gap-4">
          <input
            type="file"
            accept="image/*"
            onChange={e => setFile(e.target.files?.[0] || null)}
            className="text-black"
          />

          <label className="flex items-center space-x-2 text-white">
            <input
              type="checkbox"
              checked={deleteOnRead}
              onChange={e => setDelete(e.target.checked)}
              className="w-4 h-4"
            />
            <span>Удалять после прочтения</span>
          </label>

          {!deleteOnRead && (
            <input
              type="number"
              min={0}
              value={days}
              onChange={e => setDays(+e.target.value)}
              placeholder="Дней хранить (0 = навсегда)"
              className="w-48 p-1 text-black"
            />
          )}

          <button
            type="submit"
            disabled={loading}
            className="px-4 py-2 bg-blue-600 rounded hover:bg-blue-500 disabled:opacity-50"
          >
            {loading ? 'Uploading…' : 'Upload'}
          </button>
        </form>
      </section>

      {/* ==== Таблица ==== */}
      <section>
        <h2 className="text-2xl mb-3">📊 Messages</h2>
        <table className="w-full table-auto border-collapse text-sm">
          <thead>
            <tr className="border-b border-gray-700">
              {['ID','Preview','Link','QR','Views','Last Read','IP','Location'].map(h => (
                <th key={h} className="px-2 py-1 text-left">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map(row => {
              const shortLink = row.image_url.split('?')[0]
              const displayLink =
                shortLink.length > 30
                  ? shortLink.slice(0, 30) + '…'
                  : shortLink
              const msgLink = `${window.location.origin}/message/${row.id}`

              return (
                <tr key={row.id} className="border-t border-gray-700">
                  <td className="px-2 py-1 break-all">{row.id}</td>

                  {/* Превью картинки */}
                  <td className="px-2 py-1">
                    <img
                      src={row.image_url}
                      alt=""
                      className="h-12 w-12 object-cover rounded"
                    />
                  </td>

                  {/* короткий кликабельный линк */}
                  <td className="px-2 py-1">
                    <a
                      href={row.image_url}
                      target="_blank"
                      rel="noreferrer"
                      className="underline hover:text-blue-400"
                    >
                      {displayLink}
                    </a>
                  </td>

                  {/* QR в ячейке */}
                  <td className="px-2 py-1">
                    <QRCode value={msgLink} size={48} />
                  </td>

                  <td className="px-2 py-1">{row.views}</td>
                  <td className="px-2 py-1">
                    {row.last_read_at
                      ? new Date(row.last_read_at).toLocaleString()
                      : '—'}
                  </td>
                  <td className="px-2 py-1">{row.client_ip || '—'}</td>
                  <td className="px-2 py-1">
                    {row.client_ip ? (
                      <MapContainer
                        center={[0,0]}
                        zoom={2}
                        style={{ height: 80, width: 120 }}
                        whenCreated={map => {
                          fetch(`https://ipapi.co/${row.client_ip}/json/`)
                            .then(r => r.json())
                            .then(data => {
                              if (data.latitude && data.longitude) {
                                map.setView([data.latitude,data.longitude], 4)
                                new Marker([data.latitude,data.longitude]).addTo(map)
                              }
                            })
                        }}
                      >
                        <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                      </MapContainer>
                    ) : '—'}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </section>

      {/* ==== Модалка ==== */}
      {modalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-80 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg w-80 text-center space-y-4">
            <h3 className="text-xl font-bold">Готово!</h3>
            <div ref={qrRef} className="inline-block bg-white p-2">
              <QRCode value={modalLink} size={128} />
            </div>
            <p className="break-words text-sm">
              <a
                href={modalLink}
                target="_blank"
                rel="noreferrer"
                className="underline text-blue-600"
              >
                {modalLink.slice(0, 40)}…
              </a>
            </p>
            <div className="flex justify-center gap-4 mt-2">
              <button
                onClick={downloadQR}
                className="px-4 py-2 bg-green-600 rounded hover:bg-green-500 text-white"
              >
                Скачать QR
              </button>
              <button
                onClick={() => setModalOpen(false)}
                className="px-4 py-2 bg-gray-400 rounded hover:bg-gray-300"
              >
                Закрыть
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  )
}
