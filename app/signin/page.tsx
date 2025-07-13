'use client'

import { useState, FormEvent, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_KEY!
)

export default function SignInPage() {
  const [email, setEmail] = useState('')
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

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (!isValidEmail) {
      alert('Please enter a valid email')
      return
    }
    setLoading(true)

    // 1. Запускаем глитч-эффект
    setShowGlitch(true)
    
    setTimeout(() => {
      // 2. Убираем глитч и показываем "ACCESS GRANTED"
      setShowGlitch(false)
      setShowAccessGranted(true)
      
      // 3. Отправляем email
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
          // 4. Через 2 секунды всё исчезает
          setTimeout(() => {
            setShowAccessGranted(false)
          }, 2000)
        }
      })
    }, 500) // Глитч длится 0.5 секунды
  }

  return (
    <main className="min-h-screen flex items-center justify-center">
      {/* Лого */}
      <div className="logo-container">
        <img src="/inversion logo purple 4k.jpg" alt="Inversion Logo" className="main-logo" />
      </div>
      
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
      <form onSubmit={handleSubmit} className={`form-container ${showGlitch ? 'glitching' : ''} ${showAccessGranted ? 'hidden' : ''}`}>
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
