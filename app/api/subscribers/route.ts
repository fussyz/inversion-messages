import { NextResponse } from 'next/server'
import { supabase } from '../../lib/supabase-server'

export async function GET() {
  // читаем всех подписчиков
  const { data, error } = await supabase
    .from('subscribers')
    .select('*')

  if (error) {
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    )
  }

  // возвращаем JSON-массив
  return NextResponse.json(data, { status: 200 })
}
