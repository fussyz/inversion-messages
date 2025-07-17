'use client'

import { useState, useEffect } from 'react'
import { useSearchParams } from 'next/navigation'

export default function SignInPage() {
  const [messageId, setMessageId] = useState('')

  const searchParams = useSearchParams()

  useEffect(() => {
    const paramId = searchParams.get('messageId')
    if (paramId) setMessageId(paramId)
  }, [searchParams])

  // ...rest of your component code
}