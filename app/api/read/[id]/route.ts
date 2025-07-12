export const dynamic = 'force-dynamic'

import { NextResponse, NextRequest } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// создаём клиент прямо здесь, без алиасов
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!   // или PUBLIC-ключ, если сервис ролей не нужен
)

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const id = params.id

  // Извлёк IP из заголовка
  const ip =
    req.headers.get('x-forwarded-for')?.split(',')[0].trim() ||
    null

  // 1) Берём запись
  const { data: message, error: fetchErr } = await supabase
    .from('messages')
    .select('*')
    .eq('id', id)
    .single()

  if (fetchErr || !message) {
    return NextResponse.json({ error: fetchErr?.message || 'Not found' }, { status: 404 })
  }

  // 2) Обновляем статистику
  await supabase
    .from('messages')
    .update({
      views: message.views + 1,
      last_read_at: new Date().toISOString(),
      client_ip: ip,
    })
    .eq('id', id)

  // 3) Отдаём URL картинки
  return NextResponse.json({ image_url: message.image_url })
}
