'use client'

export const dynamic = 'force-dynamic'

import { useState, FormEvent, useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function SignInPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [isValidEmail, setIsValidEmail] = useState(false)
  const [showGlitch, setShowGlitch] = useState(false)
  const [showAccessGranted, setShowAccessGranted] = useState(false)
  const router = useRouter()

  useEffect(() => {
    setIsValidEmail(validateEmail(email))
  }, [email])

  const validateEmail = (email: string) => {
    const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    return regex.test(email)
  }

  const handleSignIn = async (e: FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      // Используем динамический импорт
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
      
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password
      })

      if (error) {
        throw error
      }

      setShowGlitch(true)
      setTimeout(() => {
        setShowGlitch(false)
        setShowAccessGranted(true)
        setTimeout(() => {
          // После анимации перенаправляем на админ панель
          router.push('/admin')
        }, 1500)
      }, 1000)

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
      {/* Глитч-оверлей */}
      {showGlitch && <div className="glitch-overlay"></div>}
      
      {/* ACCESS GRANTED сообщение */}
      {showAccessGranted && (
        <div className="access-granted-overlay">
          <div className="access-granted-text">
            <div className="access-granted-title">ACCESS GRANTED</div>
            <div className="access-granted-subtitle">Link sent to your email</div>
          </div>
        </div>
      )}
      
      {/* Основная форма */}
      <form onSubmit={handleSignIn} className={`form-container ${showGlitch ? 'glitching' : ''} ${showAccessGranted ? 'hidden' : ''}`}>
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
