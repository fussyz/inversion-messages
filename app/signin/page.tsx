'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export default function SignInPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const router = useRouter()

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setMessage('')

<<<<<<< HEAD
    setShowGlitch(true)
    
    setTimeout(() => {
      setShowGlitch(false)
      setShowAccessGranted(true)
      
      supabase.auth.signInWithOtp({
        email,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback?returnTo=/admin`,
        },
      }).then(({ error }) => {
        setLoading(false)
        if (error) {
          alert(error.message)
          setShowAccessGranted(false)
        } else {
          setTimeout(() => {
            setShowAccessGranted(false)
          }, 2000)
        }
      })
    }, 500)
  }

  return (
    <main className="min-h-screen flex items-center justify-center">
      {/* Глитч-оверлей */}
      {showGlitch && <div className="glitch-overlay"></div>}
      
      {/* ACCESS GRANTED сообщение */}
      {showAccessGranted && (
        <div className="access-granted-overlay">
          <div className="access-granted-text">
            <div className="access-granted-title">ACCESS GRANTED</div>
            <div className="access-granted-subtitle">Link sent to your email</div>
          </div>
=======
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (error) {
        setMessage(error.message)
      } else {
        router.push('/admin')
      }
    } catch (error) {
      setMessage('An error occurred during sign in')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-black">
      <div className="max-w-md w-full space-y-8 p-8">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-purple-500">
            Sign in to your account
          </h2>
>>>>>>> 57a0808142848f270ef1f97bbbec1d2db9241d10
        </div>
        <form className="mt-8 space-y-6" onSubmit={handleSignIn}>
          <div>
            <input
              type="email"
              required
              className="appearance-none rounded-md relative block w-full px-3 py-2 border border-purple-500 placeholder-gray-400 text-white bg-gray-900 focus:outline-none focus:ring-purple-500 focus:border-purple-500"
              placeholder="Email address"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <div>
            <input
              type="password"
              required
              className="appearance-none rounded-md relative block w-full px-3 py-2 border border-purple-500 placeholder-gray-400 text-white bg-gray-900 focus:outline-none focus:ring-purple-500 focus:border-purple-500"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
          <div>
            <button
              type="submit"
              disabled={loading}
              className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-purple-600 hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 disabled:opacity-50"
            >
              {loading ? 'Signing in...' : 'Sign in'}
            </button>
          </div>
          {message && (
            <div className="text-red-500 text-sm text-center">{message}</div>
          )}
        </form>
      </div>
    </div>
  )
}
