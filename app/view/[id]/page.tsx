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

  // Обновляем стиль отображения текстовых сообщений
  return (
    <div className="min-h-screen bg-black flex flex-col items-center justify-center p-4">
      <div className="max-w-4xl w-full">
        <div className="flex justify-center">
          {message.image_url ? (
            <img
              src={message.image_url}
              alt="Message content"
              className="max-w-full max-h-[90vh] object-contain"
              onError={() => setError('Failed to load image')}
            />
          ) : message.content ? (
            <div className="access-granted-container w-full max-w-2xl relative overflow-hidden rounded-lg">
              {/* Стиль "Access Granted" с эффектами */}
              <div className="text-center p-8">
                <div className="text-pink-500 text-2xl md:text-3xl font-mono relative z-10 glitch-text">
                  {message.content.split('\n').map((line: string, i: number) => (
                    <p key={i} className="mb-4">{line}</p>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div className="p-4">
              <p className="text-gray-400">No content available</p>
            </div>
          )}
        </div>
      </div>
      
      {/* Стили для эффекта "Access Granted" */}
      <style jsx global>{`
        @keyframes noise {
          0% { background-position: 0 0; }
          100% { background-position: 100% 100%; }
        }
        
        @keyframes textShadowFlicker {
          0% { text-shadow: 2px 0 #ff00ff, -2px 0 cyan; }
          25% { text-shadow: 3px 0 #ff00ff, -3px 0 cyan; }
          50% { text-shadow: 1px 0 #ff00ff, -1px 0 cyan; }
          75% { text-shadow: 2.5px 0 #ff00ff, -2.5px 0 cyan; }
          100% { text-shadow: 2px 0 #ff00ff, -2px 0 cyan; }
        }
        
        .access-granted-container {
          position: relative;
          background-color: rgba(0, 0, 0, 0.7);
          box-shadow: 0 0 30px rgba(255, 0, 255, 0.3);
          overflow: hidden;
        }
        
        .access-granted-container::before {
          content: "";
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background-image: url('data:image/svg+xml;charset=utf-8,<svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg"><filter id="a"><feTurbulence type="fractalNoise" baseFrequency="0.65" numOctaves="3" stitchTiles="stitch"/></filter><rect width="100%" height="100%" filter="url(%23a)"/></svg>');
          opacity: 0.08;
          pointer-events: none;
          z-index: 1;
          animation: noise 8s linear infinite alternate;
        }
        
        .glitch-text {
          font-family: monospace;
          animation: textShadowFlicker 3s infinite alternate;
          color: #ff00ff;
          font-weight: bold;
          letter-spacing: 1px;
        }
      `}</style>
    </div>
  )
}