'use client'

export const dynamic = 'force-dynamic'

import { useState, FormEvent, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useSearchParams } from 'next/navigation'

export default function SignInPage() {
  const [email, setEmail] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [isValidEmail, setIsValidEmail] = useState(false)
  const [messageId, setMessageId] = useState('')
  const searchParams = useSearchParams()

  useEffect(() => {
    const paramId = searchParams.get('messageId')
    if (paramId) setMessageId(paramId)
  }, [searchParams])

  const router = useRouter()

  useEffect(() => {
    setIsValidEmail(validateEmail(email))
  }, [email])

  // always sign out any existing session on visiting sign-in page
  useEffect(() => {
    (async () => {
      const { createClient } = await import('@supabase/supabase-js')
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
      const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
      if (supabaseUrl && supabaseKey) {
        const supabase = createClient(supabaseUrl, supabaseKey)
        await supabase.auth.signOut()
      }
    })()
  }, [])

  const validateEmail = (email: string) => {
    const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    return regex.test(email)
  }

  const handleSignIn = async (e: FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      const { createClient } = await import('@supabase/supabase-js')
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
      const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

      if (!supabaseUrl || !supabaseKey) {
        console.error('Missing Supabase configuration')
        setError('Server configuration error')
        setLoading(false)
        return
      }

      const supabase = createClient(supabaseUrl, supabaseKey)

      // clear any stale session before sign-in
      await supabase.auth.signOut()

      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: {
          emailRedirectTo: messageId
            ? `${window.location.origin}/auth/callback?id=${messageId}`
            : `${window.location.origin}/auth/callback`
        }
      })

      if (error) throw error

      alert('Magic link sent. Please check your email.')
    } catch (error) {
      console.error('Error signing in:', error)
      if (error instanceof Error) {
        setError(error.message)
      } else {
        setError('Failed to sign in')
      }
      setLoading(false)
    }
  }

  return (
    <main className="min-h-screen flex items-center justify-center">
      <form onSubmit={handleSignIn} className="form-container">
        <div className="input-wrapper">
          <input
            type="email"
            placeholder="Provide your email to continue"
            required
            value={email}
            onChange={e => setEmail(e.target.value)}
          />
          {isValidEmail && (
            <button
              type="submit"
              className="submit-button"
              disabled={loading}
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="currentColor"
                className="size-6 violet-checkmark"
              >
                <path
                  fillRule="evenodd"
                  d="M2.25 12c0-5.385 4.365-9.75 9.75-9.75s9.75 4.365 9.75 9.75-4.365 9.75-9.75 9.75S2.25 17.385 2.25 12Zm13.36-1.814a.75.75 0 1 0-1.22-.872l-3.236 4.53L9.53 12.22a.75.75 0 0 0-1.06 1.06l2.25 2.25a.75.75 0 0 0 1.14-.094l3.75-5.25Z"
                  clipRule="evenodd"
                />
              </svg>
            </button>
          )}
        </div>
      </form>
    </main>
  )
}
