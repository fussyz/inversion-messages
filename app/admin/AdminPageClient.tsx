// app/admin/AdminPageClient.tsx
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
  created_at: string
}

export default function AdminPageClient() {
  const [rows, setRows]           = useState<MessageRow[]>([])
  const [file, setFile]           = useState<File|null>(null)
  const [days, setDays]           = useState(0)
  const [deleteOnRead, setDelete] = useState(false)
  const [loading, setLoading]     = useState(false)
  const [sortAsc, setSortAsc]     = useState(false)

  // модалка QR
  const [modalOpen, setModalOpen] = useState(false)
  const [modalLink, setModalLink] = useState('')
  const qrRef = useRef<SVGSVGElement>(null)

  // загрузка данных
  const fetchRows = () => {
    sb
      .from<MessageRow>('messages')
      .select('id, image_url, views, last_read_at, client_ip, created_at')
      .then(({ data }) => setRows(data || []))
  }
  useEffect(fetchRows, [])

  // загрузка новой картинки
  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!file) return alert('Выберите файл!')

    setLoading(true)
    try {
      const id = nanoid()
      const path = `images/${id}-${file.name}`

      await sb.storage.from('images').upload(path, file, { upsert: true })

      const ttl = deleteOnRead
        ? 60*60*24*365*10
        : days > 0
          ? days*24*3600
          : 60*60*24*365*10

      const { data, error: urlError } = await sb
        .storage
        .from('images')
        .createSignedUrl(path, ttl)

      if (urlError) throw urlError
      if (!data?.signedUrl) {
        throw new Error('Не удалось получить signedUrl для файла')
      }

      const auto_delete = deleteOnRead || days > 0
      const expire_at   = days > 0
        ? new Date(Date.now() + days*86400000).toISOString()
        : null

      await sb.from('messages').insert({
        id,
        image_url: data.signedUrl,
        auto_delete,
        expire_at,
      })

      const link = `${window.location.origin}/message/${id}`
      setModalLink(link)
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

  // ручное удаление
  const handleDelete = async (id: string, imageUrl: string) => {
    if (!confirm('Точно удалить это сообщение и картинку?')) return

    // извлечь путь из signed URL
    const m = imageUrl.match(/\/object\/sign\/(.+?)\?/)
    const path = m ? decodeURIComponent(m[1]) : null
    if (path) {
      const { error: stErr } = await sb.storage.from('images').remove([path])
      if (stErr) console.error('Storage remove error:', stErr)
    }

    const { error: dbErr } = await sb.from('messages').delete().eq('id', id)
    if (dbErr) console.error('DB delete error:', dbErr)

    fetchRows()
  }

  // скачивание QR
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

  // локальная сортировка по дате создания
  const sortedRows = [...rows].sort((a,b) => {
    const ta = new Date(a.created_at).getTime()
    const tb = new Date(b.created_at).getTime()
    return sortAsc ? ta - tb : tb - ta
  })

  return (
    <main className="p-8 bg-gray-900 min-h-screen text-white space-y-8">

      {/* загрузка */}
      <section>
        <h2 className="text-2xl mb-3">🎛 Upload Message</h2>
        <form onSubmit={handleUpload} className="flex flex-wrap items-center gap-4">
          <input
            type="file"
            accept="image/*"
            onChange={e=>setFile(e.target.files?.[0]||null)}
            className="text-black"
          />

          <label className="flex items-center space-x-2">
            <input
              type="checkbox"
              checked={deleteOnRead}
              onChange={e=>setDelete(e.target.checked)}
              className="w-4 h-4"
            />
            <span>Удалять после прочтения</span>
          </label>

          {!deleteOnRead && (
            <input
              type="number"
              min={0}
              value={days}
              onChange={e=>setDays(+e.target.value)}
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

      {/* таблица */}
      <section>
        <h2 className="text-2xl mb-3">📊 Messages</h2>
        <table className="w-full table-auto border-collapse text-sm">
          <thead>
            <tr className="border-b border-gray-700">
              {['ID','Preview','QR','Views','Last Read','Created','IP','Location',''].map(h=>(
                <th
                  key={h}
                  className="px-2 py-1 text-left cursor-pointer select-none"
                  onClick={()=>h==='Created'&&setSortAsc(prev=>!prev)}
                >
                  {h}{h==='Created'&&<span className="ml-1">{sortAsc?'↑':'↓'}</span>}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {sortedRows.map(r=>{
              const link = `${window.location.origin}/message/${r.id}`
              return (
                <tr key={r.id} className="border-t border-gray-700">
                  {/* ID как ссылка */}
                  <td className="px-2 py-1">
                    <a
                      href={link}
                      target="_blank"
                      rel="noreferrer"
                      className="underline hover:text-blue-400"
                    >
                      {r.id}
                    </a>
                  </td>

                  {/* превью */}
                  <td className="px-2 py-1">
                    <img
                      src={r.image_url}
                      alt=""
                      className="h-12 w-12 object-cover rounded"
                    />
                  </td>

                  {/* QR */}
                  <td
                    className="px-2 py-1 cursor-pointer"
                    onClick={()=>{ setModalLink(link); setModalOpen(true) }}
                  >
                    <QRCode value={link} size={48} />
                  </td>

                  <td className="px-2 py-1">{r.views}</td>
                  <td className="px-2 py-1">
                    {r.last_read_at
                      ? new Date(r.last_read_at).toLocaleString()
                      : '—'}
                  </td>
                  <td className="px-2 py-1">
                    {new Date(r.created_at).toLocaleString()}
                  </td>
                  <td className="px-2 py-1">{r.client_ip||'—'}</td>
                  <td className="px-2 py-1">
                    {r.client_ip ? (
                      <MapContainer
                        center={[0,0]}
                        zoom={2}
                        style={{height:80,width:120}}
                        whenCreated={map=>{
                          fetch(`https://ipapi.co/${r.client_ip}/json/`)
                            .then(res=>res.json())
                            .then(d=>{
                              if(d.latitude&&d.longitude){
                                map.setView([d.latitude,d.longitude],4)
                                new Marker([d.latitude,d.longitude]).addTo(map)
                              }
                            })
                        }}
                      >
                        <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                      </MapContainer>
                    ) : '—'}
                  </td>

                  {/* корзина */}
                  <td className="px-2 py-1">
                    <button
                      onClick={()=>handleDelete(r.id, r.image_url)}
                      className="text-red-500 hover:text-red-700"
                      title="Удалить"
                    >
                      🗑️
                    </button>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </section>

      {/* модалка */}
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
                {modalLink}
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
                onClick={()=>setModalOpen(false)}
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
