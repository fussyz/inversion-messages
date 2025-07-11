'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@supabase/supabase-js'

const sb = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_KEY!
)

export default function CallbackClient({ returnTo }: { returnTo: string }) {
  const router = useRouter()

  useEffect(() => {
    const hash   = window.location.hash.slice(1)                 // access_token=...
    const params = Object.fromEntries(new URLSearchParams(hash))

    if (params.access_token && params.refresh_token) {
      sb.auth
        .setSession({
          access_token : params.access_token as string,
          refresh_token: params.refresh_token as string,
        })
        .then(async ({ data }) => {
          if (data?.user?.email) {
            await sb.from('subscribers').upsert({ email: data.user.email })
          }
          router.replace(returnTo)
        })
    } else {
      router.replace('/signin?error=missing_token')
    }
  }, [router, returnTo])

  return (
    <main className="flex min-h-screen items-center justify-center bg-black text-white">
      Авторизуем…
    </main>
  )
}
