'use client'
import { useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { createClient } from '@supabase/supabase-js'

const sb = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_KEY!
)

export default function SignInForm() {
  const [email, setEmail] = useState('')
  const [msg,   setMsg]   = useState('')
  const params = useSearchParams()
  const returnTo = params.get('returnTo') || '/admin'

  async function handle(e: React.FormEvent) {
    e.preventDefault()
    setMsg('🔄 Отправляем ссылку…')

    // 1) Собираем полный URL колбэка со всеми параметрами
    const callbackUrl = `${process.env.NEXT_PUBLIC_SITE_URL}/auth/callback?returnTo=${encodeURIComponent(returnTo)}`

    // 2) Кодируем его целиком, чтобы "?" внутри не сломал Supabase
    const redirectTo = encodeURIComponent(callbackUrl)

    // 3) Просим Supabase выслать magic link
    const { error } = await sb.auth.signInWithOtp({
      email,
      options: {
        // здесь идёт уже закодированная строка
        emailRedirectTo: `${process.env.NEXT_PUBLIC_SUPABASE_URL}/auth/v1/verify?redirect_to=${redirectTo}`
      },
    })

    setMsg(error
      ? `❌ Ошибка: ${error.message}`
      : '✅ Ссылка отправлена! Проверьте почту.'
    )
  }

  return (
    <form onSubmit={handle} className="flex flex-col gap-2">
      <input
        type="email"
        required
        placeholder="you@mail.com"
        value={email}
        onChange={e => setEmail(e.target.value)}
        className="px-3 py-2 bg-gray-100 text-black placeholder-gray-400 focus:outline-none focus:ring"
      />
      <button className="border px-4 py-2 hover:bg-white hover:text-black">
        Send link
      </button>
      {msg && <p className="mt-2">{msg}</p>}
    </form>
  )
}
