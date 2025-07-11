'use client'
export const dynamic = 'force-dynamic'   // ⬅️ не даём Next.js SSG-рендерить

import { useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { supabase } from '../../lib/supabase-server' // путь: app/lib/…

export default function Callback() {
  const router     = useRouter()
  const search     = useSearchParams()
  const returnTo   = search.get('returnTo') || '/admin'

  useEffect(() => {
    // ------------------------------------------------------------
    // Supabase кладёт токены в URL-фрагмент “#access_token=…”
    // Берём всё после # и превращаем в объект param-key → value
    // ------------------------------------------------------------
    const hash   = window.location.hash.slice(1)          // access_token=x&…
    const params = Object.fromEntries(new URLSearchParams(hash))

    if (params.access_token && params.refresh_token) {
      // сохраняем сессию
      supabase.auth
        .setSession({
          access_token : params.access_token as string,
          refresh_token: params.refresh_token as string,
        })
        .then(async ({ data }) => {
          // сохраняем e-mail в subscribers (если нужно)
          if (data?.user?.email) {
            await supabase
              .from('subscribers')
              .upsert({ email: data.user.email })
          }
          // уводим на исходную страницу
          router.replace(returnTo)
        })
    } else {
      router.replace('/signin?error=missing_token')
    }
  }, [router, returnTo])

  return (
    <main className="flex min-h-screen items-center justify-center
                     bg-black text-white">
      Авторизуем…
    </main>
  )
}
