'use client'

// COMPLETELY NEW ADMIN FILE TO BYPASS CACHE ISSUES
export const dynamic = 'force-dynamic'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@supabase/supabase-js'
import QRCode from 'qrcode'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export default function AdminNewPage() {
  // State declarations remain the same...
  const [loading, setLoading] = useState(true)
  const [user, setUser] = useState<{ email: string } | null>(null)
  const [messages, setMessages] = useState<any[]>([])
  const [loadingMessages, setLoadingMessages] = useState(false)
  
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [deleteAfterView, setDeleteAfterView] = useState(false)
  const [expirationDays, setExpirationDays] = useState(0)
  const [uploading, setUploading] = useState(false)
  
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
      <div className="min-h-screen flex items-center justify-center bg-black">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-l-4 border-green-500 mx-auto"></div>
          <p className="mt-6 text-2xl font-bold text-white animate-pulse">Loading v2...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen p-8 bg-black text-white">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-5xl font-extrabold text-center mb-8 bg-green-500 text-black p-4 rounded-xl">
          NEW ADMIN DESIGN v2 - BYPASS CACHE
        </h1>
        
        {user && (
          <div className="bg-gray-800 p-6 rounded-xl mb-10">
            <p className="text-2xl font-bold text-white">Welcome to the admin panel!</p>
            <p className="text-lg">
              Logged in as: <span className="font-mono text-green-300">{user.email}</span>
            </p>
          </div>
        )}

        {/* Image Upload Panel */}
        <div className="bg-gray-800 p-8 rounded-xl mb-12">
          <h2 className="text-3xl font-bold text-green-300 mb-6">
            Upload Image
          </h2>
          <div className="space-y-8">
            <div className="bg-gray-700 p-5 rounded-xl">
              <label className="block text-lg font-bold text-white mb-3">
                Select Image (small preview)
              </label>
              <input
                type="file"
                accept="image/*"
                onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                className="block w-full text-base text-gray-200 file:mr-5 file:py-3 file:px-6 file:rounded-xl file:border-0 file:font-medium file:bg-green-600 file:text-white hover:file:bg-green-700 transition-all cursor-pointer"
              />
            </div>
            <button
              onClick={handleFileUpload}
              disabled={!selectedFile || uploading}
              className="w-full py-4 rounded-xl text-xl font-bold bg-green-600 text-white transition-all duration-300 hover:-translate-y-1 disabled:opacity-60 disabled:translate-y-0"
            >
              {uploading ? 'Uploading...' : 'Upload Image'}
            </button>
          </div>
        </div>

        {/* Records Table */}
        <div className="bg-gray-800 p-8 rounded-xl">
          <h2 className="text-3xl font-bold text-green-300 mb-6">
            Records ({messages.length})
          </h2>
          {loadingMessages ? (
            <div className="text-center py-8">
              <div className="animate-spin h-10 w-10 border-4 border-green-500 rounded-full border-t-transparent mx-auto"></div>
              <p className="mt-4 text-xl">Loading...</p>
            </div>
          ) : messages.length === 0 ? (
            <p className="text-gray-400 text-center py-8">No records yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="bg-gray-700">
                    <th className="py-3 px-4 text-green-300">ID</th>
                    <th className="py-3 px-4 text-green-300">Preview</th>
                    <th className="py-3 px-4 text-green-300">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {messages.map((record) => (
                    <tr
                      key={record.id}
                      className="border-t border-gray-700 hover:bg-gray-700/50"
                    >
                      <td className="py-3 px-4 font-mono">{record.id}</td>
                      <td className="py-3 px-4">
                        {record.image_url ? (
                          <div className="w-6 h-6 border border-green-500/50 rounded">
                            <img
                              src={record.image_url}
                              alt="Preview"
                              className="w-full h-full object-cover"
                            />
                          </div>
                        ) : (
                          <div className="w-6 h-6 border border-gray-600 rounded flex items-center justify-center bg-gray-700">
                            <span className="text-gray-400 text-[8px]">?</span>
                          </div>
                        )}
                      </td>
                      <td className="py-3 px-4 space-y-2">
                        {record.image_url && (
                          <button
                            onClick={() =>
                              copyToClipboard(`${window.location.origin}/view/${record.id}`)
                            }
                            className="px-3 py-1.5 bg-blue-600 text-white rounded text-sm"
                          >
                            Copy Link
                          </button>
                        )}
                        <button
                          onClick={() => deleteRecord(record.id)}
                          className="px-3 py-1.5 bg-red-600 text-white rounded text-sm"
                        >
                          Delete
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
          className="fixed inset-0 bg-black/90 flex items-center justify-center z-50 p-4"
          onClick={forceCloseModal}
        >
          <div
            className="bg-gray-800 p-6 rounded-xl max-w-md w-full"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-2xl font-bold text-green-300 mb-4">{modalTitle}</h3>
            <div className="bg-white p-4 rounded-lg mb-4">
              <img
                src={qrCodeDataURL}
                alt="QR Code"
                className="w-40 h-40 object-cover mx-auto"
              />
            </div>
            <button
              onClick={downloadQRCode}
              className="w-full py-2 bg-green-600 text-white rounded-lg font-bold mb-3"
            >
              Download QR Code
            </button>
            <button
              onClick={forceCloseModal}
              className="w-full py-2 bg-gray-600 text-white rounded-lg font-bold"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  )
}