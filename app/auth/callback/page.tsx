// app/auth/callback/page.tsx
'use client'
export const dynamic = 'force-dynamic'

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
      // завершаем magic-link flow
      const { error } = await sb.auth.exchangeCodeForSession({})
      if (error) {
        console.error('Auth error:', error)
        return router.replace(`/signin?returnTo=${encodeURIComponent(params.get('returnTo') || '/')}`)
      }
      // после входа — редирект на returnTo или в корень
      const to = params.get('returnTo') || '/'
      router.replace(to)
    }
    handleAuth()
  }, [params, router])

  return (
    <div className="p-8 text-center text-white bg-gray-900 min-h-[50vh] flex items-center justify-center">
      <p>Авторизуем…</p>
    </div>
  )
}
