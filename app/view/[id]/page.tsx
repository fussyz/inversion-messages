'use client'

import { useState, useEffect } from 'react'
import { use } from 'react'
import Head from 'next/head'

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

    const handleBeforeUnload = () => {
      navigator.sendBeacon(`/api/delete/${id}`, JSON.stringify({}))
    }

    window.addEventListener('beforeunload', handleBeforeUnload)

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload)
      fetch(`/api/delete/${id}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
      }).catch(e => console.error('Error deleting message:', e))
    }
  }, [id])

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

  return (
    <>
      <Head>
        <style>{`
          @font-face {
            font-family: 'PPNeueMontrealMono';
            src: url('/fonts/PPNeueMontrealMono-Bold.otf') format('opentype');
            font-weight: bold;
            font-style: normal;
            font-display: swap;
          }
          
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
          backgroundSize: 'auto',
          zIndex: 1000001
        }}></div>
        
        {message?.image_url ? (
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
        ) : (
          <div
            className="access-granted-text"
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              height: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 1000002
            }}
          >
            <div className="access-granted-title">
              {message?.content || ''}
            </div>
          </div>
        )}
      </div>
    </>
  )
}