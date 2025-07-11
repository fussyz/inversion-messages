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
    // 1) читаем хэш-параметры
    const hash   = window.location.hash.slice(1)          // access_token=…&refresh_token=…
    const params = Object.fromEntries(new URLSearchParams(hash))

    if (params.access_token && params.refresh_token) {
      sb.auth
        .setSession({
          access_token : params.access_token as string,
          refresh_token: params.refresh_token as string,
        })
        .then(async ({ data, error }) => {
          console.log('setSession →', { data, error })

          // 2) вручную ставим куки для middleware
          //    без domain кука привязана к текущему хосту
          document.cookie = `sb-access-token=${params.access_token}; path=/; secure; samesite=None`
          document.cookie = `sb-refresh-token=${params.refresh_token}; path=/; secure; samesite=None`

          // 3) (опционально) сохраняем e-mail
          if (data?.user?.email) {
            await sb.from('subscribers').upsert({ email: data.user.email })
          }

          // 4) небольшая задержка, чтобы кука успела заплюсоваться
          await new Promise(r => setTimeout(r, 200))

          // 5) уходим на returnTo
          router.replace(returnTo)
        })
    } else {
      router.replace('/signin?error=missing_token')
    }
  }, [router, returnTo])

  return (
    <main className="flex min-h-screen items-center justify-center bg-black text-white">
      Авторизую…
    </main>
  )
}
