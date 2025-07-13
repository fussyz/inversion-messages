'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@supabase/supabase-js'
import { useParams } from 'next/navigation'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export default function ViewImagePage() {
  const [loading, setLoading] = useState(true)
  const [image, setImage] = useState<any>(null)
  const [error, setError] = useState('')
  const [countdown, setCountdown] = useState<number | null>(null)
  const params = useParams()
  const id = params.id

  useEffect(() => {
    if (id) {
      loadImage()
    }
  }, [id])

  useEffect(() => {
    let interval: NodeJS.Timeout
    if (countdown !== null && countdown > 0) {
      interval = setInterval(() => {
        setCountdown(prev => {
          if (prev && prev <= 1) {
            deleteImage()
            return 0
          }
          return prev ? prev - 1 : 0
        })
      }, 1000)
    }
    return () => clearInterval(interval)
  }, [countdown])

  const loadImage = async () => {
    try {
      // Получаем IP адрес пользователя
      const response = await fetch('/api/get-ip')
      const { ip } = await response.json()

      // Загружаем информацию об изображении
      const { data: imageData, error: fetchError } = await supabase
        .from('images')
        .select('*')
        .eq('id', id)
        .single()

      if (fetchError || !imageData) {
        setError('Image not found')
        setLoading(false)
        return
      }

      // Проверяем не истек ли срок действия
      if (imageData.expires_at && new Date(imageData.expires_at) < new Date()) {
        setError('Image has expired')
        setLoading(false)
        return
      }

      // Проверяем не было ли уже просмотрено (если включено удаление после просмотра)
      if (imageData.viewed_at && imageData.delete_after_view) {
        setError('Image has already been viewed and deleted')
        setLoading(false)
        return
      }

      setImage(imageData)

      // Обновляем информацию о просмотре
      await supabase
        .from('images')
        .update({
          viewed_at: new Date().toISOString(),
          viewer_ip: ip
        })
        .eq('id', id)

      // Если включено удаление после просмотра, запускаем обратный отсчет
      if (imageData.delete_after_view) {
        setCountdown(10) // 10 секунд на просмотр
      }

      setLoading(false)
    } catch (error) {
      console.error('Error loading image:', error)
      setError('Failed to load image')
      setLoading(false)
    }
  }

  const deleteImage = async () => {
    if (!image) return

    try {
      // Удаляем файл из storage
      await supabase.storage
        .from('images')
        .remove([image.filename])

      // Удаляем запись из базы данных
      await supabase
        .from('images')
        .delete()
        .eq('id', image.id)

      setError('Image has been deleted after viewing')
    } catch (error) {
      console.error('Error deleting image:', error)
    }
  }

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-purple-500"></div>
          <p className="mt-4 text-purple-500">Loading image...</p>
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
    <div className="min-h-screen bg-black flex flex-col items-center justify-center p-4">
      {countdown !== null && countdown > 0 && (
        <div className="fixed top-4 right-4 bg-red-600 text-white px-4 py-2 rounded-lg z-50">
          <p className="font-bold">This image will be deleted in:</p>
          <p className="text-2xl text-center">{formatTime(countdown)}</p>
        </div>
      )}

      <div className="max-w-4xl w-full">
        <div className="text-center mb-6">
          <h1 className="text-3xl font-bold text-purple-500 mb-2">
            {image.original_name}
          </h1>
          {image.delete_after_view && (
            <p className="text-red-400">⚠️ This image will be deleted after viewing</p>
          )}
          {image.expires_at && (
            <p className="text-yellow-400">
              Expires: {new Date(image.expires_at).toLocaleString()}
            </p>
          )}
        </div>

        <div className="flex justify-center">
          <img
            src={image.url}
            alt={image.original_name}
            className="max-w-full max-h-[80vh] object-contain rounded-lg border border-purple-500"
            onError={() => setError('Failed to load image')}
          />
        </div>
      </div>
    </div>
  )
}