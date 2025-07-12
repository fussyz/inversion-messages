// File: app/signin/SignInForm.tsx

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
  // raw returnTo, без кодирования
  const returnTo = params.get('returnTo') || '/admin'

  async function handle(e: React.FormEvent) {
    e.preventDefault()
    setMsg('🔄 Отправляем ссылку…')

    // >>> здесь НЕТ encodeURIComponent <<<
    const callbackUrl = 
      `${process.env.NEXT_PUBLIC_SITE_URL}/auth/callback?returnTo=${returnTo}`

    const { error } = await sb.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: callbackUrl
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
        type="email" required placeholder="you@mail.com"
        value={email} onChange={e => setEmail(e.target.value)}
        className="px-3 py-2 bg-gray-100 text-black placeholder-gray-400
                   focus:outline-none focus:ring"
      />
      <button className="border px-4 py-2 hover:bg-white hover:text-black">
        Send link
      </button>
      {msg && <p className="mt-2">{msg}</p>}
    </form>
  )
}
