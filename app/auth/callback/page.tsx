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
    const params = new URLSearchParams(window.location.search)
    const token    = params.get('token')
    const type     = params.get('type')
    // путь, на который надо перепрыгнуть после логина
    const returnTo = params.get('returnTo') || '/signin'

    if (token && type) {
      // если пришёл токен — ещё не залогинены, вызываем клиентскую верификацию
      supabase.auth
        .verifyOtp({ token, type })
        .then(({ error }) => {
          if (error) {
            console.error('OTP verify error:', error.message)
            router.replace('/signin')
          } else {
            router.replace(returnTo)
          }
        })
    } else {
      // если токена нет — значит Supabase уже верифицировал через HTTP-редирект,
      // просто пересылаем на нужную страницу
      router.replace(returnTo)
    }
  }, [router])

  return (
    <main className="flex items-center justify-center min-h-screen bg-gray-900 text-white">
      <p>Авторизуемся…</p>
    </main>
  )
}
