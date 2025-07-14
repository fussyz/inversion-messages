'use client'

import { useState, useEffect } from 'react'
import { use } from 'react'

export default function ViewPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const [message, setMessage] = useState<any>(null)
  const [error, setError] = useState<string>('')
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    async function loadMessage() {
      try {
        const res = await fetch(`/api/read/${id}`)
        if (!res.ok) throw new Error("Message not found")
        const data = await res.json()
        console.log("API response:", data) // Для отладки
        setMessage(data)
      } catch (e: any) {
        console.error("Error:", e) // Для отладки
        setError(e.message || "Error loading message")
      } finally {
        setLoaded(true)
      }
    }
    loadMessage()

    // Полное перекрытие всей страницы
    document.documentElement.style.backgroundColor = "black"
    document.body.style.backgroundColor = "black"
    
    // Скрываем все элементы на странице
    const hideExistingElements = () => {
      document.body.childNodes.forEach((node: any) => {
        if (node.id !== 'viewpage-container' && node.nodeType === 1) {
          node.style.display = 'none';
        }
      });
    };
    
    // Запускаем несколько раз, чтобы поймать динамически добавляемые элементы
    hideExistingElements();
    setTimeout(hideExistingElements, 100);
    setTimeout(hideExistingElements, 500);
    
    return () => {
      // Восстанавливаем стили при размонтировании
      document.documentElement.style.backgroundColor = ""
      document.body.style.backgroundColor = ""
    }
  }, [id])

  if (!loaded) {
    return (
      <div id="viewpage-container" 
           style={{ 
             position: 'fixed',
             top: 0,
             left: 0,
             width: '100vw', 
             height: '100vh', 
             backgroundColor: 'black',
             zIndex: 10000,
             display: 'flex',
             alignItems: 'center',
             justifyContent: 'center'
           }}>
        <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-purple-500"></div>
      </div>
    );
  }

  return (
    <div id="viewpage-container" 
         style={{ 
           position: 'fixed',
           top: 0,
           left: 0,
           width: '100vw', 
           height: '100vh', 
           backgroundColor: 'black',
           zIndex: 10000,
           overflow: 'hidden'
         }}>
      
      {/* Шумовой фон */}
      <div style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        backgroundImage: 'url(/noise.gif)',
        backgroundRepeat: 'repeat',
        backgroundSize: '100px 100px',
        opacity: 1,
        zIndex: 10001
      }} />
      
      {/* Контейнер для контента */}
      <div style={{
        position: 'relative',
        width: '100%',
        height: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 10002
      }}>
        {error ? (
          <div style={{
            color: 'white',
            backgroundColor: 'rgba(0,0,0,0.7)',
            padding: '1rem',
            borderRadius: '0.375rem'
          }}>
            {error}
          </div>
        ) : message && message.image_url ? (
          // Выводим картинку в максимальном размере
          <img
            src={message.image_url}
            alt={`Image for ${id}`}
            style={{
              maxHeight: '100vh',
              maxWidth: '100vw',
              objectFit: 'contain'
            }}
            onError={() => {
              console.error("Image failed to load");
              setError('Failed to load image');
            }}
          />
        ) : message && message.content ? (
          <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 10003,
            backgroundImage: 'url(/noise.gif)',
            backgroundRepeat: 'repeat'
          }}>
            <div style={{
              backgroundColor: 'rgba(0,0,0,0.85)',
              padding: '2rem 4rem',
              border: '2px solid #ff00ff',
              borderRadius: '8px',
              textAlign: 'center',
              animation: 'glitch 1s infinite'
            }}>
              <div style={{
                fontSize: '3rem',
                fontFamily: '"Courier New", monospace',
                color: '#ff00ff',
                textTransform: 'uppercase',
                marginBottom: '1rem'
              }}>
                ACCESS GRANTED
              </div>
              <div style={{
                fontSize: '1.5rem',
                fontFamily: '"Courier New", monospace',
                color: '#ff00ff'
              }}>
                {message.content}
              </div>
            </div>
          </div>
        ) : (
          <div style={{
            color: 'white',
            backgroundColor: 'rgba(0,0,0,0.7)',
            padding: '1rem',
            borderRadius: '0.375rem'
          }}>
            No message available
          </div>
        )}
      </div>
      
      <style jsx global>{`
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
        
        html, body {
          margin: 0 !important;
          padding: 0 !important;
          overflow: hidden !important;
          background-color: black !important;
        }
      `}</style>
    </div>
  );
}