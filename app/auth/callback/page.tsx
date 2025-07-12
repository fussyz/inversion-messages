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
    const run = async () => {
      const { error } = await sb.auth.exchangeCodeForSession({})
      if (error) {
        console.error(error)
        return router.replace(
          `/signin?returnTo=${encodeURIComponent(params.get('returnTo') || '/')}`
        )
      }
      router.replace(params.get('returnTo') || '/')
    }
    run()
  }, [params, router])

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-900 text-white">
      <p>Авторизуем…</p>
    </div>
  )
}
