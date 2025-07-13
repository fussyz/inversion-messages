// app/admin/page.tsx
'use client'

export const dynamic = 'force-dynamic'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@supabase/supabase-js'
import QRCode from 'qrcode'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export default function AdminPage() {
  const [loading, setLoading] = useState(true)
  const [user, setUser] = useState<{ email: string } | null>(null)
  const [messages, setMessages] = useState<any[]>([])
  const [loadingMessages, setLoadingMessages] = useState(false)
  
  // Состояния для загрузки изображений
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [deleteAfterView, setDeleteAfterView] = useState(false)
  const [expirationDays, setExpirationDays] = useState(0)
  const [uploading, setUploading] = useState(false)
  
  // Состояния для модального окна с QR кодом
  const [showQRModal, setShowQRModal] = useState(false)
  const [generatedLink, setGeneratedLink] = useState('')
  const [qrCodeDataURL, setQRCodeDataURL] = useState('')
  
  const router = useRouter()

  useEffect(() => {
    const getUser = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession()
        
        if (error || !session) {
          router.push('/signin')
          return
        }
        
        if (session.user?.email !== 'semoo.smm@gmail.com') {
          router.push('/signin')
          return
        }
        
        if (session.user?.email) {
          setUser({ email: session.user.email })
          loadMessages()
        }
        setLoading(false)
      } catch (error) {
        console.error('Auth error:', error)
        router.push('/signin')
      }
    }

    getUser()
  }, [router])

  const loadMessages = async () => {
    setLoadingMessages(true)
    try {
      const { data, error } = await supabase
        .from('images')
        .select('*')
        .order('created_at', { ascending: false })
      
      if (error) {
        console.error('Error loading images:', error)
      } else {
        setMessages(data || [])
      }
    } catch (error) {
      console.error('Error:', error)
    }
    setLoadingMessages(false)
  }

  const handleFileUpload = async () => {
    if (!selectedFile) {
      alert('Please select a file first')
      return
    }

    setUploading(true)
    try {
      // Генерируем уникальное имя файла
      const fileExt = selectedFile.name.split('.').pop()
      const fileName = `${Math.random().toString(36).substring(2)}.${fileExt}`
      
      // Загружаем файл в Supabase Storage
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('images')
        .upload(fileName, selectedFile)

      if (uploadError) {
        throw uploadError
      }

      // Получаем публичную ссылку
      const { data: urlData } = supabase.storage
        .from('images')
        .getPublicUrl(fileName)

      // Вычисляем дату истечения
      let expiresAt = null
      if (expirationDays > 0) {
        expiresAt = new Date()
        expiresAt.setDate(expiresAt.getDate() + expirationDays)
      }

      // Сохраняем информацию о файле в базе данных
      const { data: dbData, error: dbError } = await supabase
        .from('images')
        .insert({
          filename: fileName,
          original_name: selectedFile.name,
          url: urlData.publicUrl,
          delete_after_view: deleteAfterView,
          expires_at: expiresAt,
          created_at: new Date().toISOString()
        })
        .select()
        .single()

      if (dbError) {
        throw dbError
      }

      // Генерируем ссылку для просмотра
      const viewLink = `${window.location.origin}/view/${dbData.id}`
      
      // Генерируем QR код
      const qrDataURL = await QRCode.toDataURL(viewLink)
      
      setGeneratedLink(viewLink)
      setQRCodeDataURL(qrDataURL)
      setShowQRModal(true)
      
      // Очищаем форму
      setSelectedFile(null)
      setDeleteAfterView(false)
      setExpirationDays(0)
      
      // Обновляем список
      loadMessages()
      
    } catch (error) {
      console.error('Upload error:', error)
      alert('Upload failed: ' + error.message)
    }
    setUploading(false)
  }

  const downloadQRCode = () => {
    const link = document.createElement('a')
    link.href = qrCodeDataURL
    link.download = 'qr-code.png'
    link.click()
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/signin')
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

  return (
    <div className="min-h-screen p-8 bg-black text-purple-500">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-4xl font-bold">Admin Dashboard</h1>
          <button
            onClick={handleLogout}
            className="px-6 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition-colors"
          >
            Sign Out
          </button>
        </div>
        
        {user && (
          <div className="bg-gray-900 p-6 rounded-lg border border-purple-500 mb-8">
            <p className="text-lg mb-2">Welcome to the admin panel!</p>
            <p>Logged in as: <span className="font-mono text-purple-300">{user.email}</span></p>
          </div>
        )}

        {/* Панель загрузки изображений */}
        <div className="bg-gray-900 p-6 rounded-lg border border-purple-500 mb-8">
          <h2 className="text-2xl font-semibold mb-6">Upload Image</h2>
          
          <div className="space-y-4">
            {/* Выбор файла */}
            <div>
              <label className="block text-sm font-medium mb-2">Select Image</label>
              <input
                type="file"
                accept="image/*"
                onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                className="block w-full text-sm text-gray-300 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-purple-600 file:text-white hover:file:bg-purple-700"
              />
            </div>

            {/* Настройки */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    checked={deleteAfterView}
                    onChange={(e) => setDeleteAfterView(e.target.checked)}
                    className="form-checkbox h-4 w-4 text-purple-600"
                  />
                  <span>Delete after opening</span>
                </label>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">
                  Expiration (days, 0 = forever)
                </label>
                <input
                  type="number"
                  min="0"
                  value={expirationDays}
                  onChange={(e) => setExpirationDays(parseInt(e.target.value) || 0)}
                  className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded text-white focus:border-purple-500 focus:outline-none"
                />
              </div>
            </div>

            {/* Кнопка загрузки */}
            <button
              onClick={handleFileUpload}
              disabled={!selectedFile || uploading}
              className="w-full py-3 bg-purple-600 text-white rounded hover:bg-purple-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {uploading ? 'Uploading...' : 'Upload Image'}
            </button>
          </div>
        </div>

        {/* Таблица изображений */}
        <div className="bg-gray-900 p-6 rounded-lg border border-purple-500">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-semibold">Uploaded Images ({messages.length})</h2>
            <button
              onClick={loadMessages}
              disabled={loadingMessages}
              className="px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700 transition-colors disabled:opacity-50"
            >
              {loadingMessages ? 'Loading...' : 'Refresh'}
            </button>
          </div>
          
          {loadingMessages ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-500 mx-auto"></div>
              <p className="mt-2">Loading images...</p>
            </div>
          ) : messages.length === 0 ? (
            <p className="text-gray-400 text-center py-8">No images uploaded yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b border-gray-700">
                    <th className="py-3 px-4 text-purple-300">ID</th>
                    <th className="py-3 px-4 text-purple-300">Filename</th>
                    <th className="py-3 px-4 text-purple-300">Settings</th>
                    <th className="py-3 px-4 text-purple-300">View Link</th>
                    <th className="py-3 px-4 text-purple-300">Created At</th>
                  </tr>
                </thead>
                <tbody>
                  {messages.map((image) => (
                    <tr key={image.id} className="border-b border-gray-800 hover:bg-gray-800 transition-colors">
                      <td className="py-3 px-4 text-purple-200">{image.id}</td>
                      <td className="py-3 px-4 text-white">{image.original_name}</td>
                      <td className="py-3 px-4 text-gray-300">
                        {image.delete_after_view && <span className="text-red-400">Delete after view</span>}
                        {image.expires_at && (
                          <div className="text-yellow-400">
                            Expires: {new Date(image.expires_at).toLocaleDateString()}
                          </div>
                        )}
                        {!image.delete_after_view && !image.expires_at && (
                          <span className="text-green-400">Permanent</span>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        <a 
                          href={`/view/${image.id}`} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="text-blue-400 hover:text-blue-300 underline"
                        >
                          View Image
                        </a>
                      </td>
                      <td className="py-3 px-4 text-gray-300">
                        {new Date(image.created_at).toLocaleString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Модальное окно с QR кодом */}
      {showQRModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-gray-900 p-8 rounded-lg border border-purple-500 max-w-md w-full mx-4">
            <h3 className="text-2xl font-bold mb-6 text-center">Image Uploaded Successfully!</h3>
            
            <div className="text-center mb-6">
              <img src={qrCodeDataURL} alt="QR Code" className="mx-auto mb-4" />
              <button
                onClick={downloadQRCode}
                className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 transition-colors"
              >
                Download QR Code
              </button>
            </div>
            
            <div className="mb-6">
              <label className="block text-sm font-medium mb-2">View Link:</label>
              <input
                type="text"
                value={generatedLink}
                readOnly
                className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded text-white focus:border-purple-500 focus:outline-none"
                onClick={(e) => e.target.select()}
              />
            </div>
            
            <button
              onClick={() => setShowQRModal(false)}
              className="w-full py-3 bg-purple-600 text-white rounded hover:bg-purple-700 transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
