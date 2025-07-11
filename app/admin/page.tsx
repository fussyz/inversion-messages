'use client'

import { useState, useMemo } from 'react'
import { nanoid } from 'nanoid'
import { createClient } from '@supabase/supabase-js'
import { QRCodeCanvas } from 'qrcode.react'

// 1 ─ браузерный Supabase-клиент
const sb = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_KEY!
)

export default function Admin() {
  /* form-state */
  const [file, setFile]   = useState<File | null>(null)
  const [autoDel, setAD]  = useState(false)
  const [forever, setFor] = useState(false)
  const [days, setDays]   = useState(1)

  /* ui-state */
  const [busy, setBusy]   = useState(false)
  const [err,  setErr]    = useState('')
  const [fullURL, setFullURL] = useState('')

  /*  генерируем id один раз на монт */
  const id = useMemo(() => nanoid(10), [])

  /* submit */
  async function handle(e: React.FormEvent) {
    e.preventDefault()
    if (!file) { setErr('Файл не выбран'); return }

    setBusy(true); setErr('')

    /* 1 ─ кладём картинку в bucket images/msg-<id>.jpg */
    const { error: upErr } = await sb
      .storage
      .from('images')
      .upload(`msg-${id}.jpg`, file, { upsert: false })

    if (upErr) { setErr(upErr.message); setBusy(false); return }

    /* 2 ─ получаем signedURL (1 год) */
    const { data: signed, error: signErr } = await sb
      .storage
      .from('images')
      .createSignedUrl(`msg-${id}.jpg`, 60 * 60 * 24 * 365)

    if (signErr) { setErr(signErr.message); setBusy(false); return }

    /* 3 ─ готовим days_to_live */
    const days_to_live = autoDel || forever ? null : days > 0 ? days : null

    /* 4 ─ записываем строку в messages */
    const { error: insErr } = await sb.from('messages').insert({
      id,
      image_url   : signed!.signedUrl,
      auto_delete : autoDel,
      days_to_live,
      expire_at   : null,
    })

    if (insErr) { setErr(insErr.message); setBusy(false); return }

    /* 5 ─ показываем готовую ссылку/QR */
    setFullURL(`${window.location.origin}/message/${id}`)
    setBusy(false)
  }

  return (
    <main className="min-h-screen bg-black text-white py-10 px-6">
      <h1 className="text-xl mb-6">🎛 Upload message</h1>

      <form onSubmit={handle} className="flex flex-col gap-4 max-w-md">
        {/* файл */}
        <input
          type="file"
          accept="image/*"
          onChange={e => setFile(e.target.files?.[0] ?? null)}
          className="text-sm"
        />

        {/* автоудаление */}
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={autoDel}
            onChange={e => setAD(e.target.checked)}
          />
          Удалить сразу после просмотра
        </label>

        {/* срок хранения */}
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={forever}
            onChange={e => setFor(e.target.checked)}
          />
          Хранить вечно
        </label>

        {!forever && !autoDel && (
          <div className="flex items-center gap-2">
            <span>Сколько дней хранить:</span>
            <input
              type="number"
              min={0}
              value={days}
              onChange={e => setDays(+e.target.value)}
              className="w-20 px-2 py-1 bg-gray-100 text-black
                         placeholder-gray-400 focus:outline-none focus:ring"
              placeholder="0 = ∞"
            />
          </div>
        )}

        <button
          disabled={busy}
          className="border px-4 py-2 hover:bg-white hover:text-black disabled:opacity-50"
        >
          {busy ? 'Загружаю…' : 'Загрузить'}
        </button>
      </form>

      {err && <p className="mt-4 text-red-400">{err}</p>}

      {/* QR + ссылка после загрузки */}
      {fullURL && (
        <div className="mt-8 flex flex-col items-center gap-4">
          <QRCodeCanvas value={fullURL} size={200} bgColor="#000" fgColor="#fff" />
          <a href={fullURL} className="underline break-all text-blue-300">{fullURL}</a>
        </div>
      )}
    </main>
  )
}
