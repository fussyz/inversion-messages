'use client'
import { useState } from 'react'
import { createClient } from '@supabase/supabase-js'

const sb = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_KEY!
)

export default function SignIn() {
  const [email, setEmail] = useState('')
  const [msg,   setMsg]   = useState('')

  async function handle(e: React.FormEvent) {
    e.preventDefault()
    const { error } = await sb.auth.signInWithOtp({
      email,
      options: {
        // жёстко указываем боевой домен,
        // чтобы в письме формировался 100 % корректный линк
        emailRedirectTo: 'https://www.inversion.one/auth/callback',
      },
    })
    setMsg(error ? error.message : '🔗 Ссылка отправлена')
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-4 bg-black text-white">
      <h1 className="text-xl">Вход в админ-панель</h1>

      <form onSubmit={handle} className="flex gap-2">
        <input
          type="email"
          required
          placeholder="you@mail.com"
          value={email}
          onChange={e => setEmail(e.target.value)}
          className="px-3 py-2 text-black bg-gray-100 placeholder-gray-400
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
