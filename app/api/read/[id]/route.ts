import { NextResponse, NextRequest } from 'next/server'
import { supabase } from '@/lib/supabase-server'

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const id = params.id

  // 1. получаем IP клиента (напр. X-Forwarded-For)
  const ip =
    req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    req.ip ||
    null

  // 2. вытаскиваем запись
  const { data: message, error: fetchErr } = await supabase
    .from('messages')
    .select('*')
    .eq('id', id)
    .single()

  if (fetchErr || !message) {
    return NextResponse.json(
      { error: fetchErr?.message ?? 'Not found' },
      { status: 404 }
    )
  }

  // 3. обновляем статистику
  const { error: updateErr } = await supabase
    .from('messages')
    .update({
      views: message.views + 1,
      last_read_at: new Date().toISOString(),
      client_ip: ip,
    })
    .eq('id', id)

  if (updateErr) {
    console.error('Failed to update stats:', updateErr)
    // но картинку всё равно отдадим
  }

  // 4. отдаём URL картинки
  return NextResponse.json({ image_url: message.image_url })
}
