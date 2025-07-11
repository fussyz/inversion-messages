// File: app/auth/callback/CallbackClient.tsx

'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '../../lib/supabase-server'

export default function CallbackClient({ returnTo }: { returnTo: string }) {
  const router = useRouter()

  useEffect(() => {
    // 1. Получаем всё после «#» и превращаем в объект
    const hash   = window.location.hash.slice(1)
    const params = Object.fromEntries(new URLSearchParams(hash))

    // 2. Если есть токены — сохраняем сессию
    if (params.access_token && params.refresh_token) {
      supabase.auth
        .setSession({
          access_token : params.access_token as string,
          refresh_token: params.refresh_token as string,
        })
        .then(async ({ data, error }) => {
          console.log('setSession result →', { data, error })

          // 3. Сохраняем e-mail в таблицу subscribers
          if (data?.user?.email) {
            await supabase
              .from('subscribers')
              .upsert({ email: data.user.email })
          }

          // 4. Небольшая пауза для надёжности
          await new Promise(r => setTimeout(r, 400))

          // 5. Редиректим на исходную страницу
          router.replace(returnTo)
        })
    } else {
      // Если токенов нет — кидаем обратно на вход
      router.replace('/signin?error=missing_token')
    }
  }, [router, returnTo])

  return (
    <main className="flex min-h-screen items-center justify-center bg-black text-white">
      Авторизуем…
    </main>
  )
}
