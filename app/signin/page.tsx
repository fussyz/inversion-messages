'use client'
import { useState } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { createClient } from '@supabase/supabase-js'

const sb = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_KEY!
)

export default function SignIn() {
  const [email, setEmail] = useState('')
  const [msg,   setMsg]   = useState('')
  const params = useSearchParams()
  const router = useRouter()

  //  куда вернуться после верификации
  const returnTo = params.get('returnTo') || '/admin'

  async function handle(e: React.FormEvent) {
    e.preventDefault()

    const { error } = await sb.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo:
          `https://www.inversion.one/auth/callback?returnTo=${encodeURIComponent(returnTo)}`,
      },
    })

    setMsg(error ? error.message : '🔗 Ссылка отправлена')
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center
                     gap-4 bg-black text-white">
      <h1 className="text-xl">Вход</h1>

      <form onSubmit={handle} className="flex gap-2">
        <input
          type="email"
          required
          placeholder="you@mail.com"
          value={email}
          onChange={e => setEmail(e.target.value)}
          className="px-3 py-2 bg-gray-100 text-black placeholder-gray-400
                     focus:outline-none focus:ring"
        />
        <button className="border px-4 py-2 hover:bg-white hover:text-black">
          Send link
        </button>
      </form>

      {msg && <p>{msg}</p>}
    </main>
  )
}
