// app/admin/page.tsx
export const dynamic = 'force-dynamic'  // отключаем SSG/SSR prerender

import { createClient } from '@supabase/supabase-js'
import { AdminMap } from './AdminMap'     // наш клиентский компонент для карты

type MessageRow = {
  id: string
  image_url: string
  views: number
  last_read_at: string | null
  client_ip: string | null
}

export default async function AdminPage() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_KEY!
  )

  const { data: rows, error } = await supabase
    .from<MessageRow>('messages')
    .select('id, image_url, views, last_read_at, client_ip')
    .order('created_at', { ascending: false })

  if (error) {
    throw new Error('Failed to fetch messages: ' + error.message)
  }

  return (
    <main className="p-8 bg-gray-900 min-h-screen text-white">
      <h1 className="text-2xl mb-6">Admin: Messages</h1>
      <table className="w-full table-auto border-collapse">
        <thead>
          <tr className="border-b border-gray-700">
            <th className="px-3 py-2 text-left">ID</th>
            <th className="px-3 py-2 text-left">Image</th>
            <th className="px-3 py-2 text-left">Views</th>
            <th className="px-3 py-2 text-left">Last Read</th>
            <th className="px-3 py-2 text-left">IP</th>
            <th className="px-3 py-2 text-left">Location</th>
          </tr>
        </thead>
        <tbody>
          {rows?.map(row => (
            <tr key={row.id} className="border-t border-gray-700">
              <td className="px-3 py-2">{row.id}</td>
              <td className="px-3 py-2">
                <img
                  src={row.image_url}
                  alt=""
                  className="h-12 w-12 object-cover rounded"
                />
              </td>
              <td className="px-3 py-2">{row.views}</td>
              <td className="px-3 py-2">
                {row.last_read_at
                  ? new Date(row.last_read_at).toLocaleString()
                  : '—'}
              </td>
              <td className="px-3 py-2">{row.client_ip || '—'}</td>
              <td className="px-3 py-2">
                {row.client_ip ? <AdminMap ip={row.client_ip} /> : '—'}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </main>
  )
}
