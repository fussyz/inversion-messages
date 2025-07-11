import { NextResponse, NextRequest } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const { id } = params

  const { data } = await supabase
    .from('messages')
    .select('*')
    .eq('id', id)
    .single()

  if (!data) return NextResponse.json({ ok: false })

  if (!data.expire_at && !data.auto_delete && data.days_to_live) {
    const exp = new Date(Date.now() + data.days_to_live * 86_400_000).toISOString()
    await supabase.from('messages').update({ expire_at: exp }).eq('id', id)
  }

  await supabase.from('messages').update({
    views: (data.views ?? 0) + 1,
    last_read_at: new Date().toISOString(),
  }).eq('id', id)

  if (data.auto_delete) {
    await supabase.from('messages').delete().eq('id', id)
  }

  return NextResponse.json({ ok: true })
}
