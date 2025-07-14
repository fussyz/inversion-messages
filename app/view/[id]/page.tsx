'use client'

import Image from 'next/image'
import { useState, useEffect } from 'react'
import { use } from 'react'

export default function ViewPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const [message, setMessage] = useState<any>(null)
  const [error, setError] = useState<string>('')

  useEffect(() => {
    async function loadMessage() {
      try {
        const res = await fetch(`/api/read/${id}`)
        if (!res.ok) throw new Error("Message not found")
        const data = await res.json()
        setMessage(data)
      } catch (e: any) {
        setError(e.message || "Error loading message")
      }
    }
    loadMessage()
  }, [id])

  return (
    <div className="min-h-screen w-full flex flex-col items-center justify-center relative overflow-hidden bg-black">
      {/* Фон – noise.gif с возможностью регулировки размера через background-size */}
      <div className="absolute top-0 left-0 w-full h-full z-0 noise-background" />
      
      {/* Контент сообщения */}
      <div className="relative z-10 flex items-center justify-center">
        {error ? (
          <div className="text-white">{error}</div>
        ) : message && message.image_url ? (
          // Если есть изображение, выводим его без лишних обёрток,
          // чтобы отображалась в реальном размере
          <Image
            src={message.image_url}
            alt={`Image for ${id}`}
            width={800}
            height={600}
            className="object-contain"
          />
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
        /* Настройка шума: регулируйте background-size для изменения масштаба шума */
        .noise-background {
          background-image: url('/noise.gif');
          background-repeat: repeat;
          background-size: 200px 200px; /* Измените значения для более мелкого или крупного шума */
          opacity: 1;
          pointer-events: none;
        }
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
      `}</style>
    </div>
  )
}