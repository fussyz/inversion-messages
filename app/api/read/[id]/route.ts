// файл: app/api/read/[id]/route.ts

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

    if (!supabaseUrl || !supabaseKey) {
      console.error('Missing Supabase credentials')
      return NextResponse.json(
        { error: 'Server configuration error' },
        { status: 500 }
      )
    }

    const supabase = createClient(supabaseUrl, supabaseKey)
    const id = params.id

    // Получаем IP адрес
    const forwarded = request.headers.get('x-forwarded-for')
    const ip = forwarded ? forwarded.split(',')[0] : request.headers.get('x-real-ip') || 'unknown'

    // Загружаем сообщение
    const { data: message, error } = await supabase
      .from('messages')
      .select('*')
      .eq('id', id)
      .single()

    if (error || !message) {
      return NextResponse.json({ error: 'Message not found' }, { status: 404 })
    }

    // Увеличиваем счетчик просмотров
    await supabase
      .from('messages')
      .update({
        views: (message.views || 0) + 1,
        last_read_at: new Date().toISOString(),
        client_ip: ip,
        is_read: true
      })
      .eq('id', id)

    return NextResponse.json(message)
  } catch (error) {
    console.error('Error in read API:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
