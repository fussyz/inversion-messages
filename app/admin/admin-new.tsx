'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@supabase/supabase-js'
import QRCode from 'qrcode'

// Принудительно указываем, что страница должна обновляться динамически
export const dynamic = 'force-dynamic'

// Убедимся, что Supabase не создается с пустыми значениями
const supabaseUrl = typeof window !== 'undefined' ? process.env.NEXT_PUBLIC_SUPABASE_URL || '' : '';
const supabaseKey = typeof window !== 'undefined' ? process.env.NEXT_PUBLIC_SUPABASE_KEY || '' : '';

// Создаем клиент только если есть значения
const supabase = supabaseUrl && supabaseKey ? 
  createClient(supabaseUrl, supabaseKey) : 
  null;

export default function AdminNewPage() {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
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
        // Проверка на существование клиента Supabase
        if (!supabase) {
          setError('Supabase client is not initialized. Check environment variables.')
          setLoading(false)
          return
        }

        setShowQRModal(false)
        const { data: { session }, error } = await supabase.auth.getSession()
        if (error) {
          console.error('Auth error:', error)
          setError('Authentication error: ' + error.message)
          setLoading(false)
          return
        }
        
        if (!session) {
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
        setError('Unexpected error: ' + (error instanceof Error ? error.message : String(error)))
        setLoading(false)
      }
    }
    
    getUser()
  }, [router])

  const loadMessages = async () => {
    if (!supabase) {
      setError('Supabase client is not initialized')
      return
    }
    
    setLoadingMessages(true)
    try {
      const { data, error } = await supabase
        .from('messages')
        .select('*')
        .order('created_at', { ascending: false })
      
      if (error) {
        console.error('Error loading messages:', error)
        setError('Failed to load messages: ' + error.message)
      } else {
        setMessages(data || [])
      }
    } catch (error) {
      console.error('Error:', error)
      setError('Unexpected error while loading messages')
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
      const qrDataURL = await QRCode.toDataURL(viewLink)
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
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#111'
      }}>
        <div style={{ textAlign: 'center', color: 'white' }}>
          <h2>Loading...</h2>
        </div>
      </div>
    )
  }

  // Показ ошибки
  if (error) {
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#111'
      }}>
        <div style={{ 
          textAlign: 'center', 
          color: 'white',
          maxWidth: '600px',
          padding: '20px',
          background: '#222',
          borderRadius: '10px'
        }}>
          <h2 style={{ color: 'red', marginBottom: '20px' }}>Error</h2>
          <p style={{ marginBottom: '20px' }}>{error}</p>
          <p>
            <b>Environment variables:</b> <br/>
            NEXT_PUBLIC_SUPABASE_URL: {process.env.NEXT_PUBLIC_SUPABASE_URL ? 'Set' : 'Not set'} <br/>
            NEXT_PUBLIC_SUPABASE_KEY: {process.env.NEXT_PUBLIC_SUPABASE_KEY ? 'Set' : 'Not set'}
          </p>
          <button 
            onClick={() => router.push('/signin')}
            style={{ 
              marginTop: '20px',
              padding: '10px 20px',
              background: '#333',
              border: 'none',
              borderRadius: '5px',
              color: 'white',
              cursor: 'pointer'
            }}
          >
            Go to Sign In
          </button>
        </div>
      </div>
    )
  }

  // Обычный рендеринг страницы
  return (
    <div style={{ 
      padding: '20px', 
      maxWidth: '1200px', 
      margin: '0 auto',
      backgroundColor: '#111',
      color: 'white',
      minHeight: '100vh'
    }}>
      <h1 style={{ 
        fontSize: '24px', 
        marginBottom: '20px',
        color: 'lime',
        backgroundColor: '#222',
        padding: '10px'
      }}>
        ADMIN PANEL - SIMPLE VERSION
      </h1>

      {/* User info */}
      {user && (
        <div style={{ marginBottom: '20px', padding: '10px', backgroundColor: '#222' }}>
          <p>Logged in as: {user.email}</p>
          <button 
            onClick={handleLogout}
            style={{ 
              padding: '5px 10px', 
              backgroundColor: 'red', 
              color: 'white',
              border: 'none',
              borderRadius: '5px',
              cursor: 'pointer',
              marginTop: '10px'
            }}
          >
            Sign Out
          </button>
        </div>
      )}

      {/* Upload form */}
      <div style={{ 
        marginBottom: '30px', 
        padding: '15px', 
        backgroundColor: '#222',
        borderRadius: '5px' 
      }}>
        <h2 style={{ marginBottom: '15px', color: 'lime' }}>Upload Image</h2>
        
        <div style={{ marginBottom: '15px' }}>
          <label style={{ display: 'block', marginBottom: '5px' }}>Select Image</label>
          <input
            type="file"
            accept="image/*"
            onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
            style={{ 
              display: 'block', 
              width: '100%',
              backgroundColor: '#333',
              color: 'white',
              padding: '5px'
            }}
          />
        </div>
        
        <div style={{ marginBottom: '15px' }}>
          <label style={{ display: 'inline-flex', alignItems: 'center', marginBottom: '5px' }}>
            <input
              type="checkbox"
              checked={deleteAfterView}
              onChange={(e) => setDeleteAfterView(e.target.checked)}
            />
            <span style={{ marginLeft: '8px' }}>Delete after opening</span>
          </label>
        </div>
        
        <div style={{ marginBottom: '15px' }}>
          <label style={{ display: 'block', marginBottom: '5px' }}>
            Expiration (days, 0 = no expiration)
          </label>
          <input
            type="number"
            min="0"
            value={expirationDays}
            onChange={(e) => setExpirationDays(parseInt(e.target.value) || 0)}
            style={{ 
              display: 'block', 
              width: '100%',
              backgroundColor: '#333',
              color: 'white',
              padding: '5px'
            }}
          />
        </div>
        
        <button
          onClick={handleFileUpload}
          disabled={!selectedFile || uploading}
          style={{ 
            backgroundColor: uploading ? '#555' : 'lime', 
            color: 'black',
            padding: '10px',
            border: 'none',
            borderRadius: '5px',
            width: '100%',
            fontWeight: 'bold',
            cursor: uploading ? 'not-allowed' : 'pointer'
          }}
        >
          {uploading ? 'Uploading...' : 'Upload Image'}
        </button>
      </div>

      {/* Records Table */}
      <div style={{ 
        backgroundColor: '#222',
        padding: '15px',
        borderRadius: '5px'
      }}>
        <h2 style={{ marginBottom: '15px', color: 'lime' }}>
          Records ({messages.length})
          <button
            onClick={loadMessages}
            disabled={loadingMessages}
            style={{
              float: 'right',
              backgroundColor: loadingMessages ? '#555' : 'blue',
              color: 'white',
              padding: '5px 10px',
              border: 'none',
              borderRadius: '5px',
              cursor: loadingMessages ? 'not-allowed' : 'pointer'
            }}
          >
            {loadingMessages ? 'Loading...' : 'Refresh'}
          </h2>

        {loadingMessages ? (
          <p>Loading...</p>
        ) : messages.length === 0 ? (
          <p>No records yet.</p>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ 
              width: '100%', 
              borderCollapse: 'collapse',
              backgroundColor: '#333'
            }}>
              <thead>
                <tr>
                  <th style={{ 
                    padding: '8px', 
                    textAlign: 'left', 
                    borderBottom: '2px solid #444'
                  }}>ID</th>
                  <th style={{ 
                    padding: '8px', 
                    textAlign: 'left', 
                    borderBottom: '2px solid #444'
                  }}>Preview</th>
                  <th style={{ 
                    padding: '8px', 
                    textAlign: 'left', 
                    borderBottom: '2px solid #444'
                  }}>Settings</th>
                  <th style={{ 
                    padding: '8px', 
                    textAlign: 'left', 
                    borderBottom: '2px solid #444'
                  }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {messages.map((record) => (
                  <tr key={record.id} style={{ borderBottom: '1px solid #444' }}>
                    <td style={{ padding: '8px' }}>{record.id}</td>
                    <td style={{ padding: '8px' }}>
                      {record.image_url ? (
                        <div style={{ 
                          width: '24px', 
                          height: '24px', 
                          border: '1px solid white',
                          overflow: 'hidden'
                        }}>
                          <img
                            src={record.image_url}
                            alt="Preview"
                            style={{
                              width: '100%',
                              height: '100%',
                              objectFit: 'cover',
                              maxWidth: '100%',
                              maxHeight: '100%'
                            }}
                          />
                        </div>
                      ) : (
                        <div style={{ 
                          width: '24px', 
                          height: '24px', 
                          border: '1px solid gray',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          backgroundColor: '#444'
                        }}>?</div>
                      )}
                    </td>
                    <td style={{ padding: '8px' }}>
                      {record.auto_delete && (
                        <div style={{ color: 'red', marginBottom: '5px' }}>
                          Delete after view
                        </div>
                      )}
                      {record.expire_at && (
                        <div style={{ color: 'yellow', marginBottom: '5px' }}>
                          Expires: {new Date(record.expire_at).toLocaleDateString()}
                        </div>
                      )}
                      {record.days_to_live && (
                        <div style={{ marginBottom: '5px' }}>
                          Days: {record.days_to_live}
                        </div>
                      )}
                      {!record.auto_delete && !record.expire_at && (
                        <div style={{ color: 'lime' }}>Permanent</div>
                      )}
                    </td>
                    <td style={{ padding: '8px' }}>
                      {record.image_url && (
                        <div style={{ marginBottom: '5px' }}>
                          <button
                            onClick={() => showQRForImage(record.id)}
                            style={{
                              backgroundColor: 'green',
                              color: 'white',
                              border: 'none',
                              borderRadius: '4px',
                              padding: '5px 10px',
                              marginRight: '5px',
                              cursor: 'pointer'
                            }}
                          >
                            Show QR
                          </button>
                          <button
                            onClick={() => copyToClipboard(`${window.location.origin}/view/${record.id}`)}
                            style={{
                              backgroundColor: 'blue',
                              color: 'white',
                              border: 'none',
                              borderRadius: '4px',
                              padding: '5px 10px',
                              cursor: 'pointer'
                            }}
                          >
                            Copy Link
                          </button>
                        </div>
                      )}
                      <button
                        onClick={() => deleteRecord(record.id)}
                        style={{
                          backgroundColor: 'red',
                          color: 'white',
                          border: 'none',
                          borderRadius: '4px',
                          padding: '5px 10px',
                          cursor: 'pointer'
                        }}
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

      {/* QR Code Modal */}
      {showQRModal && qrCodeDataURL && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.8)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000
        }} onClick={forceCloseModal}>
          <div 
            style={{
              backgroundColor: '#222',
              padding: '20px',
              borderRadius: '10px',
              maxWidth: '400px',
              width: '100%',
              position: 'relative'
            }}
            onClick={e => e.stopPropagation()}
          >
            <button 
              onClick={forceCloseModal}
              style={{
                position: 'absolute',
                top: '10px',
                right: '10px',
                border: 'none',
                backgroundColor: 'transparent',
                color: 'white',
                fontSize: '18px',
                cursor: 'pointer'
              }}
            >
              ✕
            </button>
            
            <h3 style={{ 
              color: 'lime', 
              textAlign: 'center',
              marginBottom: '15px',
              fontSize: '18px'
            }}>
              {modalTitle}
            </h3>
            
            <div style={{
              backgroundColor: 'white',
              padding: '10px',
              marginBottom: '15px',
              textAlign: 'center',
              borderRadius: '5px'
            }}>
              <img 
                src={qrCodeDataURL}
                alt="QR Code"
                style={{
                  width: '200px',
                  height: '200px',
                  maxWidth: '100%'
                }}
              />
            </div>
            
            <button
              onClick={downloadQRCode}
              style={{
                width: '100%',
                padding: '10px',
                backgroundColor: 'green',
                color: 'white',
                border: 'none',
                borderRadius: '5px',
                marginBottom: '10px',
                cursor: 'pointer',
                fontWeight: 'bold'
              }}
            >
              Download QR Code
            </button>
            
            <div style={{ position: 'relative', marginBottom: '10px' }}>
              <input
                type="text"
                value={generatedLink}
                readOnly
                style={{
                  width: '100%',
                  padding: '10px',
                  backgroundColor: '#333',
                  border: '1px solid #555',
                  borderRadius: '5px',
                  color: 'white',
                  cursor: 'pointer'
                }}
                onClick={(e) => {
                  (e.target as HTMLInputElement).select();
                  copyToClipboard(generatedLink);
                }}
              />
              <div style={{
                position: 'absolute',
                right: '10px',
                top: '50%',
                transform: 'translateY(-50%)',
                color: 'gray',
                fontSize: '12px',
                pointerEvents: 'none'
              }}>
                Click to copy
              </div>
            </div>
            
            <button
              onClick={forceCloseModal}
              style={{
                width: '100%',
                padding: '10px',
                backgroundColor: '#444',
                color: 'white',
                border: 'none',
                borderRadius: '5px',
                cursor: 'pointer',
                fontWeight: 'bold'
              }}
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  )
}