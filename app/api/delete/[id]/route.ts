import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// Обновляем обработку POST запроса для удаления

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    console.log(`Получен запрос на удаление для ID: ${params.id}`);
    
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )

    // Попытаемся получить тело запроса (если оно есть)
    let body = {};
    try {
      if (request.headers.get('content-type')?.includes('application/json')) {
        body = await request.json();
      }
    } catch (e) {
      // Игнорируем ошибки парсинга JSON - возможно это FormData
      console.log('Не удалось прочитать JSON тело запроса');
    }

    // Проверка формата запроса
    console.log('Тип содержимого:', request.headers.get('content-type'));
    
    // Получаем сообщение для проверки auto_delete
    const { data: message, error: fetchError } = await supabase
      .from('messages')
      .select('*')
      .eq('id', params.id)
      .single()

    if (fetchError) {
      console.error('Error fetching message:', fetchError)
      return NextResponse.json({ error: fetchError.message }, { status: 500 })
    }

    // Проверяем, можно ли удалить это сообщение
    if (message && message.auto_delete) {
      console.log(`Удаляем auto-delete сообщение ${params.id}...`);
      
      const { error: deleteError } = await supabase
        .from('messages')
        .delete()
        .eq('id', params.id)

      if (deleteError) {
        console.error('Error deleting message:', deleteError)
        return NextResponse.json({ error: deleteError.message }, { status: 500 })
      }

      console.log(`Сообщение ${params.id} успешно удалено при закрытии вкладки`)
      return NextResponse.json({ success: true })
    } else {
      console.log(`Сообщение ${params.id} не помечено для автоудаления, пропускаем.`);
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