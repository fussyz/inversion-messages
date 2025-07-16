'use client'

export const dynamic = 'force-dynamic'

import { useEffect, useState } from 'react'

interface PageProps {
  params: { id: string }
}

export default function MessagePage({ params }: PageProps) {
  const [message, setMessage] = useState<string>('')
  const [error, setError] = useState<string>('')
  const [loading, setLoading] = useState<boolean>(true)

  useEffect(() => {
    const loadMessage = async () => {
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

        const { data, error } = await supabase
          .from('messages')
          .select('*')
          .eq('id', params.id)
          .single()

        if (error || !data) {
          setError('Message not found')
          return
        }

        setMessage(data.content)
      } catch (error) {
        console.error('Error loading message:', error)
        setError('Failed to load message')
      } finally {
        setLoading(false)
      }
    }

    loadMessage()
  }, [params.id])

  if (loading) {
    return <div className="min-h-screen p-8 bg-black text-purple-500">Loading...</div>
  }

  if (error) {
    return <div className="min-h-screen p-8 bg-black text-purple-500">{error}</div>
  }

  return (
    <div className="min-h-screen p-8 bg-black text-purple-500">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-3xl font-bold mb-6">Message</h1>
        <div className="bg-gray-900 p-6 rounded-lg border border-purple-500">
          <p className="text-lg leading-relaxed">{message}</p>
          <div className="mt-4 text-sm text-gray-400">
            Sent: {new Date().toLocaleString()}
          </div>
        </div>
      </div>
    </div>
  )
}
