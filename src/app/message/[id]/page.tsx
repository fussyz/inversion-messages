import { notFound } from 'next/navigation'
import MessageView from '@/app/message/MessageView'
import { supabase } from '@/lib/supabase-server'   // сервер-клиент (RLS = anon)

/* ─────────────  /message/[id]  ───────────── */
export default async function Page({ params }: any) {
  const id = params.id as string

  /* берём картинку из базы */
  const { data, error } = await supabase
    .from('messages')
    .select('image_url')
    .eq('id', id)
    .single()

  if (error || !data) notFound()

  return <MessageView id={id} url={data.image_url} />
}
