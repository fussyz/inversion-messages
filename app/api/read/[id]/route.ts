import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function PUT(_req: Request, { params }:{params:{id:string}}) {
  const id = params.id

  const { data } = await supabase
    .from('messages')
    .select('auto_delete, days_to_live, expire_at')
    .eq('id', id)
    .single()

  if (!data) return NextResponse.json({ ok:false })

  /* первый просмотр → рассчитываем expire_at, если нужно */
  if (!data.expire_at && !data.auto_delete && data.days_to_live) {
    const expire = new Date(Date.now() + data.days_to_live*24*60*60_000).toISOString()
    await supabase.from('messages').update({ expire_at: expire }).eq('id', id)
  }

  /* auto-delete или просрочка */
  const expired = data.expire_at && new Date(data.expire_at) < new Date()

  if (data.auto_delete || expired) {
    await supabase.from('messages').delete().eq('id', id)
  } else {
    await supabase.from('messages').update({ is_read:true }).eq('id', id)
  }

  return NextResponse.json({ ok:true })
}
