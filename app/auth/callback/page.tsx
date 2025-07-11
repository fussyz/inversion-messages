'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@supabase/supabase-js'
import { useRouter } from 'next/navigation'

/* ─────────────  Supabase client  ─────────────
   • В dev-режиме (http://localhost) ставим куки без флага Secure,
     чтобы браузер отправлял их на backend.
   • В production (https) флаг Secure включается автоматически. */
const sb = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_KEY!,
  {
    auth: {
      cookieOptions: { secure: process.env.NODE_ENV === 'production' }
    }
  }
)

export default function Callback() {
  const router = useRouter()
  const [msg, setMsg] = useState('⏳ Авторизация…')

  useEffect(() => {
    (async () => {
      const url = new URL(window.location.href)
      const qp  = url.searchParams

      /* ───── Вариант A  (PKCE-code в query) ───── */
      if (qp.get('code') && qp.get('type') === 'magiclink') {
        const { data, error } = await sb.auth.exchangeCodeForSession()
        if (error) { setMsg('Ошибка: ' + error.message); return }

        await sb.auth.setSession({
          access_token:  data.session!.access_token,
          refresh_token: data.session!.refresh_token
        })
        router.replace('/admin'); return
      }

      /* ───── Вариант B  (6-значный или длинный token) ───── */
      if (qp.get('token')) {
        const token = qp.get('token')!
        const email = qp.get('email')!
        const isOtp = /^\d{6}$/.test(token)

        const { data, error } = await sb.auth.verifyOtp({
          email,
          token,
          type: isOtp ? 'email' : 'magiclink'
        })
        if (error) { setMsg('Ошибка: ' + error.message); return }

        await sb.auth.setSession({
          access_token:  data.session!.access_token,
          refresh_token: data.session!.refresh_token
        })
        router.replace('/admin'); return
      }

      setMsg('Ошибка авторизации: параметры не найдены')
    })()
  }, [router])

  return (
    <main style={{
      background: '#000', color: '#fff', minHeight: '100vh',
      display: 'flex', justifyContent: 'center', alignItems: 'center',
      fontSize: '1.1rem'
    }}>
      {msg}
    </main>
  )
}
