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
    if (!email) return

    const { error } = await sb.auth.signInWithOtp({
      email,
      /* ВАЖНО: именно emailRedirectTo — тогда
         Supabase добавит токены к ссылке        */
      options: { emailRedirectTo: `${window.location.origin}/auth/callback` }
    })

    setMsg(error ? error.message : '🔗 Ссылка-логин отправлена на почту')
  }

  return (
    <main style={{background:'#000',color:'#fff',minHeight:'100vh',
                  display:'flex',flexDirection:'column',
                  alignItems:'center',justifyContent:'center',gap:'1rem'}}>
      <form onSubmit={handle} style={{display:'flex',gap:'0.5rem'}}>
        <input
  type="email"
  required
  placeholder="you@mail.com"
  value={email}
  onChange={e => setEmail(e.target.value)}
  className="px-3 py-2 text-black bg-gray-100 focus:outline-none focus:ring
             placeholder-gray-400"
/>
        <button style={{padding:'0.5rem 1rem',border:'1px solid #fff'}}>
          Send link
        </button>
      </form>
      {msg && <p>{msg}</p>}
    </main>
  )
}
