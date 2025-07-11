/* eslint-disable @typescript-eslint/no-explicit-any */

import { notFound } from 'next/navigation'
import MessageView from '@/app/message/MessageView'
import { supabase } from '@/lib/supabase-server'

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
