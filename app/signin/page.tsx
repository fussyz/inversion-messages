// app/signin/page.tsx
'use client'
export const dynamic = 'force-dynamic'

import { useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@supabase/supabase-js'

const sb = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_KEY!
)

export default function SignInPage() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const params = useSearchParams()
  const router = useRouter()

  // из ?returnTo=…
  const returnTo = params.get('returnTo') ?? '/'

  const handle = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    const { error } = await sb.auth.signInWithOtp({
      email,
      options: {
        // прокидываем динамический returnTo
        emailRedirectTo: `${process.env.NEXT_PUBLIC_BASE_URL}/auth/callback?returnTo=${encodeURIComponent(returnTo)}`
      }
    })
    if (error) alert(error.message)
    else alert('Ссылка отправлена на почту')
    setLoading(false)
  }

  return (
    <main className="p-8">
      <h1>Вход</h1>
      <form onSubmit={handle} className="space-y-4">
        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={e=>setEmail(e.target.value)}
          className="border p-2 w-full"
        />
        <button
          type="submit"
          disabled={loading}
          className="bg-blue-600 text-white px-4 py-2"
        >
          {loading ? 'Ждём...' : 'Войти по ссылке'}
        </button>
      </form>
    </main>
  )
}
