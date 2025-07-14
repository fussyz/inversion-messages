'use client'

import Image from 'next/image'
import { useState, useEffect } from 'react'
import { use } from 'react'

export default function ViewPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const [message, setMessage] = useState<any>(null)
  const [error, setError] = useState<string>('')

  // Пример загрузки сообщения (замените на реальные данные с API)
  useEffect(() => {
    // Симуляция загрузки: если есть image_url – выводим картинку, иначе текст
    setMessage({
      id,
      // Для теста можно задавать либо content, либо image_url.
      // Для текстового сообщения:
      content: "Пример текста сообщения",
      // Для сообщения с картинкой, раскомментируйте строку ниже:
      // image_url: '/test-image.png'
    })
  }, [id])

  return (
    <div className="min-h-screen w-full flex flex-col items-center justify-center relative overflow-hidden bg-black">
      {/* Фон – noise.gif на всю страницу */}
      <div className="absolute top-0 left-0 w-full h-full z-0">
        <Image
          src="/noise.gif"
          alt="Noise background"
          fill
          className="object-cover opacity-100 pointer-events-none"
        />
      </div>
      
      {/* Контент сообщения */}
      <div className="relative z-10">
        {message && message.image_url ? (
          // Если есть изображение, выводим именно его внутри контейнера
          <div className="message-container">
            <Image
              src={message.image_url}
              alt={`Image for ${id}`}
              width={800}
              height={600}
              className="object-contain rounded"
            />
          </div>
        ) : message && message.content ? (
          // Если сообщение текстовое, используем стиль ACCESS GRANTED
          <div className="access-granted-overlay">
            <div className="access-granted-text">
              <div className="access-granted-title">ACCESS GRANTED</div>
              <div className="access-granted-subtitle">{message.content}</div>
            </div>
          </div>
        ) : (
          <div className="text-white">No message available</div>
        )}
      </div>
      
      <style jsx global>{`
        .access-granted-overlay {
          display: flex;
          position: fixed;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          background-image: url('/noise.gif');
          background-repeat: repeat;
          align-items: center;
          justify-content: center;
          z-index: 10;
        }
        .access-granted-text {
          background: rgba(0, 0, 0, 0.85);
          padding: 2rem 4rem;
          border: 2px solid #ff00ff;
          border-radius: 8px;
          text-align: center;
          animation: glitch 1s infinite;
        }
        .access-granted-title {
          font-size: 3rem;
          font-family: 'Courier New', monospace;
          color: #ff00ff;
          text-transform: uppercase;
          margin-bottom: 1rem;
        }
        .access-granted-subtitle {
          font-size: 1.5rem;
          font-family: 'Courier New', monospace;
          color: #ff00ff;
        }
        @keyframes glitch {
          0% { clip: rect(42px, 9999px, 44px, 0); transform: skew(0.5deg); }
          5% { clip: rect(5px, 9999px, 94px, 0); transform: skew(0.8deg); }
          10% { clip: rect(70px, 9999px, 85px, 0); transform: skew(1deg); }
          15% { clip: rect(15px, 9999px, 100px, 0); transform: skew(0.5deg); }
          20% { clip: rect(65px, 9999px, 30px, 0); transform: skew(0.8deg); }
          25% { clip: rect(45px, 9999px, 60px, 0); transform: skew(1deg); }
          30% { clip: rect(80px, 9999px, 50px, 0); transform: skew(0.5deg); }
          35% { clip: rect(30px, 9999px, 75px, 0); transform: skew(0.8deg); }
          40% { clip: rect(50px, 9999px, 68px, 0); transform: skew(1deg); }
          100% { clip: rect(42px, 9999px, 44px, 0); transform: skew(0.5deg); }
        }
        .message-container {
          padding: 10px;
          background-color: rgba(0, 0, 0, 0.4);
          border: 2px solid #ff00ff;
          border-radius: 8px;
          box-shadow: 0 0 20px rgba(255, 0, 255, 0.3);
        }
      `}</style>
    </div>
  )
}