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
      {/* Основной фон страницы с шумом (оставляем как есть) */}
      <div className="noise-background absolute top-0 left-0 w-full h-full"></div>
      
      {/* Новый контейнер для изображения с рамкой в стиле терминала */}
      <div className="max-w-5xl w-full relative z-10">
        <div className="terminal-container p-1 md:p-2">
          {/* Верхняя панель терминала */}
          <div className="terminal-header px-4 py-2">
            <div className="flex items-center justify-between">
              <div className="terminal-title text-pink-500 glitch-text text-sm md:text-base">
                // INVERSION_VIEWER.EXE
              </div>
              <div className="terminal-status text-xs text-green-400 font-mono">
                TRANSMISSION SECURE
              </div>
            </div>
          </div>
          
          {/* Контейнер для изображения */}
          <div className="terminal-body p-1 md:p-2 relative">
            {/* Внутренний слой шума за изображением */}
            <div className="solid-noise-background absolute top-0 left-0 w-full h-full"></div>
            
            {/* Рамка с анимированными линиями вокруг изображения */}
            <div className="animated-border"></div>
            
            {/* Само изображение */}
            {message.image_url ? (
              <div className="image-display-container">
                <img
                  src={message.image_url}
                  alt="Message content"
                  className="max-w-full max-h-[75vh] object-contain relative z-20"
                  onError={() => setError('Failed to load image')}
                />
                
                {/* Угловые декоративные элементы */}
                <div className="corner-element top-left"></div>
                <div className="corner-element top-right"></div>
                <div className="corner-element bottom-left"></div>
                <div className="corner-element bottom-right"></div>
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
          
          {/* Нижняя панель терминала */}
          <div className="terminal-footer px-4 py-2">
            <div className="flex items-center justify-between">
              <div className="text-xs text-blue-400 font-mono">
                ID: {id?.substring(0, 12)}...
              </div>
              <div className="terminal-indicator pulsing"></div>
            </div>
          </div>
        </div>
      </div>
      
      {/* Стили для нового дизайна */}
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
        
        @keyframes borderFlicker {
          0% { border-color: rgba(255, 0, 255, 0.5); }
          25% { border-color: rgba(0, 255, 255, 0.5); }
          50% { border-color: rgba(255, 0, 255, 0.8); }
          75% { border-color: rgba(0, 255, 255, 0.8); }
          100% { border-color: rgba(255, 0, 255, 0.5); }
        }
        
        @keyframes pulseOpacity {
          0% { opacity: 0.7; }
          50% { opacity: 1; }
          100% { opacity: 0.7; }
        }
        
        @keyframes scanline {
          0% { transform: translateY(0); }
          100% { transform: translateY(100%); }
        }
        
        .noise-background {
          background-image: url('/noise.gif');
          background-repeat: repeat;
          animation: noise 0.2s infinite alternate;
          opacity: 0.4;
          pointer-events: none;
        }
        
        .solid-noise-background {
          background-image: url('/noise.gif');
          background-repeat: repeat;
          opacity: 0.9;
          pointer-events: none;
          z-index: 10;
        }
        
        .terminal-container {
          background-color: rgba(5, 5, 15, 0.9);
          border: 1px solid rgba(255, 0, 255, 0.5);
          border-radius: 8px;
          box-shadow: 
            0 0 20px rgba(255, 0, 255, 0.3),
            0 0 40px rgba(0, 0, 0, 0.6);
          overflow: hidden;
          animation: borderFlicker 3s infinite alternate;
        }
        
        .terminal-header, .terminal-footer {
          background-color: rgba(10, 10, 25, 0.9);
          border-bottom: 1px solid rgba(255, 0, 255, 0.3);
          font-family: monospace;
        }
        
        .terminal-footer {
          border-top: 1px solid rgba(255, 0, 255, 0.3);
          border-bottom: none;
        }
        
        .terminal-title {
          font-weight: bold;
          letter-spacing: 1px;
        }
        
        .terminal-body {
          background-color: rgba(0, 0, 0, 0.7);
          min-height: 300px;
          display: flex;
          align-items: center;
          justify-content: center;
          position: relative;
          overflow: hidden;
        }
        
        .terminal-body::before {
          content: "";
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          height: 2px;
          background: rgba(255, 255, 255, 0.1);
          opacity: 0.5;
          z-index: 25;
          animation: scanline 4s linear infinite;
          pointer-events: none;
        }
        
        .terminal-indicator {
          width: 12px;
          height: 12px;
          background-color: #0f0;
          border-radius: 50%;
        }
        
        .pulsing {
          animation: pulseOpacity 2s infinite;
        }
        
        .image-display-container {
          position: relative;
          padding: 20px;
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 15;
          border: 1px solid rgba(0, 255, 255, 0.2);
        }
        
        .corner-element {
          position: absolute;
          width: 20px;
          height: 20px;
          border-style: solid;
          border-color: rgba(0, 255, 255, 0.6);
          z-index: 30;
        }
        
        .top-left {
          top: 0;
          left: 0;
          border-width: 2px 0 0 2px;
        }
        
        .top-right {
          top: 0;
          right: 0;
          border-width: 2px 2px 0 0;
        }
        
        .bottom-left {
          bottom: 0;
          left: 0;
          border-width: 0 0 2px 2px;
        }
        
        .bottom-right {
          bottom: 0;
          right: 0;
          border-width: 0 2px 2px 0;
        }
        
        .animated-border {
          position: absolute;
          top: 10px;
          bottom: 10px;
          left: 10px;
          right: 10px;
          border: 1px dashed rgba(0, 255, 255, 0.3);
          z-index: 12;
          pointer-events: none;
        }
        
        .glitch-text {
          font-family: monospace;
          animation: textShadowFlicker 3s infinite alternate;
          color: #ff00ff;
          font-weight: bold;
          letter-spacing: 1px;
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
      `}</style>
    </div>
  )
}