// app/auth/callback/page.tsx
'use client'

import { useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@supabase/supabase-js'

const sb = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_KEY!
)

export default function AuthCallbackPage() {
  const params = useSearchParams()
  const router = useRouter()

  useEffect(() => {
    const handleAuth = async () => {
      // завершаем magic link flow
      const { data, error } = await sb.auth.exchangeCodeForSession({
        // Supabase сам разберёт код из URL
      })
      if (error) {
        console.error('Auth error:', error)
        // если не удалось — вернёмся на вход
        return router.replace(`/signin?returnTo=${params.get('returnTo') || '/'}`)
      }
      // а после успешной аутентификации — редирект туда, откуда шли
      const to = params.get('returnTo') || '/'
      router.replace(to)
    }

    handleAuth()
  }, [params, router])

  return (
    <div className="p-8 text-center">
      <p>Авторизуем…</p>
    </div>
  )
}
