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
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#0f051d] via-[#2f184b] to-[#1a0e2e] animate-gradient-x">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-fuchsia-400 shadow-[0_0_24px_6px_rgba(236,72,153,0.55)] mx-auto"></div>
          <p className="mt-6 text-2xl font-bold bg-gradient-to-r from-fuchsia-400 via-purple-400 to-blue-400 bg-clip-text text-transparent animate-pulse drop-shadow-[0_0_24px_rgba(236,72,153,0.55)]">
            Loading...
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen p-8 bg-gradient-to-br from-[#170048] via-[#1d0736] to-[#0f051d] text-white animate-gradient-x">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-10">
          <h1 className="text-5xl md:text-7xl font-black bg-gradient-to-r from-fuchsia-400 via-purple-400 to-blue-400 bg-clip-text text-transparent neon-glow drop-shadow-[0_0_40px_rgba(236,72,153,0.7)] animate-gradient-text tracking-tight">
            Admin Dashboard
          </h1>
          <button
            onClick={handleLogout}
            className="px-7 py-3 bg-gradient-to-br from-pink-600 via-fuchsia-500 to-purple-700 text-white rounded-2xl font-bold shadow-[0_0_24px_4px_rgba(236,72,153,0.25)] hover:from-fuchsia-700 hover:to-purple-900 hover:shadow-fuchsia-500/80 focus:outline-none focus:ring-2 focus:ring-fuchsia-400/60 transition-all duration-150"
          >
            Sign Out
          </button>
        </div>

        {user && (
          <div className="bg-white/10 backdrop-blur-2xl border border-fuchsia-400/30 rounded-2xl p-7 mb-10 shadow-xl shadow-fuchsia-900/20 glassmorphism-panel animate-fadein">
            <p className="text-2xl font-semibold mb-1 text-fuchsia-200 drop-shadow-[0_0_8px_rgba(236,72,153,0.4)]">Welcome to the admin panel!</p>
            <p className="text-lg">
              Logged in as: <span className="font-mono text-fuchsia-400 text-xl">{user.email}</span>
            </p>
          </div>
        )}

        {/* Панель загрузки изображений */}
        <div className="relative bg-gradient-to-br from-[#241050]/80 via-[#5e239d]/60 to-[#2d0d3a]/90 shadow-2xl shadow-fuchsia-900/50 border border-fuchsia-400/30 rounded-3xl p-10 mb-12 overflow-hidden neon-panel animate-fadein">
          <div className="absolute -inset-1 pointer-events-none z-0 blur-2xl opacity-70" style={{background: "radial-gradient(ellipse 80% 100% at 80% 30%, #e879f955 0%, #a21caf55 50%, transparent 100%)"}}></div>
          <h2 className="relative z-10 text-3xl font-bold mb-7 text-fuchsia-200 drop-shadow-[0_1px_24px_rgba(236,72,153,0.7)] animate-pulse">Upload Image</h2>
          <div className="relative z-10 space-y-5">
            <div>
              <label className="block text-base font-bold mb-2 text-fuchsia-300">Select Image</label>
              <input
                type="file"
                accept="image/*"
                onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                className="block w-full text-base text-gray-100 file:mr-4 file:py-3 file:px-6 file:rounded-xl file:border-0 file:text-base file:font-semibold file:bg-gradient-to-tr from-fuchsia-600 via-purple-700 to-blue-700 file:text-white hover:file:bg-fuchsia-400/80 file:shadow-[0_0_16px_2px_rgba(236,72,153,0.4)] transition-all duration-200 focus:ring-2 focus:ring-fuchsia-400/70"
              />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="flex items-center space-x-3 text-fuchsia-200">
                  <input
                    type="checkbox"
                    checked={deleteAfterView}
                    onChange={(e) => setDeleteAfterView(e.target.checked)}
                    className="form-checkbox h-6 w-6 text-fuchsia-500 border border-fuchsia-400 rounded focus:ring-2 focus:ring-fuchsia-400 transition-shadow shadow-fuchsia-500/30 focus:shadow-[0_0_8px_2px_rgba(236,72,153,0.5)]"
                  />
                  <span className="font-medium">Delete after opening</span>
                </label>
              </div>
              <div>
                <label className="block text-base font-bold mb-2 text-fuchsia-300">
                  Expiration (days, 0 = forever)
                </label>
                <input
                  type="number"
                  min="0"
                  value={expirationDays}
                  onChange={(e) => setExpirationDays(parseInt(e.target.value) || 0)}
                  className="w-full px-4 py-3 bg-[#1a1331]/80 border border-fuchsia-400/40 rounded-xl text-white font-mono focus:border-fuchsia-400 focus:outline-none focus:shadow-[0_0_0_3px_rgba(236,72,153,0.6)] transition-all text-lg"
                />
              </div>
            </div>
            <button
              onClick={handleFileUpload}
              disabled={!selectedFile || uploading}
              className="w-full py-4 rounded-2xl font-bold text-lg bg-gradient-to-r from-fuchsia-400 via-purple-500 to-blue-600 shadow-[0_0_24px_6px_rgba(236,72,153,0.7)] text-white transition-all duration-200 hover:from-fuchsia-500 hover:to-blue-700 hover:shadow-fuchsia-400/80 focus:outline-none focus:ring-2 focus:ring-fuchsia-400/80 disabled:opacity-60 disabled:cursor-not-allowed animate-glow"
            >
              {uploading ? 'Uploading...' : 'Upload Image'}
            </button>
          </div>
        </div>

        {/* Таблица записей */}
        <div className="bg-gradient-to-br from-[#181622]/90 via-[#2e174a]/90 to-[#301c3a]/95 backdrop-blur-2xl shadow-[0_8px_64px_0_rgba(236,72,153,0.13)] border border-fuchsia-400/20 rounded-3xl p-8 neon-card animate-fadein">
          <div className="flex justify-between items-center mb-7">
            <h2 className="text-3xl font-bold text-fuchsia-200 drop-shadow-[0_1px_16px_rgba(236,72,153,0.7)]">All Records ({messages.length})</h2>
            <button
              onClick={loadMessages}
              disabled={loadingMessages}
              className="px-6 py-2 bg-gradient-to-r from-fuchsia-600 to-purple-700 shadow-[0_0_16px_2px_rgba(236,72,153,0.4)] text-white rounded-2xl font-bold hover:from-fuchsia-400 hover:to-blue-500 hover:shadow-fuchsia-400/80 transition-all disabled:opacity-50"
            >
              {loadingMessages ? 'Loading...' : 'Refresh'}
            </button>
          </div>
          {loadingMessages ? (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-10 w-10 border-b-4 border-fuchsia-400 mx-auto shadow-[0_0_24px_6px_rgba(236,72,153,0.3)]"></div>
              <p className="mt-4 text-fuchsia-300 text-lg">Loading records...</p>
            </div>
          ) : messages.length === 0 ? (
            <p className="text-fuchsia-300 text-center py-10 text-lg">No records yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left rounded-2xl overflow-hidden bg-[#19132a]/80 shadow-lg shadow-fuchsia-900/30 backdrop-blur-md border-separate border-spacing-0 neon-table">
                <thead>
                  <tr>
                    <th className="py-5 px-5 text-fuchsia-300 font-bold border-b border-fuchsia-900/60 bg-gradient-to-r from-[#232146]/80 to-[#2b183a]/90 first:rounded-tl-2xl last:rounded-tr-2xl text-lg">ID</th>
                    <th className="py-5 px-5 text-fuchsia-300 font-bold border-b border-fuchsia-900/60 bg-gradient-to-r from-[#232146]/80 to-[#2b183a]/90 text-lg">Preview</th>
                    <th className="py-5 px-5 text-fuchsia-300 font-bold border-b border-fuchsia-900/60 bg-gradient-to-r from-[#232146]/80 to-[#2b183a]/90 text-lg">Settings</th>
                    <th className="py-5 px-5 text-fuchsia-300 font-bold border-b border-fuchsia-900/60 bg-gradient-to-r from-[#232146]/80 to-[#2b183a]/90 text-lg">QR Code</th>
                    <th className="py-5 px-5 text-fuchsia-300 font-bold border-b border-fuchsia-900/60 bg-gradient-to-r from-[#232146]/80 to-[#2b183a]/90 text-lg">IP Address</th>
                    <th className="py-5 px-5 text-fuchsia-300 font-bold border-b border-fuchsia-900/60 bg-gradient-to-r from-[#232146]/80 to-[#2b183a]/90 text-lg">Stats</th>
                    <th className="py-5 px-5 text-fuchsia-300 font-bold border-b border-fuchsia-900/60 bg-gradient-to-r from-[#232146]/80 to-[#2b183a]/90 last:rounded-tr-2xl text-lg">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {messages.map((record, i) => (
                    <tr
                      key={record.id}
                      className="group border-b border-fuchsia-900/30 last:border-0 transition-all duration-200 hover:scale-[1.015] hover:z-10 hover:shadow-[0_8px_40px_0_rgba(236,72,153,0.25)] hover:bg-fuchsia-700/10 hover:backdrop-blur-[3px] relative animate-table-row"
                    >
                      <td className="py-4 px-5 text-fuchsia-200 border-r border-fuchsia-900/10 transition-all group-hover:bg-fuchsia-800/10 group-hover:backdrop-blur-sm rounded-l-xl font-mono text-base">
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
                      <td className="py-4 px-5 border-r border-fuchsia-900/10">
                        {record.image_url ? (
                          <div className="w-12 h-12 border-2 border-fuchsia-400/60 rounded-xl overflow-hidden bg-[#1e1038] shadow-[0_0_16px_0_rgba(236,72,153,0.2)]">
                            <img
                              src={record.image_url}
                              alt="Preview"
                              className="w-full h-full object-cover"
                            />
                          </div>
                        ) : (
                          <div className="w-12 h-12 border border-gray-600 rounded-xl flex items-center justify-center bg-gray-800">
                            <span className="text-fuchsia-400 text-xl">❓</span>
                          </div>
                        )}
                      </td>
                      <td className="py-4 px-5 text-gray-300 border-r border-fuchsia-900/10 text-base">
                        {record.auto_delete && <div className="text-red-400 font-bold">🗑️ Delete after view</div>}
                        {record.expire_at && (
                          <div className="text-yellow-400 font-semibold">
                            ⏰ Expires: {new Date(record.expire_at).toLocaleDateString()}
                          </div>
                        )}
                        {record.days_to_live && (
                          <div className="text-fuchsia-300">
                            📅 Days: {record.days_to_live}
                          </div>
                        )}
                        {!record.auto_delete && !record.expire_at && (
                          <span className="text-green-400 font-bold">♾️ Permanent</span>
                        )}
                      </td>
                      <td className="py-4 px-5 border-r border-fuchsia-900/10">
                        {record.image_url && (
                          <button
                            onClick={(e) => {
                              e.preventDefault()
                              e.stopPropagation()
                              showQRForImage(record.id)
                            }}
                            className="px-4 py-2 bg-gradient-to-r from-green-400 via-emerald-500 to-fuchsia-500 text-white rounded-xl shadow-[0_0_16px_2px_rgba(34,197,94,0.23)] hover:from-fuchsia-400 hover:to-emerald-500 hover:shadow-green-400/60 transition-all text-base font-bold animate-glow"
                          >
                            📱 Show QR
                          </button>
                        )}
                      </td>
                      <td className="py-4 px-5 text-gray-300 border-r border-fuchsia-900/10 font-mono text-sm">
                        {record.client_ip && (
                          <div className="font-mono text-base">🌐 {record.client_ip}</div>
                        )}
                        {record.ip_address && (
                          <div className="font-mono text-base">🌐 {record.ip_address}</div>
                        )}
                        {!record.client_ip && !record.ip_address && (
                          <span className="text-gray-500">No IP</span>
                        )}
                      </td>
                      <td className="py-4 px-5 text-gray-300 text-sm border-r border-fuchsia-900/10">
                        <div>👁️ Views: <span className="font-bold text-fuchsia-200">{record.views || 0}</span></div>
                        <div>📅 {new Date(record.created_at).toLocaleDateString()}</div>
                        {record.last_read_at && (
                          <div>👀 {new Date(record.last_read_at).toLocaleDateString()}</div>
                        )}
                        {record.is_read && (
                          <div className="text-green-400 font-bold">✅ Read</div>
                        )}
                      </td>
                      <td className="py-4 px-5 space-y-2 rounded-r-xl">
                        {record.image_url && (
                          <button
                            onClick={() => copyToClipboard(`${window.location.origin}/view/${record.id}`)}
                            className="block w-full px-4 py-2 bg-gradient-to-tr from-blue-700 via-fuchsia-600 to-purple-700 text-white rounded-xl shadow-blue-700/30 hover:bg-blue-800 hover:shadow-fuchsia-400/40 transition-all text-base font-bold animate-glow"
                          >
                            📋 Copy Link
                          </button>
                        )}
                        <button
                          onClick={() => deleteRecord(record.id)}
                          className="block w-full px-4 py-2 bg-gradient-to-tr from-red-700 via-fuchsia-500 to-pink-700 text-white rounded-xl shadow-red-900/30 hover:from-fuchsia-700 hover:to-red-700 hover:shadow-fuchsia-400/40 transition-all text-base font-bold animate-glow"
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
          className="fixed inset-0 bg-black/80 backdrop-blur-2xl flex items-center justify-center z-[9999] p-4 animate-fadein"
          onClick={forceCloseModal}
        >
          <div
            className="relative bg-gradient-to-br from-[#1a102b]/90 via-[#2b1946]/80 to-[#181622]/95 border border-fuchsia-500/50 shadow-2xl shadow-fuchsia-900/70 rounded-2xl max-w-md w-full mx-4 p-10 flex flex-col items-center neon-modal animate-modal-pop"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={forceCloseModal}
              className="absolute top-4 right-4 text-fuchsia-300 hover:text-white text-2xl font-bold hover:bg-fuchsia-800/80 rounded-full w-10 h-10 flex items-center justify-center transition-all bg-gradient-to-br from-[#232146]/80 to-[#2b183a]/90 shadow-[0_0_16px_2px_rgba(236,72,153,0.3)]"
            >
              ✕
            </button>
            <div className="flex flex-col items-center w-full mb-7">
              <h3 className="text-2xl font-black text-fuchsia-200 mb-2 text-center drop-shadow-[0_1px_16px_rgba(236,72,153,0.7)]">{modalTitle}</h3>
              <div className="w-20 h-1 bg-gradient-to-r from-fuchsia-400 via-purple-400 to-blue-400 mx-auto rounded-full shadow-[0_0_16px_6px_rgba(236,72,153,0.4)]"></div>
            </div>
            <div className="flex flex-col items-center w-full mb-7">
              <div className="bg-white/95 p-6 rounded-2xl inline-block shadow-2xl shadow-fuchsia-400/50 ring-4 ring-fuchsia-400/40 relative animate-glow">
                <div className="absolute inset-0 pointer-events-none rounded-2xl shadow-[0_0_64px_18px_rgba(236,72,153,0.33)]"></div>
                <img
                  src={qrCodeDataURL}
                  alt="QR Code"
                  className="w-52 h-52 block drop-shadow-[0_0_40px_rgba(236,72,153,0.32)]"
                />
              </div>
              <p className="text-fuchsia-300 mt-4 text-lg text-center animate-pulse">Scan with your phone camera</p>
            </div>
            <div className="space-y-4 w-full">
              <button
                onClick={downloadQRCode}
                className="w-full py-4 bg-gradient-to-r from-green-400 via-emerald-500 to-fuchsia-400 text-black font-bold rounded-xl shadow-[0_0_24px_2px_rgba(34,197,94,0.25)] hover:from-fuchsia-400 hover:to-green-500 hover:shadow-fuchsia-400/60 transition-all focus:outline-none focus:ring-2 focus:ring-fuchsia-300/70 animate-glow"
              >
                💾 Download QR Code
              </button>
              <div className="relative">
                <input
                  type="text"
                  value={generatedLink}
                  readOnly
                  className="w-full px-4 py-3 bg-[#201c2e]/90 border border-fuchsia-400/40 rounded-xl text-fuchsia-200 font-mono tracking-tight focus:border-fuchsia-400 focus:outline-none focus:shadow-[0_0_0_3px_rgba(236,72,153,0.5)] transition-all cursor-pointer text-base select-all"
                  onClick={(e) => {
                    (e.target as HTMLInputElement).select()
                    copyToClipboard(generatedLink)
                  }}
                />
                <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                  <span className="text-fuchsia-300 text-xs">📋 Click to copy</span>
                </div>
              </div>
              <button
                onClick={forceCloseModal}
                className="w-full py-4 bg-gradient-to-r from-gray-800 to-gray-900 text-white rounded-xl font-bold shadow hover:from-gray-700 hover:to-gray-800 transition-all focus:outline-none"
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