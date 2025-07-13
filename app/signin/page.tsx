'use client'

import { useState, FormEvent, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@supabase/supabase-js'
import { CheckIcon } from '@heroicons/react/24/solid'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_KEY!
)

export default function SignInPage() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [isValidEmail, setIsValidEmail] = useState(false) // Добавим состояние для валидации email
  const router = useRouter()

  useEffect(() => {
    // Проверяем валидность email при изменении
    setIsValidEmail(validateEmail(email))
  }, [email])

  const validateEmail = (email: string) => {
    // Простая проверка email
    const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    return regex.test(email)
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!isValidEmail) {
      alert('Пожалуйста, введите корректный email');
      return;
    }
    setLoading(true);

    // Add glitch effect
    const formContainer = document.querySelector('.form-container');
    if (formContainer) {
      formContainer.classList.add('teleporting');
    }

    setTimeout(async () => {
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback?returnTo=/admin`,
        },
      });
      setLoading(false);
      if (formContainer) {
        formContainer.classList.remove('teleporting');
      }
      if (error) alert(error.message);
      else alert('Проверьте почту — вам пришёл magic link');
    }, 1000); // Adjust the timeout as needed
  };

  return (
    <main className="min-h-screen flex items-center justify-center">
      <form onSubmit={handleSubmit} className="form-container">
        <input
          type="email"
          placeholder="Enter your email"
          required
          value={email}
          onChange={e => setEmail(e.target.value)}
        />
        {isValidEmail && ( // Отображаем кнопку только если email валидный
          <button type="submit" className="receive-message-button">
            Sign In
          </button>
        )}
      </form>
    </main>
  );
}
