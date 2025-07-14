'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'

export default function ViewPage() {
  const [loading, setLoading] = useState(true)
  const [message, setMessage] = useState<any>(null)
  const [error, setError] = useState('')
  const [countdown, setCountdown] = useState<number | null>(null)
  const params = useParams()
  const id = params.id

  useEffect(() => {
    if (id) {
      loadMessage()
    }
  }, [id])

  useEffect(() => {
    let interval: NodeJS.Timeout
    if (countdown !== null && countdown > 0) {
      interval = setInterval(() => {
        setCountdown(prev => {
          if (prev && prev <= 1) {
            deleteMessage()
            return 0
          }
          return prev ? prev - 1 : 0
        })
      }, 1000)
    }
    return () => clearInterval(interval)
  }, [countdown])

  // Добавить в начале компонента (внутри функции, после объявления состояний)
  useEffect(() => {
    // Обработчик события закрытия вкладки
    const handleTabClose = async () => {
      if (message && message.auto_delete) {
        try {
          // Удаляем запись при закрытии вкладки
          await fetch(`/api/delete/${message.id}`, {
            method: 'DELETE'
          })
          console.log('Record deleted on tab close')
        } catch (error) {
          console.error('Failed to delete record:', error)
        }
      }
    }

    // Регистрируем обработчик
    window.addEventListener('beforeunload', handleTabClose)

    return () => {
      window.removeEventListener('beforeunload', handleTabClose)
    }
  }, [message, id])

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

      // Проверяем не было ли уже просмотрено (если включено удаление после просмотра)
      if (data.last_read_at && data.auto_delete && data.is_read) {
        setError('Message has already been viewed and will be deleted')
        setLoading(false)
        return
      }

      setMessage(data)

      // Если включено удаление после просмотра, запускаем обратный отсчет
      if (data.auto_delete && !data.is_read) {
        setCountdown(10) // 10 секунд на просмотр
      }

      setLoading(false)
    } catch (error) {
      console.error('Error loading message:', error)
      setError('Failed to load message')
      setLoading(false)
    }
  }

  const deleteMessage = async () => {
    if (!message) return

    try {
      // Удаляем запись из базы данных
      const response = await fetch(`/api/delete/${message.id}`, {
        method: 'DELETE'
      })

      if (response.ok) {
        setError('Message has been deleted after viewing')
      }
    } catch (error) {
      console.error('Error deleting message:', error)
    }
  }

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
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

  return (
    <div className="min-h-screen bg-black flex flex-col items-center justify-center p-4">
      {countdown !== null && countdown > 0 && (
        <div className="fixed top-4 right-4 bg-red-600 text-white px-4 py-2 rounded-lg z-50">
          <p className="font-bold">This message will be deleted in:</p>
          <p className="text-2xl text-center">{formatTime(countdown)}</p>
        </div>
      )}

      <div className="max-w-4xl w-full">
        <div className="text-center mb-6">
          <h1 className="text-3xl font-bold text-purple-500 mb-2">
            Message #{message.id}
          </h1>
          {message.auto_delete && (
            <p className="text-red-400">⚠️ This message will be deleted after viewing</p>
          )}
          {message.expire_at && (
            <p className="text-yellow-400">
              Expires: {new Date(message.expire_at).toLocaleString()}
            </p>
          )}
        </div>

        <div className="flex justify-center">
          {message.image_url ? (
            <img
              src={message.image_url}
              alt="Message content"
              className="max-w-full max-h-[80vh] object-contain rounded-lg border border-purple-500"
              onError={() => setError('Failed to load image')}
            />
          ) : message.content ? (
            <div className="bg-gray-900 p-8 rounded-lg border border-purple-500 max-w-2xl">
              <p className="text-white text-lg leading-relaxed">{message.content}</p>
            </div>
          ) : (
            <div className="bg-gray-900 p-8 rounded-lg border border-purple-500">
              <p className="text-gray-400">No content available</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}