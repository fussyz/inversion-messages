import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(request: Request) {
  try {
    const { email } = await request.json()
    
    // Проверяем, не администратор ли это
    if (email === "semoo.smm@gmail.com") {
      return NextResponse.json({ success: true })
    }
    
    // Сохраняем email в таблицу subscribers
    const { error } = await supabase
      .from('subscribers')
      .insert([{ email, created_at: new Date().toISOString() }])
    
    if (error) throw error
    
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error saving subscriber:', error)
    return NextResponse.json(
      { error: 'Failed to save subscriber' },
      { status: 500 }
    )
  }
}
