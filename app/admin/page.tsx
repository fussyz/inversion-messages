// app/admin/page.tsx
'use client'

// Micro change for deployment test

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
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#0f051d] via-[#2f184b] to-[#1a0e2e]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-fuchsia-400 mx-auto"></div>
          <p className="mt-6 text-2xl font-bold bg-gradient-to-r from-fuchsia-400 via-purple-400 to-blue-400 bg-clip-text text-transparent animate-pulse">
            Loading...
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen p-8 bg-gradient-to-br from-[#170048] via-[#1d0736] to-[#0f051d] text-white">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-10">
          <h1 className="text-5xl md:text-7xl font-black bg-gradient-to-r from-fuchsia-400 via-purple-400 to-blue-400 bg-clip-text text-transparent tracking-tight drop-shadow-lg">
            Admin Dashboard
          </h1>
          <button
            onClick={handleLogout}
            className="px-7 py-3 bg-gradient-to-br from-pink-600 via-fuchsia-500 to-purple-700 text-white rounded-2xl font-bold shadow-lg hover:shadow-xl transition-all"
          >
            Sign Out
          </button>
        </div>

        {user && (
          <div className="bg-gray-800/50 backdrop-blur-sm p-6 rounded-lg border border-purple-500/30 mb-10 shadow-md">
            <p className="text-2xl font-semibold text-gray-200">Welcome to the admin panel!</p>
            <p className="text-lg">
              Logged in as: <span className="font-mono text-purple-300">{user.email}</span>
            </p>
          </div>
        )}

        {/* Image Upload Panel */}
        <div className="bg-gray-800/50 backdrop-blur-sm p-8 rounded-2xl border border-purple-500/30 shadow-lg mb-12">
          <h2 className="text-3xl font-semibold text-purple-300 mb-6">Upload Image</h2>
          <div className="space-y-6">
            <div>
              <label className="block text-base font-bold text-gray-300 mb-2">
                Select Image
              </label>
              <input
                type="file"
                accept="image/*"
                onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                className="block w-full text-sm text-gray-200 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:font-medium file:bg-gradient-to-tr from-purple-600 to-blue-600 file:text-white hover:file:opacity-90 transition-all"
              />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={deleteAfterView}
                  onChange={(e) => setDeleteAfterView(e.target.checked)}
                  className="form-checkbox h-5 w-5 text-purple-500"
                />
                <span className="text-base text-gray-200">Delete after opening</span>
              </div>
              <div>
                <label className="block text-base font-bold text-gray-300 mb-2">
                  Expiration (days, 0 = forever)
                </label>
                <input
                  type="number"
                  min="0"
                  value={expirationDays}
                  onChange={(e) => setExpirationDays(parseInt(e.target.value) || 0)}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:border-purple-500 focus:outline-none"
                />
              </div>
            </div>
            <button
              onClick={handleFileUpload}
              disabled={!selectedFile || uploading}
              className="w-full py-3 rounded-2xl text-lg font-bold bg-gradient-to-r from-purple-500 via-blue-500 to-indigo-600 shadow-lg text-white transition-all hover:shadow-xl focus:outline-none disabled:opacity-60"
            >
              {uploading ? 'Uploading...' : 'Upload Image'}
            </button>
          </div>
        </div>

        {/* Records Table */}
        <div className="bg-gray-800/50 backdrop-blur-sm p-8 rounded-2xl border border-purple-500/30 shadow-lg">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-3xl font-bold text-purple-300">All Records ({messages.length})</h2>
            <button
              onClick={loadMessages}
              disabled={loadingMessages}
              className="px-6 py-2 bg-gradient-to-r from-purple-600 to-blue-700 text-white rounded-2xl font-bold transition-all hover:shadow-xl disabled:opacity-50"
            >
              {loadingMessages ? 'Loading...' : 'Refresh'}
            </button>
          </div>
          {loadingMessages ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-400 mx-auto"></div>
              <p className="mt-2">Loading records...</p>
            </div>
          ) : messages.length === 0 ? (
            <p className="text-gray-400 text-center py-8">No records yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b border-gray-700">
                    <th className="py-4 px-5 text-purple-300 font-bold">ID</th>
                    <th className="py-4 px-5 text-purple-300 font-bold">Preview</th>
                    <th className="py-4 px-5 text-purple-300 font-bold">Settings</th>
                    <th className="py-4 px-5 text-purple-300 font-bold">QR Code</th>
                    <th className="py-4 px-5 text-purple-300 font-bold">IP Address</th>
                    <th className="py-4 px-5 text-purple-300 font-bold">Stats</th>
                    <th className="py-4 px-5 text-purple-300 font-bold">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {messages.map((record) => (
                    <tr
                      key={record.id}
                      className="group border-b border-gray-800 hover:bg-gray-700/50 transition-all"
                    >
                      <td className="py-4 px-5 text-purple-200 font-mono">
                        {record.image_url ? (
                          <a
                            href={`/view/${record.id}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-400 hover:text-blue-300 underline font-bold transition-colors"
                          >
                            {record.id}
                          </a>
                        ) : (
                          <span className="font-bold">{record.id}</span>
                        )}
                      </td>
                      <td className="py-4 px-5">
                        {record.image_url ? (
                          <div className="w-8 h-8 border border-purple-500 rounded overflow-hidden bg-gray-800">
                            <img
                              src={record.image_url}
                              alt="Preview"
                              className="w-full h-full object-cover"
                            />
                          </div>
                        ) : (
                          <div className="w-8 h-8 border border-gray-600 rounded flex items-center justify-center bg-gray-800">
                            <span className="text-purple-400 text-xs">❓</span>
                          </div>
                        )}
                      </td>
                      <td className="py-4 px-5 text-gray-300 text-sm">
                        {record.auto_delete && (
                          <div className="text-red-400 font-bold">🗑️ Delete after view</div>
                        )}
                        {record.expire_at && (
                          <div className="text-yellow-400 font-semibold">
                            ⏰ Expires: {new Date(record.expire_at).toLocaleDateString()}
                          </div>
                        )}
                        {record.days_to_live && (
                          <div className="text-purple-300">📅 Days: {record.days_to_live}</div>
                        )}
                        {!record.auto_delete && !record.expire_at && (
                          <span className="text-green-400 font-bold">♾️ Permanent</span>
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
                            className="px-4 py-2 bg-gradient-to-r from-green-400 via-emerald-500 to-fuchsia-500 text-white rounded shadow transition-all text-sm font-bold"
                          >
                            📱 Show QR
                          </button>
                        )}
                      </td>
                      <td className="py-4 px-5 text-gray-300 font-mono text-sm">
                        {record.client_ip ? (
                          <div className="text-base">🌐 {record.client_ip}</div>
                        ) : record.ip_address ? (
                          <div className="text-base">🌐 {record.ip_address}</div>
                        ) : (
                          <span className="text-gray-500">No IP</span>
                        )}
                      </td>
                      <td className="py-4 px-5 text-gray-300 text-sm">
                        <div>👁️ <span className="font-bold">{record.views || 0}</span></div>
                        <div>📅 {new Date(record.created_at).toLocaleDateString()}</div>
                        {record.last_read_at && (
                          <div>👀 {new Date(record.last_read_at).toLocaleDateString()}</div>
                        )}
                        {record.is_read && (
                          <div className="text-green-400 font-bold">✅ Read</div>
                        )}
                      </td>
                      <td className="py-4 px-5 space-y-3">
                        {record.image_url && (
                          <button
                            onClick={() =>
                              copyToClipboard(`${window.location.origin}/view/${record.id}`)
                            }
                            className="w-full px-4 py-2 bg-gradient-to-tr from-blue-700 via-fuchsia-600 to-purple-700 text-white rounded shadow transition-all text-sm font-bold"
                          >
                            📋 Copy Link
                          </button>
                        )}
                        <button
                          onClick={() => deleteRecord(record.id)}
                          className="w-full px-4 py-2 bg-gradient-to-tr from-red-700 via-fuchsia-500 to-pink-700 text-white rounded shadow transition-all text-sm font-bold"
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

      {/* QR Code Modal */}
      {showQRModal && qrCodeDataURL && (
        <div
          className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center z-[9999] p-4 animate-fadein"
          onClick={forceCloseModal}
        >
          <div
            className="relative bg-gradient-to-br from-gray-900 via-purple-900/20 to-gray-900 p-8 rounded-2xl border border-purple-500/50 shadow-2xl max-w-md w-full mx-4"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={forceCloseModal}
              className="absolute top-4 right-4 text-purple-300 hover:text-white text-2xl font-bold bg-gradient-to-br from-gray-800 to-gray-900 rounded-full w-10 h-10 flex items-center justify-center transition-all"
            >
              ✕
            </button>
            <div className="flex flex-col items-center mb-6">
              <h3 className="text-2xl font-bold text-purple-400 mb-2 text-center">{modalTitle}</h3>
              <div className="w-16 h-1 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full"></div>
            </div>
            <div className="flex flex-col items-center mb-6">
              <div className="bg-white p-4 rounded-lg inline-block shadow-md">
                <img
                  src={qrCodeDataURL}
                  alt="QR Code"
                  className="w-40 h-40 object-cover"
                />
              </div>
              <p className="text-gray-300 mt-3 text-sm">Scan with your phone</p>
            </div>
            <div className="space-y-3">
              <button
                onClick={downloadQRCode}
                className="w-full py-3 bg-green-600 text-white rounded-lg font-bold transition-all hover:bg-green-700"
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
                    (e.target as HTMLInputElement).select();
                    copyToClipboard(generatedLink);
                  }}
                />
                <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                  <span className="text-purple-400 text-xs">📋 Click to copy</span>
                </div>
              </div>
              <button
                onClick={forceCloseModal}
                className="w-full py-3 bg-gray-700 text-white rounded-lg font-bold transition-all hover:bg-gray-600"
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