'use client'

import { useState, useEffect } from 'react'
import { use } from 'react'
import Head from 'next/head'

export default function ViewPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const [message, setMessage] = useState<any>(null)
  const [error, setError] = useState<string>('')
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    // Добавляем черный overlay на всю страницу
    const overlay = document.createElement('div')
    overlay.id = 'black-overlay'
    overlay.style.position = 'fixed'
    overlay.style.top = '0'
    overlay.style.left = '0'
    overlay.style.width = '100%'
    overlay.style.height = '100%'
    overlay.style.backgroundColor = 'black'
    overlay.style.zIndex = '999999'
    document.body.appendChild(overlay)
    
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
    
    return () => {
      // Удаляем overlay при размонтировании
      const overlayElement = document.getElementById('black-overlay')
      if (overlayElement) document.body.removeChild(overlayElement)
    }
  }, [id])

  if (!loaded) {
    return (
      <div style={{ 
           position: 'fixed',
           top: 0,
           left: 0,
           width: '100vw', 
           height: '100vh', 
           backgroundColor: 'black',
           zIndex: 1000000,
           display: 'flex',
           alignItems: 'center',
           justifyContent: 'center'
         }}>
        <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-purple-500"></div>
      </div>
    )
  }

  if (error) {
    return (
      <div style={{ 
           position: 'fixed',
           top: 0,
           left: 0,
           width: '100vw', 
           height: '100vh', 
           backgroundColor: 'black',
           zIndex: 1000000,
           display: 'flex',
           alignItems: 'center',
           justifyContent: 'center'
         }}>
        <div style={{
          color: 'white',
          padding: '1rem',
          textAlign: 'center'
        }}>
          {error}
        </div>
      </div>
    )
  }

  if (message?.image_url) {
    return (
      <>
        <Head>
          <style>{`
            body { 
              background-color: black !important;
              margin: 0 !important;
              padding: 0 !important;
              overflow: hidden !important;
            }
          `}</style>
        </Head>
        
        <div style={{ 
             position: 'fixed',
             top: 0,
             left: 0,
             width: '100vw', 
             height: '100vh', 
             backgroundColor: 'black',
             zIndex: 1000000
           }}>
          <div style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            backgroundImage: 'url(/noise.gif)',
            backgroundRepeat: 'repeat',
            backgroundSize: 'auto', // Измените на 'auto' для оригинального размера
            zIndex: 1000001
          }}></div>
          
          <div style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000002
          }}>
            <img 
              src={message.image_url}
              alt="Image"
              style={{
                maxWidth: '100%',
                maxHeight: '100vh'
              }}
            />
          </div>
        </div>
      </>
    )
  }

  return (
    <div style={{ 
         position: 'fixed',
         top: 0,
         left: 0,
         width: '100vw', 
         height: '100vh', 
         backgroundColor: 'black',
         zIndex: 1000000
       }}>
      <div style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        backgroundImage: 'url(/noise.gif)',
        backgroundRepeat: 'repeat',
        backgroundSize: 'auto', // Измените на 'auto' для оригинального размера
        zIndex: 1000001
      }}></div>
      
      <div style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000002
      }}>
        <div style={{
          backgroundColor: 'rgba(0,0,0,0.85)',
          padding: '2rem 4rem',
          border: '2px solid #ff00ff',
          borderRadius: '8px',
          textAlign: 'center'
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
            {message?.content || 'No content available'}
          </div>
        </div>
      </div>
    </div>
  )
}