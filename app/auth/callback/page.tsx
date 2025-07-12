// app/auth/callback/page.tsx
'use client'

import { useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_KEY!
)

export default function AuthCallbackPage() {
  const router = useRouter()
  const params = useSearchParams()

  useEffect(() => {
    const token = params.get('token')
    const type  = params.get('type')
    const returnTo = params.get('returnTo') || '/signin'

    if (token && type) {
      supabase.auth.verifyOtp({ token, type })
        .then(({ error }) => {
          if (error) router.replace('/signin')
          else     router.replace(returnTo)
        })
    } else {
      router.replace('/signin')
    }
  }, [params, router])

  return <p className="p-8 text-center">Авторизуемся…</p>
}
