// app/admin/page.tsx
'use client'

// Improved design for admin panel - v2

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

  // Image uploading states
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [deleteAfterView, setDeleteAfterView] = useState(false)
  const [expirationDays, setExpirationDays] = useState(0)
  const [uploading, setUploading] = useState(false)

  // QR Modal states
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
      const fileExt = selectedFile.name.split('.').pop()
      const fileName = `images/${Math.random().toString(36).substring(2)}-${Date.now()}.${fileExt}`
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('images')
        .upload(fileName, selectedFile, { cacheControl: '3600', upsert: false })
      if (uploadError) {
        throw new Error(`Storage upload failed: ${uploadError.message}`)
      }
      const { data: urlData, error: urlError } = await supabase.storage
        .from('images')
        .createSignedUrl(fileName, 315360000)
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
      const { data: dbData, error: dbError } = await supabase
        .from('messages')
        .insert(insertData)
        .select()
        .single()
      if (dbError) {
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
    } catch (error: any) {
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
        color: { dark: '#000000', light: '#FFFFFF' }
      })
      setGeneratedLink(viewLink)
      setQRCodeDataURL(qrDataURL)
      setModalTitle(`QR Code for Image ${imageId}`)
      setShowQRModal(true)
    } catch (error) {
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
    if (!confirm('Are you sure you want to delete this record?')) return
    try {
      const { error } = await supabase.from('messages').delete().eq('id', id)
      if (error) {
        alert('Failed to delete record')
      } else {
        alert('Record deleted successfully')
        loadMessages()
      }
    } catch (error) {
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
      if (e.key === 'Escape') forceCloseModal()
    }
    document.addEventListener('keydown', handleEscape)
    return () => document.removeEventListener('keydown', handleEscape)
  }, [])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-violet-800 to-purple-900">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-l-4 border-pink-500 mx-auto"></div>
          <p className="mt-6 text-2xl font-bold text-white animate-pulse">Loading...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen p-4 md:p-8 bg-gradient-to-br from-[#0F0C29] via-[#302B63] to-[#24243E] text-white">
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col md:flex-row justify-between items-center mb-10 gap-4">
          <h1 className="text-4xl md:text-6xl font-black text-transparent bg-clip-text bg-gradient-to-r from-pink-500 via-red-400 to-yellow-400 tracking-tight drop-shadow-lg">
            ADMIN DASHBOARD
          </h1>
          <button
            onClick={handleLogout}
            className="px-7 py-3 bg-gradient-to-br from-red-500 to-purple-700 text-white rounded-xl font-bold shadow-[0_8px_30px_rgb(168_85_247_/_0.3)] hover:shadow-[0_8px_30px_rgb(168_85_247_/_0.5)] transition-all duration-300"
          >
            Sign Out
          </button>
        </div>

        {user && (
          <div className="bg-black/40 backdrop-blur-xl p-6 rounded-2xl border border-indigo-500/30 mb-10 shadow-xl transform hover:scale-[1.01] transition-all duration-300">
            <p className="text-2xl font-bold text-white">Welcome to the admin panel!</p>
            <p className="text-lg">
              Logged in as: <span className="font-mono text-pink-300">{user.email}</span>
            </p>
          </div>
        )}

        {/* Image Upload Panel */}
        <div className="bg-black/40 backdrop-blur-xl p-8 rounded-3xl border border-indigo-500/30 shadow-xl mb-12 transform hover:shadow-[0_10px_40px_rgba(131,88,255,0.15)] transition-all duration-300">
          <h2 className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-400 mb-6">
            Upload Image
          </h2>
          <div className="space-y-8">
            <div className="bg-gradient-to-r from-indigo-900/20 to-purple-900/20 p-5 rounded-xl">
              <label className="block text-lg font-bold text-white mb-3">
                Select Image
              </label>
              <input
                type="file"
                accept="image/*"
                onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                className="block w-full text-base text-gray-200 file:mr-5 file:py-3 file:px-6 file:rounded-xl file:border-0 file:font-medium file:bg-gradient-to-r file:from-pink-500 file:to-violet-600 file:text-white hover:file:bg-gradient-to-r hover:file:from-pink-600 hover:file:to-violet-700 transition-all cursor-pointer"
              />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-gradient-to-r from-indigo-900/20 to-purple-900/20 p-5 rounded-xl flex items-center space-x-4">
                <div className="relative w-12 h-7">
                  <input
                    type="checkbox"
                    checked={deleteAfterView}
                    onChange={(e) => setDeleteAfterView(e.target.checked)}
                    id="deleteToggle"
                    className="sr-only"
                  />
                  <label
                    htmlFor="deleteToggle"
                    className={`absolute inset-0 rounded-full cursor-pointer transition duration-300 ${
                      deleteAfterView ? 'bg-purple-600' : 'bg-gray-700'
                    }`}
                  >
                    <span
                      className={`absolute h-5 w-5 top-1 rounded-full transition-transform duration-300 transform ${
                        deleteAfterView ? 'translate-x-6 bg-white' : 'translate-x-1 bg-gray-300'
                      }`}
                    ></span>
                  </label>
                </div>
                <span className="text-lg font-medium text-white">Delete after opening</span>
              </div>
              <div className="bg-gradient-to-r from-indigo-900/20 to-purple-900/20 p-5 rounded-xl">
                <label className="block text-lg font-medium text-white mb-3">
                  Expiration (days)
                </label>
                <input
                  type="number"
                  min="0"
                  value={expirationDays}
                  onChange={(e) => setExpirationDays(parseInt(e.target.value) || 0)}
                  className="w-full px-4 py-3 bg-black/40 border border-purple-500/40 rounded-xl text-white focus:border-pink-500 focus:outline-none focus:ring-2 focus:ring-pink-500/50 transition-all"
                  placeholder="0 = forever"
                />
              </div>
            </div>
            <button
              onClick={handleFileUpload}
              disabled={!selectedFile || uploading}
              className="w-full py-4 rounded-xl text-xl font-bold bg-gradient-to-r from-pink-500 to-purple-600 shadow-lg hover:shadow-pink-500/20 text-white transition-all duration-300 hover:-translate-y-1 disabled:opacity-60 disabled:translate-y-0 disabled:hover:shadow-none"
            >
              {uploading ? (
                <span className="flex items-center justify-center">
                  <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Uploading...
                </span>
              ) : 'Upload Image'}
            </button>
          </div>
        </div>

        {/* Records Table */}
        <div className="bg-black/40 backdrop-blur-xl p-8 rounded-3xl border border-indigo-500/30 shadow-xl transform hover:shadow-[0_10px_40px_rgba(131,88,255,0.15)] transition-all duration-300">
          <div className="flex flex-col md:flex-row justify-between items-center mb-8 gap-4">
            <h2 className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-400">
              All Records <span className="bg-purple-900 text-white text-xl px-3 py-1 rounded-full">{messages.length}</span>
            </h2>
            <button
              onClick={loadMessages}
              disabled={loadingMessages}
              className="px-6 py-3 bg-gradient-to-r from-indigo-600 to-blue-600 text-white rounded-xl font-bold transition-all duration-300 hover:-translate-y-1 hover:shadow-lg disabled:opacity-50 disabled:translate-y-0"
            >
              {loadingMessages ? (
                <span className="flex items-center">
                  <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Loading...
                </span>
              ) : (
                <span className="flex items-center">
                  <svg className="mr-2 h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  Refresh
                </span>
              )}
            </button>
          </div>
          {loadingMessages ? (
            <div className="text-center py-16">
              <div className="inline-block animate-spin rounded-full h-12 w-12 border-t-4 border-b-4 border-pink-500"></div>
              <p className="mt-4 text-xl text-gray-300">Loading records...</p>
            </div>
          ) : messages.length === 0 ? (
            <div className="text-center py-16 bg-indigo-900/20 rounded-2xl">
              <svg className="mx-auto h-16 w-16 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
              </svg>
              <p className="mt-4 text-2xl text-gray-400 font-light">No records found</p>
              <p className="mt-2 text-gray-500">Upload an image to get started</p>
            </div>
          ) : (
            <div className="overflow-x-auto scrollbar-thin scrollbar-thumb-purple-500 scrollbar-track-gray-800 rounded-2xl">
              <table className="w-full text-left">
                <thead>
                  <tr className="bg-gradient-to-r from-indigo-900/40 to-purple-900/40 rounded-t-2xl">
                    <th className="py-4 px-5 text-pink-300 font-bold uppercase text-sm tracking-wider rounded-tl-2xl">ID</th>
                    <th className="py-4 px-5 text-pink-300 font-bold uppercase text-sm tracking-wider">Preview</th>
                    <th className="py-4 px-5 text-pink-300 font-bold uppercase text-sm tracking-wider">Settings</th>
                    <th className="py-4 px-5 text-pink-300 font-bold uppercase text-sm tracking-wider">QR Code</th>
                    <th className="py-4 px-5 text-pink-300 font-bold uppercase text-sm tracking-wider">IP Address</th>
                    <th className="py-4 px-5 text-pink-300 font-bold uppercase text-sm tracking-wider">Stats</th>
                    <th className="py-4 px-5 text-pink-300 font-bold uppercase text-sm tracking-wider rounded-tr-2xl">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {messages.map((record, index) => (
                    <tr
                      key={record.id}
                      className={`group border-t border-purple-900/30 hover:bg-indigo-900/30 transition-all duration-200 ${
                        index === messages.length - 1 ? 'rounded-b-2xl' : ''
                      }`}
                    >
                      <td className="py-4 px-5 text-purple-200 font-mono">
                        {record.image_url ? (
                          <a
                            href={`/view/${record.id}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-400 hover:text-pink-400 underline font-bold transition-colors"
                          >
                            {record.id}
                          </a>
                        ) : (
                          <span className="font-bold">{record.id}</span>
                        )}
                      </td>
                      <td className="py-4 px-5">
                        {record.image_url ? (
                          <div className="w-10 h-10 border-2 border-purple-500/40 rounded-lg overflow-hidden bg-gray-800/40 shadow-sm transition-all duration-300">
                            <img
                              src={record.image_url}
                              alt="Preview"
                              className="w-full h-full object-cover"
                            />
                          </div>
                        ) : (
                          <div className="w-10 h-10 border border-gray-600 rounded-lg flex items-center justify-center bg-gray-800/50">
                            <span className="text-gray-400 text-xs">❓</span>
                          </div>
                        )}
                      </td>
                      <td className="py-4 px-5 text-gray-300 text-sm">
                        {record.auto_delete && (
                          <div className="mb-2 flex items-center text-red-400 font-bold bg-red-900/20 px-3 py-1.5 rounded-lg">
                            <span className="text-lg mr-1.5">🗑️</span> Delete after view
                          </div>
                        )}
                        {record.expire_at && (
                          <div className="mb-2 flex items-center text-yellow-400 font-semibold bg-yellow-900/20 px-3 py-1.5 rounded-lg">
                            <span className="text-lg mr-1.5">⏰</span> Expires: {new Date(record.expire_at).toLocaleDateString()}
                          </div>
                        )}
                        {record.days_to_live && (
                          <div className="mb-2 flex items-center text-purple-300 bg-purple-900/20 px-3 py-1.5 rounded-lg">
                            <span className="text-lg mr-1.5">📅</span> Days: {record.days_to_live}
                          </div>
                        )}
                        {!record.auto_delete && !record.expire_at && (
                          <div className="mb-2 flex items-center text-green-400 font-bold bg-green-900/20 px-3 py-1.5 rounded-lg">
                            <span className="text-lg mr-1.5">♾️</span> Permanent
                          </div>
                        )}
                      </td>
                      <td className="py-4 px-5">
                        {record.image_url && (
                          <button
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              showQRForImage(record.id);
                            }}
                            className="px-4 py-2.5 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-lg shadow transition-all duration-300 hover:scale-105 text-sm font-bold flex items-center"
                          >
                            <span className="mr-1.5">📱</span> Show QR
                          </button>
                        )}
                      </td>
                      <td className="py-4 px-5 text-gray-300 font-mono text-sm">
                        {record.client_ip ? (
                          <div className="bg-indigo-900/20 px-3 py-1.5 rounded-lg flex items-center">
                            <span className="mr-1.5">🌐</span> {record.client_ip}
                          </div>
                        ) : record.ip_address ? (
                          <div className="bg-indigo-900/20 px-3 py-1.5 rounded-lg flex items-center">
                            <span className="mr-1.5">🌐</span> {record.ip_address}
                          </div>
                        ) : (
                          <span className="text-gray-500 bg-gray-800/50 px-3 py-1.5 rounded-lg">No IP</span>
                        )}
                      </td>
                      <td className="py-4 px-5">
                        <div className="space-y-2">
                          <div className="bg-blue-900/20 px-3 py-1.5 rounded-lg flex items-center text-blue-300">
                            <span className="mr-1.5">👁️</span> 
                            <span className="font-bold">{record.views || 0}</span>
                          </div>
                          <div className="bg-purple-900/20 px-3 py-1.5 rounded-lg flex items-center text-purple-300">
                            <span className="mr-1.5">📅</span>
                            {new Date(record.created_at).toLocaleDateString()}
                          </div>
                          {record.last_read_at && (
                            <div className="bg-indigo-900/20 px-3 py-1.5 rounded-lg flex items-center text-indigo-300">
                              <span className="mr-1.5">👀</span>
                              {new Date(record.last_read_at).toLocaleDateString()}
                            </div>
                          )}
                          {record.is_read && (
                            <div className="bg-green-900/20 px-3 py-1.5 rounded-lg flex items-center text-green-300 font-bold">
                              <span className="mr-1.5">✅</span> Read
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="py-4 px-5 space-y-3">
                        {record.image_url && (
                          <button
                            onClick={() =>
                              copyToClipboard(`${window.location.origin}/view/${record.id}`)
                            }
                            className="w-full px-4 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-700 text-white rounded-lg shadow transition-all duration-300 hover:scale-105 text-sm font-bold flex items-center justify-center"
                          >
                            <span className="mr-1.5">📋</span> Copy Link
                          </button>
                        )}
                        <button
                          onClick={() => deleteRecord(record.id)}
                          className="w-full px-4 py-2.5 bg-gradient-to-r from-red-600 to-rose-700 text-white rounded-lg shadow transition-all duration-300 hover:scale-105 text-sm font-bold flex items-center justify-center"
                        >
                          <span className="mr-1.5">🗑️</span> Delete
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

      {/* QR Code Modal */}
      {showQRModal && qrCodeDataURL && (
        <div
          className="fixed inset-0 bg-black/90 backdrop-blur-md flex items-center justify-center z-[9999] p-4 animate-fadeIn"
          onClick={forceCloseModal}
          style={{
            animation: 'fadeIn 0.3s ease-out',
            WebkitAnimation: 'fadeIn 0.3s ease-out',
          }}
        >
          <div
            className="relative bg-gradient-to-br from-[#141E30] to-[#243B55] p-8 rounded-3xl border border-blue-500/30 shadow-2xl shadow-blue-500/20 max-w-md w-full mx-4 animate-scaleIn"
            onClick={(e) => e.stopPropagation()}
            style={{
              animation: 'scaleIn 0.3s ease-out',
              WebkitAnimation: 'scaleIn 0.3s ease-out',
            }}
          >
            <button
              onClick={forceCloseModal}
              className="absolute top-4 right-4 text-gray-300 hover:text-white text-xl font-bold bg-black/30 hover:bg-black/50 rounded-full w-10 h-10 flex items-center justify-center transition-all duration-300"
            >
              ✕
            </button>
            <div className="flex flex-col items-center mb-8">
              <h3 className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-500 mb-3 text-center">{modalTitle}</h3>
              <div className="w-16 h-1 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full"></div>
            </div>
            <div className="flex flex-col items-center mb-8">
              <div className="bg-white p-4 rounded-lg inline-block shadow-xl transform transition-all hover:scale-105 duration-300 border-4 border-indigo-500/30">
                <img
                  src={qrCodeDataURL}
                  alt="QR Code"
                  className="w-48 h-48 object-cover"
                />
              </div>
              <p className="text-gray-300 mt-3 text-sm">Scan with your phone camera</p>
            </div>
            <div className="space-y-4">
              <button
                onClick={downloadQRCode}
                className="w-full py-3.5 bg-gradient-to-r from-green-500 to-emerald-700 text-white rounded-xl font-bold transition-all duration-300 hover:shadow-lg hover:shadow-green-500/20 hover:scale-[1.02] flex items-center justify-center"
              >
                <svg className="w-5 h-5 mr-2" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
                Download QR Code
              </button>
              <div className="relative">
                <input
                  type="text"
                  value={generatedLink}
                  readOnly
                  className="w-full px-4 py-3.5 bg-black/40 border border-indigo-500/40 rounded-xl text-white focus:border-pink-500 focus:outline-none cursor-pointer text-sm pr-28"
                  onClick={(e) => {
                    (e.target as HTMLInputElement).select();
                    copyToClipboard(generatedLink);
                  }}
                />
                <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                  <span className="text-indigo-400 text-sm bg-indigo-900/30 py-1 px-2 rounded">Click to copy</span>
                </div>
              </div>
              <button
                onClick={forceCloseModal}
                className="w-full py-3.5 bg-gray-700 hover:bg-gray-600 text-white rounded-xl font-bold transition-all duration-300"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      <style jsx global>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes scaleIn {
          from { transform: scale(0.95); opacity: 0; }
          to { transform: scale(1); opacity: 1; }
        }
        .scrollbar-thin::-webkit-scrollbar {
          width: 6px;
          height: 6px;
        }
        .scrollbar-thin::-webkit-scrollbar-track {
          background: rgba(31, 41, 55, 0.4);
          border-radius: 100vh;
        }
        .scrollbar-thin::-webkit-scrollbar-thumb {
          background: rgba(139, 92, 246, 0.8);
          border-radius: 100vh;
        }
        .animate-fadeIn {
          animation: fadeIn 0.3s ease-out;
        }
        .animate-scaleIn {
          animation: scaleIn 0.3s ease-out;
        }
      `}</style>
    </div>
  )
}