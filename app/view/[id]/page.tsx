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

  // Обработка закрытия вкладки для auto-delete
  useEffect(() => {
    if (!message || !message.auto_delete) return;

    const handleBeforeUnload = () => {
      try {
        // Отправляем через sendBeacon
        const formData = new FormData();
        formData.append('auto_delete', 'true');
        navigator.sendBeacon(`/api/delete/${id}`, formData);
      } catch (error) {
        console.error('Failed to send delete request:', error);
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      if (message.auto_delete) {
        handleBeforeUnload();
      }
    };
  }, [message, id]);

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

  return (
    <div className="min-h-screen w-full flex flex-col items-center justify-center relative">
      {/* Полноэкранный непрозрачный noise.gif фон */}
      <div className="fullscreen-noise absolute top-0 left-0 w-full h-full z-0"></div>
      
      {/* Контейнер для центрирования контента */}
      <div className="relative z-10 flex flex-col items-center max-w-4xl px-4">
        {/* Само изображение */}
        {message.image_url ? (
          <div className="image-container">
            <img
              src={message.image_url}
              alt="Message content"
              className="max-w-full max-h-[80vh] object-contain"
              onError={() => setError('Failed to load image')}
            />
          </div>
        ) : message.content ? (
          <div className="access-granted-container w-full max-w-2xl relative overflow-hidden rounded-lg">
            <div className="text-center p-8">
              <div className="text-pink-500 text-2xl md:text-3xl font-mono glitch-text">
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
      
      <style jsx global>{`
        body {
          margin: 0;
          padding: 0;
          background-color: black;
          overflow-x: hidden;
        }
        
        .fullscreen-noise {
          background-image: url('/noise.gif');
          background-repeat: repeat;
          opacity: 1;
          pointer-events: none;
        }
        
        .image-container {
          padding: 10px;
          background-color: rgba(0, 0, 0, 0.4);
          backdrop-filter: blur(4px);
          border-radius: 8px;
          box-shadow: 0 0 20px rgba(255, 0, 255, 0.3);
        }
        
        @keyframes textShadowFlicker {
          0% { text-shadow: 2px 0 #ff00ff, -2px 0 cyan; }
          25% { text-shadow: 3px 0 #ff00ff, -3px 0 cyan; }
          50% { text-shadow: 1px 0 #ff00ff, -1px 0 cyan; }
          75% { text-shadow: 2.5px 0 #ff00ff, -2.5px 0 cyan; }
          100% { text-shadow: 2px 0 #ff00ff, -2px 0 cyan; }
        }
        
        .glitch-text {
          animation: textShadowFlicker 3s infinite alternate;
          color: #ff00ff;
          font-weight: bold;
          letter-spacing: 1px;
        }
      `}</style>
    </div>
  );
}