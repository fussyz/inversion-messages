import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function PUT(_req: Request, { params }:{params:{id:string}}) {
  const id = params.id

  const { data } = await supabase
    .from('messages')
    .select('*')                 // тянем всё, нужен views & days_to_live
    .eq('id', id)
    .single()

  if (!data) return NextResponse.json({ ok:false })

  /* первый просмотр → вычисляем expire_at */
  if (!data.expire_at && !data.auto_delete && data.days_to_live) {
    const expire = new Date(Date.now()+data.days_to_live*86_400_000).toISOString()
    await supabase.from('messages').update({ expire_at:expire }).eq('id', id)
  }

  /* статистика */
  await supabase.from('messages').update({
    views: (data.views ?? 0) + 1,
    last_read_at: new Date().toISOString()
  }).eq('id', id)

  /* удаление */
  const expired = data.expire_at && new Date(data.expire_at) < new Date()

  if (data.auto_delete || expired) {
    await supabase.from('messages').delete().eq('id', id)
  }

  return NextResponse.json({ ok:true })
}
