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
  const [showQRModal, setShowQRModal] = useState(false) // Убедись что false
  const [generatedLink, setGeneratedLink] = useState('')
  const [qrCodeDataURL, setQRCodeDataURL] = useState('')
  const [modalTitle, setModalTitle] = useState('')
  
  const router = useRouter()

  useEffect(() => {
    const getUser = async () => {
      try {
        // Принудительно закрываем модал при загрузке страницы
        setShowQRModal(false)
        
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
        .from('messages')
        .select('*')
        .order('created_at', { ascending: false })
      
      if (error) {
        console.error('Error loading messages:', error)
      } else {
        console.log('Loaded data from messages table:', data)
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
      console.log('=== UPLOAD START ===')
      console.log('File:', selectedFile.name, selectedFile.size, selectedFile.type)

      // Генерируем уникальное имя файла
      const fileExt = selectedFile.name.split('.').pop()
      const fileName = `images/${Math.random().toString(36).substring(2)}-${Date.now()}.${fileExt}`
      
      console.log('Generated filename:', fileName)
      
      // Загружаем файл в Supabase Storage
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('images')
        .upload(fileName, selectedFile, {
          cacheControl: '3600',
          upsert: false
        })

      console.log('Storage upload result:', { uploadData, uploadError })

      if (uploadError) {
        console.error('Storage upload error:', uploadError)
        throw new Error(`Storage upload failed: ${uploadError.message}`)
      }

      // Получаем публичную ссылку (signed URL как у тебя)
      const { data: urlData, error: urlError } = await supabase.storage
        .from('images')
        .createSignedUrl(fileName, 315360000) // 10 лет

      console.log('Signed URL result:', { urlData, urlError })

      if (urlError || !urlData) {
        throw new Error(`Failed to create signed URL: ${urlError?.message}`)
      }

      // Вычисляем дату истечения
      let expireAt = null
      if (expirationDays > 0) {
        expireAt = new Date()
        expireAt.setDate(expireAt.getDate() + expirationDays)
      }

      // Сохраняем в таблицу messages
      const insertData = {
        image_url: urlData.signedUrl,
        auto_delete: deleteAfterView,
        expire_at: expireAt?.toISOString() || null,
        days_to_live: expirationDays > 0 ? expirationDays : null,
        views: 0,
        is_read: false
        // Убираем created_at - пусть база сама ставит
      }

      console.log('=== INSERTING TO DATABASE ===')
      console.log('Insert data:', insertData)

      const { data: dbData, error: dbError } = await supabase
        .from('messages')
        .insert(insertData)
        .select()
        .single()

      console.log('DB insert result:', { dbData, dbError })

      if (dbError) {
        console.error('DB insert error details:', dbError)
        throw new Error(`Database insert failed: ${dbError.message || JSON.stringify(dbError)}`)
      }

      // Генерируем ссылку для просмотра
      const viewLink = `${window.location.origin}/view/${dbData.id}`
      
      // Генерируем QR код
      const qrDataURL = await QRCode.toDataURL(viewLink)
      
      setGeneratedLink(viewLink)
      setQRCodeDataURL(qrDataURL)
      setModalTitle('Image Uploaded Successfully!')
      setShowQRModal(true)
      
      // Очищаем форму
      setSelectedFile(null)
      setDeleteAfterView(false)
      setExpirationDays(0)
      
      // Обновляем список
      loadMessages()
      console.log('=== UPLOAD COMPLETE ===')
      
    } catch (error: any) {
      console.error('=== UPLOAD FAILED ===')
      console.error('Full error object:', error)
      console.error('Error message:', error.message)
      alert(`Upload failed: ${error.message || 'Unknown error'}`)
    }
    setUploading(false)
  }

  const showQRForImage = async (imageId: number) => {
    const viewLink = `${window.location.origin}/view/${imageId}`
    const qrDataURL = await QRCode.toDataURL(viewLink)
    
    setGeneratedLink(viewLink)
    setQRCodeDataURL(qrDataURL)
    setModalTitle('QR Code for Image')
    setShowQRModal(true)
  }

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text)
      alert('Link copied to clipboard!')
    } catch (error) {
      console.error('Failed to copy:', error)
    }
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

  // ДОБАВЬ функция удаления после copyToClipboard:

  const deleteRecord = async (id: number) => {
    if (!confirm('Are you sure you want to delete this record?')) {
      return
    }

    try {
      const { error } = await supabase
        .from('messages')
        .delete()
        .eq('id', id)

      if (error) {
        console.error('Delete error:', error)
        alert('Failed to delete record')
      } else {
        alert('Record deleted successfully')
        loadMessages() // Обновляем список
      }
    } catch (error) {
      console.error('Delete error:', error)
      alert('Failed to delete record')
    }
  }

  // ДОБАВЬ также функцию для принудительного закрытия модала:

  const forceCloseModal = () => {
    setShowQRModal(false)
    setGeneratedLink('')
    setQRCodeDataURL('')
    setModalTitle('')
  }

  // И добавь escape key listener
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        forceCloseModal()
      }
    }

    document.addEventListener('keydown', handleEscape)
    return () => document.removeEventListener('keydown', handleEscape)
  }, [])

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
            <div>
              <label className="block text-sm font-medium mb-2">Select Image</label>
              <input
                type="file"
                accept="image/*"
                onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                className="block w-full text-sm text-gray-300 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-purple-600 file:text-white hover:file:bg-purple-700"
              />
            </div>

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

            <button
              onClick={handleFileUpload}
              disabled={!selectedFile || uploading}
              className="w-full py-3 bg-purple-600 text-white rounded hover:bg-purple-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {uploading ? 'Uploading...' : 'Upload Image'}
            </button>
          </div>
        </div>

        {/* Единая таблица для всех записей из messages */}
        <div className="bg-gray-900 p-6 rounded-lg border border-purple-500">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-semibold">All Records ({messages.length})</h2>
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
              <p className="mt-2">Loading records...</p>
            </div>
          ) : messages.length === 0 ? (
            <p className="text-gray-400 text-center py-8">No records yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b border-gray-700">
                    <th className="py-3 px-4 text-purple-300">ID</th>
                    <th className="py-3 px-4 text-purple-300">Preview</th>
                    <th className="py-3 px-4 text-purple-300">Content</th>
                    <th className="py-3 px-4 text-purple-300">Settings</th>
                    <th className="py-3 px-4 text-purple-300">QR Code</th>
                    <th className="py-3 px-4 text-purple-300">IP Address</th>
                    <th className="py-3 px-4 text-purple-300">Stats</th>
                    <th className="py-3 px-4 text-purple-300">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {messages.map((record) => (
                    <tr key={record.id} className="border-b border-gray-800 hover:bg-gray-800 transition-colors">
                      {/* ID - гиперссылка */}
                      <td className="py-3 px-4 text-purple-200">
                        {record.image_url ? (
                          <a 
                            href={`/view/${record.id}`} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="text-blue-400 hover:text-blue-300 underline font-bold"
                          >
                            #{record.id}
                          </a>
                        ) : (
                          <span className="font-bold">#{record.id}</span>
                        )}
                      </td>
                      
                      {/* Preview - превью картинки */}
                      <td className="py-3 px-4">
                        {record.image_url ? (
                          <div className="w-16 h-16 border border-purple-500 rounded overflow-hidden">
                            <img 
                              src={record.image_url} 
                              alt="Preview" 
                              className="w-full h-full object-cover cursor-pointer hover:scale-110 transition-transform"
                              onClick={() => window.open(record.image_url, '_blank')}
                            />
                          </div>
                        ) : record.content ? (
                          <div className="w-16 h-16 border border-purple-500 rounded flex items-center justify-center bg-gray-800">
                            <span className="text-blue-400 text-2xl">💬</span>
                          </div>
                        ) : (
                          <div className="w-16 h-16 border border-gray-600 rounded flex items-center justify-center bg-gray-800">
                            <span className="text-gray-400 text-2xl">❓</span>
                          </div>
                        )}
                      </td>
                      
                      {/* Content - только текст, если есть */}
                      <td className="py-3 px-4">
                        {record.content ? (
                          <div className="max-w-xs truncate text-white" title={record.content}>
                            {record.content}
                          </div>
                        ) : record.image_url ? (
                          <span className="text-green-400">🖼️ Image file</span>
                        ) : (
                          <span className="text-gray-500">No content</span>
                        )}
                      </td>
                      
                      {/* Settings */}
                      <td className="py-3 px-4 text-gray-300">
                        {record.auto_delete && <div className="text-red-400">🗑️ Delete after view</div>}
                        {record.expire_at && (
                          <div className="text-yellow-400">
                            ⏰ Expires: {new Date(record.expire_at).toLocaleDateString()}
                          </div>
                        )}
                        {record.days_to_live && (
                          <div className="text-gray-400">
                            📅 Days: {record.days_to_live}
                          </div>
                        )}
                        {!record.auto_delete && !record.expire_at && (
                          <span className="text-green-400">♾️ Permanent</span>
                        )}
                      </td>
                      
                      {/* QR Code */}
                      <td className="py-3 px-4">
                        {record.image_url && (
                          <button
                            onClick={() => showQRForImage(record.id)}
                            className="px-3 py-2 bg-green-600 text-white rounded hover:bg-green-700 transition-colors text-sm font-semibold"
                          >
                            📱 Show QR
                          </button>
                        )}
                      </td>
                      
                      {/* IP Address */}
                      <td className="py-3 px-4 text-gray-300">
                        {record.client_ip && (
                          <div className="font-mono text-sm">🌐 {record.client_ip}</div>
                        )}
                        {record.ip_address && (
                          <div className="font-mono text-sm">🌐 {record.ip_address}</div>
                        )}
                        {!record.client_ip && !record.ip_address && (
                          <span className="text-gray-500">No IP</span>
                        )}
                      </td>
                      
                      {/* Stats */}
                      <td className="py-3 px-4 text-gray-300 text-sm">
                        <div>👁️ Views: {record.views || 0}</div>
                        <div>📅 {new Date(record.created_at).toLocaleDateString()}</div>
                        {record.last_read_at && (
                          <div>👀 {new Date(record.last_read_at).toLocaleDateString()}</div>
                        )}
                        {record.is_read && (
                          <div className="text-green-400">✅ Read</div>
                        )}
                      </td>
                      
                      {/* Actions - кнопки */}
                      <td className="py-3 px-4 space-y-1">
                        {record.image_url && (
                          <button
                            onClick={() => copyToClipboard(`${window.location.origin}/view/${record.id}`)}
                            className="block w-full px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors text-sm"
                          >
                            📋 Copy Link
                          </button>
                        )}
                        <button
                          onClick={() => deleteRecord(record.id)}
                          className="block w-full px-3 py-1 bg-red-600 text-white rounded hover:bg-red-700 transition-colors text-sm"
                        >
                          🗑️ Delete
                        </button>
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
      {showQRModal && qrCodeDataURL && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4"
          onClick={forceCloseModal}
        >
          <div 
            className="bg-gradient-to-br from-gray-900 to-gray-800 p-8 rounded-2xl border-2 border-purple-500 shadow-2xl max-w-md w-full mx-4 relative"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Кнопка закрытия */}
            <button
              onClick={forceCloseModal}
              className="absolute top-4 right-4 text-gray-400 hover:text-white text-2xl font-bold hover:bg-gray-700 rounded-full w-8 h-8 flex items-center justify-center transition-colors"
            >
              ✕
            </button>
            
            {/* Заголовок */}
            <div className="text-center mb-6">
              <h3 className="text-2xl font-bold text-purple-400 mb-2">{modalTitle}</h3>
              <div className="w-16 h-1 bg-purple-500 mx-auto rounded"></div>
            </div>
            
            {/* QR код */}
            <div className="text-center mb-6">
              <div className="bg-white p-4 rounded-lg inline-block shadow-lg">
                <img 
                  src={qrCodeDataURL} 
                  alt="QR Code" 
                  className="w-48 h-48 block max-w-full max-h-full"
                />
              </div>
              <p className="text-gray-300 mt-3 text-sm">Scan with your phone camera</p>
            </div>
            
            {/* Кнопки */}
            <div className="space-y-3">
              <button
                onClick={downloadQRCode}
                className="w-full py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-semibold flex items-center justify-center gap-2"
              >
                💾 Download QR Code
              </button>
              
              <div className="relative">
                <input
                  type="text"
                  value={generatedLink}
                  readOnly
                  className="w-full px-4 py-3 bg-gray-800 border border-gray-600 rounded-lg text-white focus:border-purple-500 focus:outline-none cursor-pointer text-sm"
                  onClick={(e) => {
                    (e.target as HTMLInputElement).select()
                    copyToClipboard(generatedLink)
                  }}
                />
                <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                  <span className="text-purple-400 text-xs">📋 Click to copy</span>
                </div>
              </div>
              
              <button
                onClick={forceCloseModal}
                className="w-full py-3 bg-gray-700 text-white rounded-lg hover:bg-gray-600 transition-colors font-semibold"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// Выполни in Supabase SQL Editor:
// CREATE TABLE images (
//   id SERIAL PRIMARY KEY,
//   filename TEXT NOT NULL,
//   original_name TEXT NOT NULL,
//   url TEXT NOT NULL,
//   delete_after_view BOOLEAN DEFAULT FALSE,
//   expires_at TIMESTAMP,
//   viewed_at TIMESTAMP,
//   viewer_ip TEXT,
//   created_at TIMESTAMP DEFAULT NOW()
// );

// Проверь что bucket существует:
// SELECT * FROM storage.buckets WHERE id = 'images';

// Если bucket не существует, создай:
// INSERT INTO storage.buckets (id, name, public) VALUES ('images', 'images', true);

// Добавь политики безопасности:
// CREATE POLICY "Allow authenticated uploads" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'images');
// CREATE POLICY "Allow public access" ON storage.objects FOR SELECT USING (bucket_id = 'images');
