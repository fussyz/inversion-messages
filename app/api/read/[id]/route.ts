// файл: app/api/read/[id]/route.ts

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!    // обязательно в .env.local
)

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const id = params.id
  // получаем IP клиента (Next.js 14+ автоматически заполняет req.ip)
  const ip = (req.headers.get('x-forwarded-for') ?? '').split(',')[0] || req.ip || null

  // 1) обновляем stats
  const { error } = await supabaseAdmin
    .from('messages')
    .update({
      views: supabaseAdmin.raw('views + 1'),
      last_read_at: new Date().toISOString(),
      client_ip: ip,
    })
    .eq('id', id)

  if (error) {
    console.error('Ошибка обновления stats:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  // 2) перенаправляем пользователя на страницу с картинкой
  return NextResponse.redirect(`${process.env.NEXT_PUBLIC_BASE_URL}/message/${id}`)
}
