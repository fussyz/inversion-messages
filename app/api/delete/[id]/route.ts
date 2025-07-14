import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// Обновляем обработку POST запроса для удаления

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    // Логируем все запросы для отладки
    console.log(`Received POST delete request for message ID: ${params.id}`);
    
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )

    // Получаем сообщение
    const { data: message, error: fetchError } = await supabase
      .from('messages')
      .select('*')
      .eq('id', params.id)
      .single()

    if (fetchError) {
      console.error('Error fetching message:', fetchError)
      return NextResponse.json({ error: fetchError.message }, { status: 500 })
    }

    // Проверяем является ли сообщение помеченным для автоудаления
    if (message && message.auto_delete) {
      console.log(`Deleting auto-delete message ${params.id}...`);
      
      const { error: deleteError } = await supabase
        .from('messages')
        .delete()
        .eq('id', params.id)

      if (deleteError) {
        console.error('Error deleting message:', deleteError)
        return NextResponse.json({ error: deleteError.message }, { status: 500 })
      }

      console.log(`Successfully deleted message ${params.id} on tab close`)
      return NextResponse.json({ success: true })
    } else {
      console.log(`Message ${params.id} is not marked for auto-delete, skipping.`);
    }

    return NextResponse.json({ success: false, reason: 'Not set for auto-delete' })
  } catch (error) {
    console.error('Error processing delete request:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}

// Оставляем также DELETE метод для прямых вызовов из админки
export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )

    const { error } = await supabase
      .from('messages')
      .delete()
      .eq('id', params.id)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to delete message' },
      { status: 500 }
    )
  }
}