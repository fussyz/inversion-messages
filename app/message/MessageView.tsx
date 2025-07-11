'use client'
import { useEffect } from 'react'

export default function MessageView({ id, url }:{id:string,url:string}) {
  /* при первом рендере отправляем PUT, чтобы увеличить views */
  useEffect(() => {
    fetch(`/api/read/${id}`, { method: 'PUT' }).catch(() => {})
  }, [id])

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-8 bg-black text-white">
      <h1 className="glitch text-4xl font-mono" data-text="IN:VERSION">
        IN:VERSION
      </h1>

      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={url}
        alt=""
        className="max-h-[80vh] max-w-full object-contain"
      />
    </div>
  )
}
