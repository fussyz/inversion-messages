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

      const fileExt = selectedFile.name.split('.').pop()
      const fileName = `images/${Math.random().toString(36).substring(2)}-${Date.now()}.${fileExt}`
      
      console.log('Generated filename:', fileName)
      
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

      const { data: urlData, error: urlError } = await supabase.storage
        .from('images')
        .createSignedUrl(fileName, 315360000)

      console.log('Signed URL result:', { urlData, urlError })

      if (urlError || !urlData) {
        throw new Error(`Failed to create signed URL: ${urlError?.message}`)
      }

      let expireAt = null
      if (expirationDays > 0) {
        expireAt = new Date()
        expireAt.setDate(expireAt.getDate() + expirationDays)
      }

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

      const viewLink = `${window.location.origin}/view/${dbData.id}`
      const qrDataURL = await QRCode.toDataURL(viewLink)
      
      setGeneratedLink(viewLink)
      setQRCodeDataURL(qrDataURL)
      setModalTitle('Image Uploaded Successfully!')
      setShowQRModal(true)
      
      setSelectedFile(null)
      setDeleteAfterView(false)
      setExpirationDays(0)
      
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

  const showQRForImage = async (imageId: string) => {
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

  const deleteRecord = async (id: string) => {
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
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-900 to-purple-900">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-purple-500 mx-auto"></div>
          <p className="mt-4 text-purple-400 text-lg">Loading...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen p-8 bg-gradient-to-br from-gray-900 to-purple-900 text-white">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">Admin Dashboard</h1>
          <button
            onClick={handleLogout}
            className="px-6 py-2 bg-gradient-to-r from-red-600 to-red-700 text-white rounded-lg hover:from-red-700 hover:to-red-800 transition-all font-semibold"
          >
            Sign Out
          </button>
        </div>
        
        {user && (
          <div className="bg-gray-800/50 backdrop-blur-sm p-6 rounded-lg border border-purple-500/30 mb-8">
            <p className="text-lg mb-2">Welcome to the admin panel!</p>
            <p>Logged in as: <span className="font-mono text-purple-300">{user.email}</span></p>
          </div>
        )}

        {/* Панель загрузки изображений */}
        <div className="relative bg-gradient-to-br from-[#231942]/80 via-[#5e239d]/60 to-[#2d0d3a]/90 shadow-xl shadow-purple-900/30 border border-purple-500/30 rounded-2xl p-8 mb-8 overflow-hidden">
          <div className="absolute -inset-0.5 pointer-events-none z-0 blur-lg opacity-60" style={{background: "radial-gradient(ellipse 60% 80% at 80% 30%, #a21caf55 0%, #f472b655 60%, transparent 100%)"}}></div>
          <h2 className="relative z-10 text-2xl font-semibold mb-6 text-purple-200 drop-shadow-[0_1px_10px_rgba(168,85,247,0.6)]">Upload Image</h2>
          <div className="relative z-10 space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">Select Image</label>
              <input
                type="file"
                accept="image/*"
                onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                className="block w-full text-sm text-gray-100 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-sm file:font-semibold file:bg-purple-700 file:text-white hover:file:bg-fuchsia-600/90 file:shadow-[0_0_8px_2px_rgba(168,85,247,0.5)] transition-all duration-200 focus:ring-2 focus:ring-purple-400/70"
              />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    checked={deleteAfterView}
                    onChange={(e) => setDeleteAfterView(e.target.checked)}
                    className="form-checkbox h-5 w-5 text-purple-500 border border-purple-400 rounded focus:ring-2 focus:ring-purple-400 transition-shadow shadow-purple-500/30 focus:shadow-[0_0_8px_1px_rgba(168,85,247,0.5)]"
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
                  className="w-full px-3 py-2 bg-[#1a1331]/80 border border-purple-400/40 rounded-lg text-white font-mono focus:border-purple-400 focus:outline-none focus:shadow-[0_0_0_2px_rgba(168,85,247,0.5)] transition-all"
                />
              </div>
            </div>
            <button
              onClick={handleFileUpload}
              disabled={!selectedFile || uploading}
              className="w-full py-3 rounded-xl font-semibold bg-gradient-to-r from-purple-500 via-fuchsia-700 to-purple-800 shadow-[0_0_12px_2px_rgba(168,85,247,0.6)] text-white transition-all duration-200 hover:from-fuchsia-700 hover:to-purple-900 hover:shadow-purple-500/60 focus:outline-none focus:ring-2 focus:ring-purple-400/80 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {uploading ? 'Uploading...' : 'Upload Image'}
            </button>
          </div>
        </div>

        {/* Таблица записей */}
        <div className="bg-gradient-to-br from-[#181622]/90 to-[#301c3a]/95 backdrop-blur-xl shadow-2xl shadow-purple-950/40 border border-purple-700/20 rounded-2xl p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-semibold text-purple-200 drop-shadow-[0_1px_10px_rgba(168,85,247,0.5)]">All Records ({messages.length})</h2>
            <button
              onClick={loadMessages}
              disabled={loadingMessages}
              className="px-4 py-2 bg-purple-700 shadow-[0_0_12px_2px_rgba(168,85,247,0.3)] text-white rounded-xl hover:bg-fuchsia-600 transition-all disabled:opacity-50"
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
              <table className="w-full text-left rounded-2xl overflow-hidden bg-gray-900/60 shadow-lg shadow-purple-900/30 backdrop-blur-md border-separate border-spacing-0">
                <thead>
                  <tr className="">
                    <th className="py-4 px-4 text-purple-300 font-semibold border-b border-purple-900/60 bg-gradient-to-r from-[#232146]/80 to-[#2b183a]/90 first:rounded-tl-2xl last:rounded-tr-2xl">ID</th>
                    <th className="py-4 px-4 text-purple-300 font-semibold border-b border-purple-900/60 bg-gradient-to-r from-[#232146]/80 to-[#2b183a]/90">Preview</th>
                    <th className="py-4 px-4 text-purple-300 font-semibold border-b border-purple-900/60 bg-gradient-to-r from-[#232146]/80 to-[#2b183a]/90">Settings</th>
                    <th className="py-4 px-4 text-purple-300 font-semibold border-b border-purple-900/60 bg-gradient-to-r from-[#232146]/80 to-[#2b183a]/90">QR Code</th>
                    <th className="py-4 px-4 text-purple-300 font-semibold border-b border-purple-900/60 bg-gradient-to-r from-[#232146]/80 to-[#2b183a]/90">IP Address</th>
                    <th className="py-4 px-4 text-purple-300 font-semibold border-b border-purple-900/60 bg-gradient-to-r from-[#232146]/80 to-[#2b183a]/90">Stats</th>
                    <th className="py-4 px-4 text-purple-300 font-semibold border-b border-purple-900/60 bg-gradient-to-r from-[#232146]/80 to-[#2b183a]/90 last:rounded-tr-2xl">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {messages.map((record, i) => (
                    <tr
                      key={record.id}
                      className="group border-b border-purple-900/30 last:border-0 transition-all duration-200 hover:scale-[1.012] hover:z-10 hover:shadow-[0_4px_40px_0_rgba(168,85,247,0.10)] hover:bg-purple-900/10 hover:backdrop-blur-[2px] relative"
                    >
                      <td className="py-4 px-4 text-purple-200 border-r border-purple-900/10 transition-all group-hover:bg-purple-900/10 group-hover:backdrop-blur-sm rounded-l-xl">
                        {record.image_url ? (
                          <a
                            href={`/view/${record.id}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-400 hover:text-blue-300 underline font-bold transition-all"
                          >
                            {record.id}
                          </a>
                        ) : (
                          <span className="font-bold">{record.id}</span>
                        )}
                      </td>
                      <td className="py-4 px-4 border-r border-purple-900/10">
                        {record.image_url ? (
                          <div className="w-10 h-10 border border-purple-500/60 rounded-lg overflow-hidden bg-gray-900 shadow-[0_0_10px_0_rgba(168,85,247,0.12)]">
                            <img
                              src={record.image_url}
                              alt="Preview"
                              className="w-full h-full object-cover"
                            />
                          </div>
                        ) : (
                          <div className="w-10 h-10 border border-gray-600 rounded flex items-center justify-center bg-gray-800">
                            <span className="text-gray-400 text-xs">❓</span>
                          </div>
                        )}
                      </td>
                      <td className="py-4 px-4 text-gray-300 border-r border-purple-900/10">
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
                      <td className="py-4 px-4 border-r border-purple-900/10">
                        {record.image_url && (
                          <button
                            onClick={(e) => {
                              e.preventDefault()
                              e.stopPropagation()
                              showQRForImage(record.id)
                            }}
                            className="px-3 py-2 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-lg shadow-[0_0_8px_1px_rgba(34,197,94,0.3)] hover:from-green-600 hover:to-emerald-700 hover:shadow-green-400/40 transition-all text-sm font-semibold"
                          >
                            📱 Show QR
                          </button>
                        )}
                      </td>
                      <td className="py-4 px-4 text-gray-300 border-r border-purple-900/10 font-mono text-xs">
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
                      <td className="py-4 px-4 text-gray-300 text-xs border-r border-purple-900/10">
                        <div>👁️ Views: {record.views || 0}</div>
                        <div>📅 {new Date(record.created_at).toLocaleDateString()}</div>
                        {record.last_read_at && (
                          <div>👀 {new Date(record.last_read_at).toLocaleDateString()}</div>
                        )}
                        {record.is_read && (
                          <div className="text-green-400">✅ Read</div>
                        )}
                      </td>
                      <td className="py-4 px-4 space-y-1 rounded-r-xl">
                        {record.image_url && (
                          <button
                            onClick={() => copyToClipboard(`${window.location.origin}/view/${record.id}`)}
                            className="block w-full px-3 py-1 bg-blue-700 text-white rounded-lg shadow-blue-700/30 hover:bg-blue-800 hover:shadow-blue-500/40 transition-all text-sm"
                          >
                            📋 Copy Link
                          </button>
                        )}
                        <button
                          onClick={() => deleteRecord(record.id)}
                          className="block w-full px-3 py-1 bg-red-700 text-white rounded-lg shadow-red-900/30 hover:bg-red-800 hover:shadow-red-500/40 transition-all text-sm"
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
          className="fixed inset-0 bg-black/80 backdrop-blur-2xl flex items-center justify-center z-[9999] p-4"
          onClick={forceCloseModal}
        >
          <div
            className="relative bg-gradient-to-br from-[#1a102b]/90 via-[#2b1946]/80 to-[#181622]/95 border border-purple-600/40 shadow-2xl shadow-purple-900/60 rounded-2xl max-w-md w-full mx-4 p-8 flex flex-col items-center"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={forceCloseModal}
              className="absolute top-4 right-4 text-gray-400 hover:text-white text-2xl font-bold hover:bg-gray-800/80 rounded-full w-9 h-9 flex items-center justify-center transition-all bg-gradient-to-br from-[#232146]/80 to-[#2b183a]/90"
            >
              ✕
            </button>
            <div className="flex flex-col items-center w-full mb-6">
              <h3 className="text-2xl font-bold text-purple-200 mb-2 text-center drop-shadow-[0_1px_10px_rgba(168,85,247,0.5)]">{modalTitle}</h3>
              <div className="w-16 h-1 bg-purple-500 mx-auto rounded"></div>
            </div>
            <div className="flex flex-col items-center w-full mb-6">
              <div className="bg-white/95 p-4 rounded-xl inline-block shadow-2xl shadow-purple-400/30 ring-4 ring-purple-400/40 relative">
                <div className="absolute inset-0 pointer-events-none rounded-xl shadow-[0_0_48px_16px_rgba(168,85,247,0.23)]"></div>
                <img
                  src={qrCodeDataURL}
                  alt="QR Code"
                  className="w-48 h-48 block drop-shadow-[0_0_24px_rgba(168,85,247,0.25)]"
                />
              </div>
              <p className="text-gray-300 mt-3 text-sm text-center">Scan with your phone camera</p>
            </div>
            <div className="space-y-3 w-full">
              <button
                onClick={downloadQRCode}
                className="w-full py-3 bg-gradient-to-r from-green-400 via-emerald-500 to-lime-400 text-black font-bold rounded-xl shadow-[0_0_16px_2px_rgba(34,197,94,0.23)] hover:from-lime-400 hover:to-green-500 hover:shadow-green-400/60 transition-all focus:outline-none focus:ring-2 focus:ring-green-300/70"
              >
                💾 Download QR Code
              </button>
              <div className="relative">
                <input
                  type="text"
                  value={generatedLink}
                  readOnly
                  className="w-full px-4 py-3 bg-[#201c2e]/90 border border-purple-400/40 rounded-lg text-purple-200 font-mono tracking-tight focus:border-purple-400 focus:outline-none focus:shadow-[0_0_0_2px_rgba(168,85,247,0.5)] transition-all cursor-pointer text-base"
                  onClick={(e) => {
                    (e.target as HTMLInputElement).select()
                    copyToClipboard(generatedLink)
                  }}
                />
                <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                  <span className="text-purple-300 text-xs">📋 Click to copy</span>
                </div>
              </div>
              <button
                onClick={forceCloseModal}
                className="w-full py-3 bg-gradient-to-r from-gray-800 to-gray-900 text-white rounded-xl font-semibold shadow hover:from-gray-700 hover:to-gray-800 transition-all focus:outline-none"
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