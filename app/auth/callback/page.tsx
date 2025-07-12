// app/auth/callback/page.tsx

'use client'
export const dynamic = 'force-dynamic'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_KEY!
)

export default function AuthCallbackPage() {
  const router = useRouter()

  useEffect(() => {
    // Парсим параметры из адресной строки
    const params = new URLSearchParams(window.location.search)
    const token = params.get('token')
    const type  = params.get('type')
    const returnTo = params.get('returnTo') || '/signin'

    if (token && type) {
      supabase.auth
        .verifyOtp({ token, type })
        .then(({ error }) => {
          if (error) {
            console.error('Auth error', error)
            router.replace('/signin')
          } else {
            router.replace(returnTo)
          }
        })
    } else {
      router.replace('/signin')
    }
  }, [router])

  return (
    <main className="flex items-center justify-center min-h-screen bg-gray-900 text-white">
      <p>Авторизуемся…</p>
    </main>
  )
}
