/* eslint-disable @typescript-eslint/no-explicit-any */
import { notFound } from 'next/navigation'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_KEY!
)

interface PageProps {
  params: { id: string }
}

export default async function MessagePage({ params }: PageProps) {
  const { data, error } = await supabase
    .from('messages')
    .select('*')
    .eq('id', params.id)
    .single()

  if (error || !data) {
    notFound()
  }

  return (
    <div className="min-h-screen p-8 bg-black text-purple-500">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-3xl font-bold mb-6">Message</h1>
        <div className="bg-gray-900 p-6 rounded-lg border border-purple-500">
          <p className="text-lg leading-relaxed">{data.content}</p>
          <div className="mt-4 text-sm text-gray-400">
            Sent: {new Date(data.created_at).toLocaleString()}
          </div>
        </div>
      </div>
    </div>
  )
}
