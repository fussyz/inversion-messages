'use client'

import { useState } from 'react'
import { createClient } from '@supabase/supabase-js'
import { nanoid } from 'nanoid'
import { QRCodeCanvas as QRCode } from 'qrcode.react'

const sb = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_KEY!
)

export default function Admin() {
  const [file, setFile]         = useState<File>()
  const [autoDel, setAutoDel]   = useState(true)   // удалить сразу
  const [forever, setForever]   = useState(false)  // хранить вечно
  const [days, setDays]         = useState(7)      // если не forever
  const [busy, setBusy]         = useState(false)
  const [err, setErr]           = useState<string|null>(null)
  const [fullURL, setFullURL]   = useState('')

  async function handle(e: React.FormEvent) {
    e.preventDefault()
    setErr(null)
    if (!file) { setErr('Выберите файл'); return }

    setBusy(true)

    const id   = nanoid(8)
    const ext  = (file.name.split('.').pop() || 'jpg')
    const path = `msg-${id}.${ext}`

    /* upload */
    const up = await sb.storage.from('images').upload(path, file, { upsert:true })
    if (up.error) { setErr(up.error.message); setBusy(false); return }

    /* подписанный URL (30 дней) */
    const { data:signed, error:signErr } =
      await sb.storage.from('images').createSignedUrl(path, 60*60*24*30)
    if (signErr) { setErr(signErr.message); setBusy(false); return }

    /* days_to_live */
    const days_to_live =
      autoDel ? null : (forever ? null : days > 0 ? days : null)

    /* insert row */
    const ins = await sb.from('messages').insert({
      id,
      image_url   : signed!.signedUrl,
      auto_delete : autoDel,
      days_to_live,
      expire_at   : null
    })
    if (ins.error) { setErr(ins.error.message); setBusy(false); return }

    setFullURL(`${window.location.origin}/message/${id}`)
    setBusy(false)
  }

  return (
    <main style={{background:'#000',color:'#fff',minHeight:'100vh',padding:'2rem'}}>
      <h1 style={{fontSize:'1.8rem',marginBottom:'1rem'}}>🛠 Upload message</h1>

      <form onSubmit={handle} style={{display:'flex',flexDirection:'column',gap:'1rem',maxWidth:'22rem'}}>
        <input type="file" accept="image/*" onChange={e => setFile(e.target.files?.[0])} />

        <label>
          <input type="checkbox" checked={autoDel} onChange={()=>setAutoDel(!autoDel)}/>
          &nbsp;Удалить после первого просмотра
        </label>

        {!autoDel && (
          <>
            <label>
              <input type="checkbox" checked={forever} onChange={()=>setForever(!forever)}/>
              &nbsp;Хранить вечно
            </label>

            {!forever && (
              <label>
                Сколько&nbsp;дней хранить:&nbsp;
                <input type="number" min="1" value={days}
                       onChange={e=>setDays(Number(e.target.value||1))}
                       style={{width:'5rem'}} />
              </label>
            )}
          </>
        )}

        <button type="submit" disabled={busy}
                style={{padding:'0.5rem 1rem',border:'1px solid #fff',cursor:'pointer'}}>
          {busy ? 'Uploading…' : 'Upload'}
        </button>
      </form>

      {err && <p style={{color:'red'}}>⚠️ {err}</p>}

      {fullURL && (
        <div style={{marginTop:'2rem'}}>
          <p><a href={fullURL} style={{color:'#0af'}} target="_blank">{fullURL}</a></p>
          <QRCode value={fullURL} size={180} bgColor="#000" fgColor="#fff"/>
        </div>
      )}
    </main>
  )
}
