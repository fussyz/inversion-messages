// app/auth/callback/page.tsx
'use client'

import { useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@supabase/supabase-js'

const sb = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_KEY!
)

export default function AuthCallback() {
  const params = useSearchParams()
  const router = useRouter()

  useEffect(() => {
    const run = async () => {
      // подцепляем сессию из URL (magic link)
      const { data, error } = await sb.auth.exchangeCodeForSession({
        // Supabase автоматически разбирает window.location.href
      })
      if (error) {
        console.error(error)
        return router.push(`/signin?returnTo=${params.get('returnTo')}`)
      }
      // после успешного входа редиректим на returnTo
      const to = params.get('returnTo') ?? '/'
      router.replace(to)
    }
    run()
  }, [params, router])

  return <p className="p-8">Авторизуем…</p>
}
