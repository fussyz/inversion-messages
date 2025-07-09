'use client'
import { useEffect } from 'react'

export default function MessageView({ id, url }: { id: string; url: string }) {
  // один запрос на отметку/удаление
  useEffect(() => {
    fetch(`/api/read/${id}`, { method: 'PUT' }).catch(() => {})
  }, [id])

  return (
    <div style={{
      background:'#000',
      minHeight:'100vh',
      display:'flex',
      justifyContent:'center',
      alignItems:'center',
      padding:'1rem'
    }}>
      <img
        src={url}
        alt=""
        style={{
          maxWidth:'100%',
          maxHeight:'100vh',
          objectFit:'contain',
          boxShadow:'0 0 20px #fff'
        }}
      />
    </div>
  )
}
