'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'

export default function ViewPage() {
  const [loading, setLoading] = useState(true)
  const [message, setMessage] = useState<any>(null)
  const [error, setError] = useState('')
  const params = useParams()
  const id = params.id

  useEffect(() => {
    if (id) {
      loadMessage()
    }
  }, [id])

  // Добавляем обработчик закрытия вкладки
  useEffect(() => {
    const handleTabClose = async () => {
      if (message && message.auto_delete) {
        try {
          // Пытаемся отправить запрос на удаление при закрытии
          // Синхронно - может не успеть выполниться при закрытии вкладки
          navigator.sendBeacon(`/api/delete/${message.id}`);
          console.log('Delete request sent on tab close')
        } catch (error) {
          console.error('Failed to send delete request:', error)
        }
      }
    }

    // Регистрируем обработчик
    window.addEventListener('beforeunload', handleTabClose)

    return () => {
      window.removeEventListener('beforeunload', handleTabClose)
    }
  }, [message])

  const loadMessage = async () => {
    try {
      const response = await fetch(`/api/read/${id}`)
      const data = await response.json()

      if (!response.ok) {
        setError(data.error || 'Message not found')
        setLoading(false)
        return
      }

      // Проверяем не истек ли срок действия
      if (data.expire_at && new Date(data.expire_at) < new Date()) {
        setError('Message has expired')
        setLoading(false)
        return
      }

      setMessage(data)
      setLoading(false)
    } catch (error) {
      console.error('Error loading message:', error)
      setError('Failed to load message')
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-purple-500"></div>
          <p className="mt-4 text-purple-500">Loading...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black">
        <div className="text-center">
          <h1 className="text-4xl font-bold text-red-500 mb-4">Error</h1>
          <p className="text-white text-lg">{error}</p>
        </div>
      </div>
    )
  }

  // Упрощенный рендеринг - только изображение без метаданных
  return (
    <div className="min-h-screen bg-black flex flex-col items-center justify-center p-4">
      {/* Удаляем блок с обратным отсчетом */}
      
      <div className="max-w-4xl w-full">
        {/* Удаляем блок с заголовком и метаданными */}
        
        <div className="flex justify-center">
          {message.image_url ? (
            <img
              src={message.image_url}
              alt="Message content"
              className="max-w-full max-h-[90vh] object-contain" // Убрали рамку и увеличили до 90vh
              onError={() => setError('Failed to load image')}
            />
          ) : message.content ? (
            <div className="bg-transparent p-4 max-w-2xl"> {/* Убрали рамки и фон */}
              <p className="text-white text-lg leading-relaxed">{message.content}</p>
            </div>
          ) : (
            <div className="bg-transparent p-4">
              <p className="text-gray-400">No content available</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}