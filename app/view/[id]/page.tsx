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

  // Заменяем существующий useEffect для обработки закрытия вкладки

  useEffect(() => {
    if (!message || !message.auto_delete) return;

    const handleBeforeUnload = () => {
      try {
        // Более надежный метод с FormData для sendBeacon
        const formData = new FormData();
        formData.append('auto_delete', 'true');
        
        // Отправляем через sendBeacon (работает лучше при закрытии)
        navigator.sendBeacon(`/api/delete/${id}`, formData);
        
        // Резервный метод через fetch с keepalive
        fetch(`/api/delete/${id}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ auto_delete: true }),
          keepalive: true
        }).catch(() => {});
        
        console.log('Delete request sent on tab close');
      } catch (error) {
        console.error('Failed to send delete request:', error);
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      
      // Также отправляем запрос на удаление при размонтировании компонента
      if (message.auto_delete) {
        handleBeforeUnload();
      }
    };
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

  // Обновляем JSX часть для отображения изображения

  return (
    <div className="min-h-screen bg-black flex flex-col items-center justify-center p-4 relative">
      {/* Фоновый шум остается полупрозрачным для всей страницы */}
      <div className="noise-background absolute top-0 left-0 w-full h-full"></div>

      <div className="max-w-4xl w-full relative z-10">
        <div className="flex justify-center">
          {message.image_url ? (
            <div className="relative">
              {/* Непрозрачный шум непосредственно под картинкой */}
              <div className="solid-noise-background absolute top-0 left-0 w-full h-full"></div>
              
              {/* Эффект размытой границы вокруг картинки */}
              <div className="image-noise-border"></div>
              
              {/* Контейнер для изображения с тенью */}
              <div className="image-container relative">
                <img
                  src={message.image_url}
                  alt="Message content"
                  className="max-w-full max-h-[90vh] object-contain relative z-20"
                  onError={() => setError('Failed to load image')}
                />
              </div>
            </div>
          ) : message.content ? (
            <div className="access-granted-container w-full max-w-2xl relative overflow-hidden rounded-lg">
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
      
      {/* CSS для шумовых эффектов */}
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

        @keyframes noiseAnimation {
          0% { opacity: 0.3; }
          50% { opacity: 0.5; }
          100% { opacity: 0.3; }
        }
        
        /* Полупрозрачный шум для фона страницы */
        .noise-background {
          background-image: url('/noise.gif');
          background-repeat: repeat;
          animation: noise 0.2s infinite alternate, noiseAnimation 3s infinite;
          opacity: 0.4;
          pointer-events: none;
        }
        
        /* Новый класс для непрозрачного шума под картинкой */
        .solid-noise-background {
          background-image: url('/noise.gif');
          background-repeat: repeat;
          opacity: 1; /* Полностью непрозрачный */
          pointer-events: none;
          z-index: 10;
          width: 100%;
          height: 100%;
        }
        
        .image-container {
          position: relative;
          display: inline-block;
          box-shadow: 0 0 30px rgba(255, 0, 255, 0.3);
        }
        
        .image-noise-border {
          position: absolute;
          top: -10px;
          left: -10px;
          right: -10px;
          bottom: -10px;
          background-image: url('/noise.gif');
          background-repeat: repeat;
          z-index: 5;
          pointer-events: none;
          opacity: 0.5;
          border-radius: 10px;
          filter: blur(5px);
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
          background-image: url('/noise.gif');
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