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

  const showQRForImage = async (imageId: string) => { // Изменили тип с number на string
    try {
      const viewLink = `${window.location.origin}/view/${imageId}`
      const qrDataURL = await QRCode.toDataURL(viewLink, {
        width: 256,
        margin: 2,
        color: {
          dark: '#000000',
          light: '#FFFFFF'
        }
      })
      
      setGeneratedLink(viewLink)
      setQRCodeDataURL(qrDataURL)
      setModalTitle(`QR Code for Image ${imageId}`)
      setShowQRModal(true)
    } catch (error) {
      console.error('Error generating QR code:', error)
      alert('Failed to generate QR code')
    }
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

  const deleteRecord = async (id: string) => { // Изменили тип с number на string
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
        loadMessages()
      }
    } catch (error) {
      console.error('Delete error:', error)
      alert('Failed to delete record')
    }
  }

  const forceCloseModal = () => {
    setShowQRModal(false)
    setGeneratedLink('')
    setQRCodeDataURL('')
    setModalTitle('')
  }

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
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-purple-900 text-white">
      {/* Фоновые элементы */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl"></div>
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-pink-500/10 rounded-full blur-3xl"></div>
      </div>
      
      <div className="relative z-10 max-w-7xl mx-auto p-8">
        {/* Заголовок */}
        <div className="flex justify-between items-center mb-12">
          <div>
            <h1 className="text-5xl font-bold bg-gradient-to-r from-purple-400 via-pink-400 to-purple-400 bg-clip-text text-transparent mb-2">
              Admin Dashboard
            </h1>
            <p className="text-gray-400 text-lg">Manage your inversion messages</p>
          </div>
          <button
            onClick={handleLogout}
            className="px-8 py-3 bg-gradient-to-r from-red-600 to-red-700 text-white rounded-xl hover:from-red-700 hover:to-red-800 transition-all duration-200 font-semibold shadow-lg hover:scale-105"
          >
            Sign Out
          </button>
        </div>
        {/* Welcome блок */}
        {user && (
          <div className="bg-gray-900/50 backdrop-blur-sm p-8 rounded-2xl border border-purple-500/30 mb-12 shadow-2xl">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full flex items-center justify-center">
                <span className="text-xl">👋</span>
              </div>
              <div>
                <p className="text-xl font-semibold text-purple-300">Welcome to the admin panel!</p>
                <p className="text-gray-400">Logged in as: <span className="font-mono text-purple-400">{user.email}</span></p>
              </div>
            </div>
          </div>
        )}

        {/* Панель загрузки изображений */}
        <div className="bg-gray-900/50 backdrop-blur-sm p-8 rounded-2xl border border-purple-500/30 mb-12 shadow-2xl">
          <div className="flex items-center gap-4 mb-8">
            <div className="w-12 h-12 bg-gradient-to-r from-purple-500 to-pink-500 rounded-xl flex items-center justify-center">
              <span className="text-xl">📤</span>
            </div>
            <h2 className="text-3xl font-bold text-purple-300">Upload Image</h2>
          </div>
          
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 space-y-6">
              <div>
                <label className="block text-lg font-semibold mb-3 text-purple-300">Select Image</label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                  className="block w-full text-gray-300 file:mr-4 file:py-3 file:px-6 file:rounded-xl file:border-0 file:text-base file:font-semibold file:bg-gradient-to-r file:from-purple-600 file:to-pink-600 file:text-white hover:file:from-purple-700 hover:file:to-pink-700 file:transition-all file:duration-200 file:shadow-lg"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-gray-800/50 p-6 rounded-xl border border-purple-500/20">
                  <label className="flex items-center space-x-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={deleteAfterView}
                      onChange={(e) => setDeleteAfterView(e.target.checked)}
                      className="w-5 h-5 text-purple-600 bg-gray-700 border-purple-500 rounded focus:ring-purple-500"
                    />
                    <span className="text-lg font-medium">🗑️ Delete after opening</span>
                  </label>
                </div>

                <div className="bg-gray-800/50 p-6 rounded-xl border border-purple-500/20">
                  <label className="block text-lg font-semibold mb-3 text-purple-300">
                    ⏰ Expiration (days, 0 = forever)
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={expirationDays}
                    onChange={(e) => setExpirationDays(parseInt(e.target.value) || 0)}
                    className="w-full px-4 py-3 bg-gray-700 border border-purple-500/30 rounded-xl text-white focus:border-purple-400 focus:outline-none text-lg"
                  />
                </div>
              </div>
            </div>

            <div className="flex items-end">
              <button
                onClick={handleFileUpload}
                disabled={!selectedFile || uploading}
                className="w-full py-4 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-xl hover:from-purple-700 hover:to-pink-700 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed font-semibold text-lg shadow-lg hover:scale-105 disabled:hover:scale-100"
              >
                {uploading ? (
                  <div className="flex items-center justify-center gap-3">
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                    Uploading...
                  </div>
                ) : (
                  <div className="flex items-center justify-center gap-3">
                    🚀 Upload Image
                  </div>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Таблица записей */}
        <div className="bg-gray-900/50 backdrop-blur-sm p-8 rounded-2xl border border-purple-500/30 shadow-2xl">
          <div className="flex justify-between items-center mb-8">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-gradient-to-r from-purple-500 to-pink-500 rounded-xl flex items-center justify-center">
                <span className="text-xl">📊</span>
              </div>
              <h2 className="text-3xl font-bold text-purple-300">All Records ({messages.length})</h2>
            </div>
            <button
              onClick={loadMessages}
              disabled={loadingMessages}
              className="px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-xl hover:from-purple-700 hover:to-pink-700 transition-all duration-200 disabled:opacity-50 font-semibold shadow-lg hover:scale-105"
            >
              {loadingMessages ? (
                <div className="flex items-center gap-2">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  Loading...
                </div>
              ) : (
                '🔄 Refresh'
              )}
            </button>
          </div>
          
          {loadingMessages ? (
            <div className="text-center py-16">
              <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-purple-500 mx-auto mb-4"></div>
              <p className="text-xl text-purple-300">Loading records...</p>
            </div>
          ) : messages.length === 0 ? (
            <div className="text-center py-16">
              <div className="text-6xl mb-4">📭</div>
              <p className="text-gray-400 text-xl">No records yet.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b-2 border-purple-500/30">
                    <th className="py-4 px-6 text-purple-300 font-bold text-lg">ID</th>
                    <th className="py-4 px-6 text-purple-300 font-bold text-lg">Preview</th>
                    <th className="py-4 px-6 text-purple-300 font-bold text-lg">Settings</th>
                    <th className="py-4 px-6 text-purple-300 font-bold text-lg">QR Code</th>
                    <th className="py-4 px-6 text-purple-300 font-bold text-lg">IP Address</th>
                    <th className="py-4 px-6 text-purple-300 font-bold text-lg">Stats</th>
                    <th className="py-4 px-6 text-purple-300 font-bold text-lg">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {messages.map((record, index) => (
                    <tr key={record.id} className="border-b border-gray-700/50 hover:bg-purple-500/10 transition-all duration-200 group">
                      <td className="py-4 px-6">
                        {record.image_url ? (
                          <a 
                            href={`/view/${record.id}`} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="text-blue-400 hover:text-blue-300 underline font-bold text-lg transition-colors"
                          >
                            {record.id}
                          </a>
                        ) : (
                          <span className="font-bold text-lg">{record.id}</span>
                        )}
                      </td>
                      
                      <td className="py-4 px-6">
                        {record.image_url ? (
                          <div className="w-16 h-16 border-2 border-purple-500/50 rounded-xl overflow-hidden bg-gray-800 shadow-lg hover:scale-110 transition-transform duration-200">
                            <img 
                              src={record.image_url} 
                              alt="Preview" 
                              className="w-full h-full object-cover"
                            />
                          </div>
                        ) : (
                          <div className="w-16 h-16 border-2 border-gray-600 rounded-xl flex items-center justify-center bg-gray-800">
                            <span className="text-gray-400 text-2xl">❓</span>
                          </div>
                        )}
                      </td>
                      
                      <td className="py-4 px-6 text-gray-300">
                        <div className="space-y-1">
                          {record.auto_delete && <div className="text-red-400 font-medium">🗑️ Delete after view</div>}
                          {record.expire_at && (
                            <div className="text-yellow-400 font-medium">
                              ⏰ Expires: {new Date(record.expire_at).toLocaleDateString()}
                            </div>
                          )}
                          {record.days_to_live && (
                            <div className="text-gray-400 font-medium">
                              📅 Days: {record.days_to_live}
                            </div>
                          )}
                          {!record.auto_delete && !record.expire_at && (
                            <span className="text-green-400 font-medium">♾️ Permanent</span>
                          )}
                        </div>
                      </td>
                      
                      <td className="py-4 px-6">
                        {record.image_url && (
                          <button
                            onClick={(e) => {
                              e.preventDefault()
                              e.stopPropagation()
                              showQRForImage(record.id)
                            }}
                            className="px-4 py-2 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-lg hover:from-green-700 hover:to-emerald-700 transition-all duration-200 font-semibold shadow-lg hover:scale-105"
                          >
                            📱 Show QR
                          </button>
                        )}
                      </td>
                      
                      <td className="py-4 px-6 text-gray-300">
                        {record.client_ip && (
                          <div className="font-mono text-sm bg-gray-800 px-3 py-1 rounded-lg">🌐 {record.client_ip}</div>
                        )}
                        {record.ip_address && (
                          <div className="font-mono text-sm bg-gray-800 px-3 py-1 rounded-lg">🌐 {record.ip_address}</div>
                        )}
                        {!record.client_ip && !record.ip_address && (
                          <span className="text-gray-500">No IP</span>
                        )}
                      </td>
                      
                      <td className="py-4 px-6 text-gray-300">
                        <div className="space-y-1 text-sm">
                          <div className="flex items-center gap-2">
                            <span>👁️</span>
                            <span className="font-medium">{record.views || 0} views</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span>📅</span>
                            <span>{new Date(record.created_at).toLocaleDateString()}</span>
                          </div>
                          {record.last_read_at && (
                            <div className="flex items-center gap-2">
                              <span>👀</span>
                              <span>{new Date(record.last_read_at).toLocaleDateString()}</span>
                            </div>
                          )}
                          {record.is_read && (
                            <div className="text-green-400 font-medium">✅ Read</div>
                          )}
                        </div>
                      </td>
                      
                      <td className="py-4 px-6">
                        <div className="space-y-2">
                          {record.image_url && (
                            <button
                              onClick={() => copyToClipboard(`${window.location.origin}/view/${record.id}`)}
                              className="block w-full px-4 py-2 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-lg hover:from-blue-700 hover:to-blue-800 transition-all duration-200 text-sm font-semibold shadow-lg hover:scale-105"
                            >
                              📋 Copy Link
                            </button>
                          )}
                          <button
                            onClick={() => deleteRecord(record.id)}
                            className="block w-full px-4 py-2 bg-gradient-to-r from-red-600 to-red-700 text-white rounded-lg hover:from-red-700 hover:to-red-800 transition-all duration-200 text-sm font-semibold shadow-lg hover:scale-105"
                          >
                            🗑️ Delete
                          </button>
                        </div>
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
          className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-[9999] p-4"
          onClick={forceCloseModal}
        >
          <div 
            className="bg-gradient-to-br from-gray-900 via-purple-900/20 to-gray-900 p-8 rounded-3xl border border-purple-500/50 shadow-2xl max-w-lg w-full mx-4 relative animate-in zoom-in duration-300"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="absolute inset-0 rounded-3xl bg-gradient-to-r from-purple-500 via-pink-500 to-purple-500 p-[1px]">
              <div className="h-full w-full rounded-3xl bg-gray-900"></div>
            </div>
            
            <div className="relative z-10">
              <button
                onClick={forceCloseModal}
                className="absolute top-4 right-4 text-gray-400 hover:text-white text-xl font-bold hover:bg-purple-500/20 rounded-full w-10 h-10 flex items-center justify-center transition-all duration-200 hover:scale-110"
              >
                ✕
              </button>
              
              <div className="text-center mb-8 pt-4">
                <div className="mb-4">
                  <div className="w-16 h-16 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full flex items-center justify-center mx-auto mb-4">
                    <span className="text-2xl">📱</span>
                  </div>
                </div>
                <h3 className="text-3xl font-bold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent mb-2">
                  {modalTitle}
                </h3>
                <div className="w-24 h-1 bg-gradient-to-r from-purple-500 to-pink-500 mx-auto rounded-full"></div>
              </div>
              
              <div className="text-center mb-8">
                <div className="bg-white p-6 rounded-2xl inline-block shadow-2xl border-4 border-purple-100">
                  <img 
                    src={qrCodeDataURL} 
                    alt="QR Code" 
                    className="w-56 h-56 block"
                  />
                </div>
                <p className="text-purple-300 mt-4 text-lg font-medium">Scan with your phone camera</p>
              </div>
              
              <div className="space-y-4">
                <button
                  onClick={downloadQRCode}
                  className="w-full py-4 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-xl hover:from-green-700 hover:to-emerald-700 transition-all duration-200 font-semibold text-lg flex items-center justify-center gap-3 hover:scale-105 shadow-lg"
                >
                  💾 Download QR Code
                </button>
                
                <div className="relative">
                  <input
                    type="text"
                    value={generatedLink}
                    readOnly
                    className="w-full px-6 py-4 bg-gray-800/50 border border-purple-500/30 rounded-xl text-white focus:border-purple-400 focus:outline-none cursor-pointer text-base backdrop-blur-sm"
                    onClick={(e) => {
                      (e.target as HTMLInputElement).select()
                      copyToClipboard(generatedLink)
                    }}
                  />
                  <div className="absolute inset-y-0 right-0 flex items-center pr-4 pointer-events-none">
                    <span className="text-purple-400 text-sm font-medium">📋 Click to copy</span>
                  </div>
                </div>
                
                <button
                  onClick={forceCloseModal}
                  className="w-full py-4 bg-gray-700/50 text-white rounded-xl hover:bg-gray-600/50 transition-all duration-200 font-semibold text-lg backdrop-blur-sm"
                >
                  Close
                </button>
              </div>
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
