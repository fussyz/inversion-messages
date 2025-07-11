'use client'
import { useState } from 'react'
import { createClient } from '@supabase/supabase-js'

const sb = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_KEY!
)

export default function SignInForm({ returnTo }: { returnTo: string }) {
  const [email, setEmail] = useState('')
  const [msg,   setMsg]   = useState('')

  async function handle(e: React.FormEvent) {
    e.preventDefault()
    const { error } = await sb.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo:
          `https://www.inversion.one/auth/callback?returnTo=${encodeURIComponent(returnTo)}`
      }
    })
    setMsg(error ? error.message : '🔗 Ссылка отправлена')
  }

  return (
    <>
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
      {msg && <p className="mt-2">{msg}</p>}
    </>
  )
}
