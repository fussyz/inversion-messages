import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function PUT(
  _req: Request,
  { params }: { params: { id: string } }
) {
  const { id } = params
  const { data } = await supabase
    .from('messages')
    .select('auto_delete')
    .eq('id', id)
    .single()

  if (!data) return NextResponse.json({ ok: false })

  if (data.auto_delete) {
    await supabase.from('messages').delete().eq('id', id)
  } else {
    await supabase.from('messages').update({ is_read: true }).eq('id', id)
  }
  return NextResponse.json({ ok: true })
}
