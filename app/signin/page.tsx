'use client'

import { useState, FormEvent } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_KEY!
)

export default function SignInPage() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setLoading(true)
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        // ↪ после клика по ссылке мы попадём на /auth/callback?returnTo=/admin
        emailRedirectTo: `${window.location.origin}/auth/callback?returnTo=/admin`,
      },
    })
    setLoading(false)
    if (error) alert(error.message)
    else alert('Проверьте почту — вам пришёл magic link')
  }

  return (
    <main className="min-h-screen flex items-center justify-center bg-gray-900 text-white">
      <form onSubmit={handleSubmit} className="flex flex-col space-y-4">
        <input
          type="email"
          placeholder="Email"
          required
          className="px-4 py-2 bg-white text-black rounded"
          value={email}
          onChange={e => setEmail(e.target.value)}
        />
        <button
          type="submit"
          className="px-4 py-2 bg-blue-600 rounded hover:bg-blue-500"
          disabled={loading}
        >
          {loading ? 'Отправляю…' : 'Войти'}
        </button>
      </form>
    </main>
  )
}
