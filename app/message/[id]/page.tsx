/* eslint-disable @typescript-eslint/no-explicit-any */
import { notFound } from 'next/navigation'
import MessageView        from '../MessageView'
import { supabase }       from '../../lib/supabase-server'

export default async function Page({ params }: any) {
  const id = params.id as string

  const { data } = await supabase
    .from('messages')
    .select('image_url')
    .eq('id', id)
    .single()

  if (!data) notFound()

  return <MessageView id={id} url={data.image_url} />
}

/* eslint-disable @typescript-eslint/no-explicit-any */
'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_KEY!
)

interface Message {
  id: string
  content: string
  created_at: string
}

export default function MessagePage() {
  const [message, setMessage] = useState<Message | null>(null)
  const [loading, setLoading] = useState(true)
  const params = useParams()

  useEffect(() => {
    const fetchMessage = async () => {
      try {
        const { data, error } = await supabase
          .from('messages')
          .select('*')
          .eq('id', params.id)
          .single()

        if (error) {
          console.error('Error fetching message:', error)
        } else {
          setMessage(data)
        }
      } catch (error) {
        console.error('Error:', error)
      } finally {
        setLoading(false)
      }
    }

    if (params.id) {
      fetchMessage()
    }
  }, [params.id])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-purple-500"></div>
          <p className="mt-4 text-purple-500">Loading message...</p>
        </div>
      </div>
    )
  }

  if (!message) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black">
        <div className="text-center">
          <h1 className="text-2xl text-purple-500 mb-4">Message not found</h1>
          <p className="text-gray-400">The message you're looking for doesn't exist.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen p-8 bg-black text-purple-500">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-3xl font-bold mb-6">Message</h1>
        <div className="bg-gray-900 p-6 rounded-lg border border-purple-500">
          <p className="text-lg leading-relaxed">{message.content}</p>
          <div className="mt-4 text-sm text-gray-400">
            Sent: {new Date(message.created_at).toLocaleString()}
          </div>
        </div>
      </div>
    </div>
  )
}
