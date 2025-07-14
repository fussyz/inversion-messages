import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )
    
    const data = await request.json()
    const { email } = data
    
    // Получаем IP адрес запроса
    const clientIp = request.headers.get('x-forwarded-for') || 'unknown';
    
    // Если предоставлен email, сохраняем его
    if (email) {
      // Обновляем запись с email просматривающего
      const { error: updateError } = await supabase
        .from('messages')
        .update({
          viewer_email: email,
          client_ip: clientIp,
          views: supabase.rpc('increment_views', { row_id: params.id }),
          is_read: true,
          last_read_at: new Date().toISOString()
        })
        .eq('id', params.id)
      
      if (updateError) {
        console.error('Error updating message with email:', updateError)
        return NextResponse.json({ error: updateError.message }, { status: 500 })
      }
      
      return NextResponse.json({ success: true })
    } else {
      // Обновляем только счетчик просмотров и отмечаем как прочитанное
      const { error: updateError } = await supabase
        .from('messages')
        .update({
          client_ip: clientIp,
          views: supabase.rpc('increment_views', { row_id: params.id }),
          is_read: true,
          last_read_at: new Date().toISOString()
        })
        .eq('id', params.id)
      
      if (updateError) {
        console.error('Error updating message view count:', updateError)
        return NextResponse.json({ error: updateError.message }, { status: 500 })
      }
      
      return NextResponse.json({ success: true })
    }
  } catch (error) {
    console.error('Error processing view request:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}