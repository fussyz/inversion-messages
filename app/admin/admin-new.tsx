'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@supabase/supabase-js'
import QRCode from 'qrcode'

// Принудительно указываем, что страница должна обновляться динамически
export const dynamic = 'force-dynamic'

// Убедимся, что Supabase не создается с пустыми значениями
const supabaseUrl = typeof window !== 'undefined' ? process.env.NEXT_PUBLIC_SUPABASE_URL || '' : '';
const supabaseKey = typeof window !== 'undefined' ? 
  process.env.NEXT_PUBLIC_SUPABASE_KEY || 
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '' : '';

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
  
  // Сортировка
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc')
  const [sortField, setSortField] = useState<string>('created_at')
  
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
  const [currentImageId, setCurrentImageId] = useState('')

  // Новые состояния для текстового сообщения
  const [messageType, setMessageType] = useState<'image' | 'text'>('image')
  const [textContent, setTextContent] = useState('')

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
        .order(sortField, { ascending: sortDirection === 'asc' })
      
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

  const handleSort = (field: string) => {
    if (field === sortField) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')
    } else {
      setSortField(field)
      setSortDirection('desc')
    }
    // После изменения сортировки обновляем данные
    setTimeout(loadMessages, 0)
  }

  const handleFileUpload = async () => {
    if (!supabase) {
      alert('Supabase client is not initialized')
      return
    }
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
      const qrDataURL = await QRCode.toDataURL(viewLink, {
        margin: 0,
        width: 400,
        color: {
          dark: "#000000", 
          light: "#00000000" // Прозрачный фон
        },
        type: 'image/png'
      })
      setGeneratedLink(viewLink)
      setQRCodeDataURL(qrDataURL)
      setModalTitle('Image Uploaded Successfully!')
      setCurrentImageId(dbData.id)
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



  // Removed duplicate downloadQRCode function to fix redeclaration error

  // Duplicate handleLogout removed to fix redeclaration error



  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') forceCloseModal()
    }
    document.addEventListener('keydown', handleEscape)
    return () => document.removeEventListener('keydown', handleEscape)
  }, [])

  const handleMessageSubmit = async () => {
    if (!supabase) {
      alert('Supabase client is not initialized')
      return
    }
    
    // Проверка валидности в зависимости от типа сообщения
    if (messageType === 'image' && !selectedFile) {
      alert('Please select a file')
      return
    } else if (messageType === 'text' && !textContent) {
      alert('Please enter message text')
      return
    }
    
    setUploading(true)
    try {
      let insertData: any = {
        auto_delete: deleteAfterView,
        days_to_live: expirationDays > 0 ? expirationDays : null,
        views: 0,
        is_read: false,
      }
      
      // Настройка срока истечения
      if (expirationDays > 0) {
        const expireAt = new Date()
        expireAt.setDate(expireAt.getDate() + expirationDays)
        insertData.expire_at = expireAt.toISOString()
      } else {
        insertData.expire_at = null
      }
      
      // Обработка в зависимости от типа сообщения
      if (messageType === 'image' && selectedFile) {
        // Загрузка изображения
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
        
        insertData.image_url = urlData.signedUrl
        insertData.content = null // Сбрасываем текстовое содержимое
      } else {
        // Для текстового сообщения
        insertData.content = textContent
        insertData.image_url = null // Сбрасываем URL изображения
      }
      
      // Сохраняем в базу данных
      const { data: dbData, error: dbError } = await supabase
        .from('messages')
        .insert(insertData)
        .select()
        .single()
      
      if (dbError) {
        throw new Error(`Database insert failed: ${dbError.message || JSON.stringify(dbError)}`)
      }
      
      // Генерация QR-кода
      const viewLink = `${window.location.origin}/view/${dbData.id}`
      const qrDataURL = await QRCode.toDataURL(viewLink, {
        margin: 0,
        width: 400,
        color: {
          dark: "#000000",
          light: "#00000000"
        },
        type: 'image/png'
      })
      
      // Обновляем состояние для показа модального окна с QR-кодом
      setGeneratedLink(viewLink)
      setQRCodeDataURL(qrDataURL)
      setModalTitle(`${messageType === 'image' ? 'Image' : 'Text Message'} Created Successfully!`)
      setCurrentImageId(dbData.id)
      setShowQRModal(true)
      
      // Сбрасываем форму
      setSelectedFile(null)
      setTextContent('')
      setDeleteAfterView(false)
      setExpirationDays(0)
      
      // Обновляем список сообщений
      loadMessages()
    } catch (error: any) {
      alert(`Operation failed: ${error.message || 'Unknown error'}`)
    }
    setUploading(false)
  }

  const showQRForImage = async (imageId: string) => {
    try {
      const viewLink = `${window.location.origin}/view/${imageId}`
      const qrDataURL = await QRCode.toDataURL(viewLink, {
        margin: 0, // Убираем отступы вокруг QR-кода
        width: 400,
        color: {
          dark: "#000000", // Черный цвет для точек
          light: "#00000000" // Прозрачный фон (полностью прозрачный)
        },
        type: 'image/png'
      })
      setGeneratedLink(viewLink)
      setQRCodeDataURL(qrDataURL)
      setModalTitle(`QR Code for Image ${imageId}`)
      setCurrentImageId(imageId)
      setShowQRModal(true)
    } catch (error) {
      alert('Failed to generate QR code')
    }
  }

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text)
      // Убрали алерт по запросу пользователя
    } catch (error) {
      console.error('Failed to copy:', error)
    }
  }

  const downloadQRCode = () => {
    const link = document.createElement('a')
    link.href = qrCodeDataURL
    link.download = `QR-код-${currentImageId}.png`
    link.click()
  }

  const handleLogout = async () => {
    if (!supabase) {
      alert('Supabase client is not initialized')
      return
    }
    await supabase.auth.signOut()
    router.push('/signin')
  }

  const deleteRecord = async (id: string) => {
    if (!confirm('Are you sure you want to delete this record?')) return
    if (!supabase) {
      alert('Supabase client is not initialized')
      return
    }
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
    setCurrentImageId('')
  }

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') forceCloseModal()
    }
    document.addEventListener('keydown', handleEscape)
    return () => document.removeEventListener('keydown', handleEscape)
  }, [])

  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString)
      return date.toLocaleString()
    } catch (e) {
      return dateString
    }
  }

  // В секции заголовков таблицы добавляем столбец для email
  const emailHeader = (
    <th 
      style={{ 
        padding: '12px', 
        textAlign: 'left', 
        backgroundColor: 'transparent',
        color: '#d1d5db',
        fontWeight: '600',
        borderBottom: '2px solid #374151',
        borderTop: '1px solid #374151',
        cursor: 'default'
      }}
    >
      Viewer Email
    </th>
  )

  // В секции строк таблицы добавляем ячейку для email
  const emailCell = (record: any, index: number) => (
    <td style={{ 
      padding: '12px',
      borderBottom: index === messages.length - 1 ? '1px solid #374151' : 'none',
      fontFamily: 'monospace',
      fontSize: '13px'
    }}>
      {record.viewer_email ? (
        <span style={{ color: '#60a5fa' }}>{record.viewer_email}</span>
      ) : (
        <span style={{ color: '#9ca3af' }}>Not viewed yet</span>
      )}
    </td>
  )

  if (loading) {
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#111',
        fontFamily: 'Arial, sans-serif'
      }}>
        <div style={{ textAlign: 'center', color: 'white' }}>
          <div style={{ 
            width: '50px', 
            height: '50px', 
            borderRadius: '50%', 
            border: '5px solid rgba(75, 85, 99, 0.2)',
            borderTopColor: '#60a5fa',
            margin: '0 auto',
            animation: 'spin 1s linear infinite'
          }}></div>
          <h2 style={{ marginTop: '20px', fontWeight: '500' }}>Loading...</h2>
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
        backgroundColor: '#111',
        fontFamily: 'Arial, sans-serif'
      }}>
        <div style={{ 
          textAlign: 'center', 
          color: 'white',
          maxWidth: '600px',
          padding: '30px',
          background: 'linear-gradient(to bottom, #1e293b, #111827)',
          borderRadius: '12px',
          boxShadow: '0 10px 30px rgba(0,0,0,0.5)'
        }}>
          <h2 style={{ color: '#ef4444', marginBottom: '20px', fontWeight: '600' }}>Error</h2>
          <p style={{ marginBottom: '20px', lineHeight: '1.6' }}>{error}</p>
          <p style={{ 
            backgroundColor: 'rgba(0,0,0,0.3)', 
            padding: '15px', 
            borderRadius: '8px', 
            fontSize: '14px', 
            lineHeight: '1.7' 
          }}>
            <b>Environment variables:</b> <br/>
            NEXT_PUBLIC_SUPABASE_URL: {process.env.NEXT_PUBLIC_SUPABASE_URL ? 'Set' : 'Not set'} <br/>
            NEXT_PUBLIC_SUPABASE_KEY: {process.env.NEXT_PUBLIC_SUPABASE_KEY ? 'Set' : 'Not set'}
          </p>
          <button 
            onClick={() => router.push('/signin')}
            style={{ 
              marginTop: '25px',
              padding: '12px 25px',
              background: 'linear-gradient(to right, #4f46e5, #3b82f6)',
              border: 'none',
              borderRadius: '8px',
              color: 'white',
              cursor: 'pointer',
              fontWeight: '600',
              transition: 'all 0.2s ease'
            }}
          >
            Go to Sign In
          </button>
        </div>
      </div>
    )
  }

  // Обычный рендеринг страницы с улучшенным дизайном
  return (
    <div style={{ 
      padding: '20px', 
      maxWidth: '1300px', 
      margin: '0 auto',
      backgroundColor: '#0f172a',
      color: 'white',
      minHeight: '100vh',
      fontFamily: 'Arial, sans-serif'
    }}>
      <h1 style={{ 
        fontSize: '28px', 
        marginBottom: '25px',
        color: 'white',
        background: 'linear-gradient(to right, #3b82f6, #8b5cf6)',
        padding: '16px 20px',
        borderRadius: '12px',
        boxShadow: '0 4px 15px rgba(59, 130, 246, 0.3)',
        fontWeight: '700',
        textAlign: 'center'
      }}>
        ADMIN DASHBOARD
      </h1>

      {/* User info */}
      {user && (
        <div style={{ 
          marginBottom: '25px', 
          padding: '16px', 
          background: 'linear-gradient(to bottom right, #1e293b, #111827)',
          borderRadius: '12px',
          boxShadow: '0 4px 15px rgba(0, 0, 0, 0.2)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <p style={{ fontSize: '16px' }}>
            Logged in as: <span style={{ color: '#93c5fd', fontWeight: '600' }}>{user.email}</span>
          </p>
          <button 
            onClick={handleLogout}
            style={{ 
              padding: '10px 16px', 
              backgroundColor: '#ef4444', 
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer',
              fontWeight: '600',
              transition: 'all 0.2s ease'
            }}
            onMouseEnter={e => (e.target as HTMLElement).style.backgroundColor = '#dc2626'}
            onMouseLeave={e => (e.target as HTMLElement).style.backgroundColor = '#ef4444'}
          >
            Sign Out
          </button>
        </div>
      )}

      {/* Upload form */}
      <div style={{ 
        marginBottom: '30px', 
        padding: '25px', 
        boxShadow: 'none'
      }}>
        <h2 style={{ 
          marginBottom: '20px', 
          color: '#60a5fa',
          fontSize: '22px',
          fontWeight: '600',
          borderBottom: '1px solid #374151',
          paddingBottom: '10px'
        }}>Create New Message</h2>

        {/* Переключатель типа сообщения */}
        <div style={{ 
          marginBottom: '20px',
          display: 'flex',
          gap: '15px'
        }}>
          <button
            onClick={() => setMessageType('image')}
            style={{
              padding: '12px 20px',
              borderRadius: '8px',
              border: 'none',
              backgroundColor: messageType === 'image' ? '#3b82f6' : '#1f2937',
              color: 'white',
              fontWeight: messageType === 'image' ? '600' : '400',
              cursor: 'pointer',
              transition: 'all 0.2s'
            }}
          >
            Upload Image
          </button>
          <button
            onClick={() => setMessageType('text')}
            style={{
              padding: '12px 20px',
              borderRadius: '8px',
              border: 'none',
              backgroundColor: messageType === 'text' ? '#3b82f6' : '#1f2937',
              color: 'white',
              fontWeight: messageType === 'text' ? '600' : '400',
              cursor: 'pointer',
              transition: 'all 0.2s'
            }}
          >
            Create Text Message
          </button>
        </div>

        {/* Форма для изображения */}
        {messageType === 'image' && (
          <div style={{ marginBottom: '20px' }}>
            <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500' }}>Select Image</label>
            <input
              type="file"
              accept="image/*"
              onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
              style={{ 
                display: 'block', 
                width: '100%',
                backgroundColor: '#1f2937',
                color: 'white',
                padding: '10px',
                borderRadius: '8px',
                border: '1px solid #374151'
              }}
            />
          </div>
        )}

        {/* Форма для текстового сообщения */}
        {messageType === 'text' && (
          <div style={{ marginBottom: '20px' }}>
            <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500' }}>Message Text</label>
            <textarea
              value={textContent}
              onChange={(e) => setTextContent(e.target.value)}
              style={{ 
                display: 'block', 
                width: '100%',
                backgroundColor: '#1f2937',
                color: 'white',
                padding: '12px',
                borderRadius: '8px',
                border: '1px solid #374151',
                minHeight: '150px',
                fontSize: '16px',
                fontFamily: 'sans-serif',
                resize: 'vertical'
              }}
              placeholder="Enter your message here..."
            />
          </div>
        )}

        {/* Остальные настройки - общие для обоих типов сообщений */}
        <div style={{ 
          marginBottom: '20px',
          display: 'flex',
          alignItems: 'center',
          background: '#1f2937',
          borderRadius: '8px',
          padding: '10px 16px'
        }}>
          <input
            type="checkbox"
            id="deleteAfterView"
            checked={deleteAfterView}
            onChange={(e) => setDeleteAfterView(e.target.checked)}
            style={{
              width: '18px',
              height: '18px',
              accentColor: '#60a5fa'
            }}
          />
          <label 
            htmlFor="deleteAfterView" 
            style={{ 
              marginLeft: '12px', 
              cursor: 'pointer',
              userSelect: 'none'
            }}
          >
            Delete after opening
          </label>
        </div>
        
        <div style={{ marginBottom: '25px' }}>
          <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500' }}>
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
              backgroundColor: '#1f2937',
              color: 'white',
              padding: '12px',
              borderRadius: '8px',
              border: '1px solid #374151',
              fontSize: '16px'
            }}
          />
        </div>
        
        <button
          onClick={handleMessageSubmit}
          disabled={(messageType === 'image' && !selectedFile) || 
                    (messageType === 'text' && !textContent) || 
                    uploading}
          style={{ 
            backgroundColor: uploading ? '#4b5563' : '#3b82f6', 
            color: 'white',
            padding: '14px',
            border: 'none',
            borderRadius: '8px',
            width: '100%',
            fontWeight: '600',
            cursor: uploading ? 'not-allowed' : 'pointer',
            fontSize: '16px',
            transition: 'all 0.2s ease',
            boxShadow: '0 4px 6px rgba(59, 130, 246, 0.25)'
          }}
          onMouseEnter={e => {
            if (!uploading) (e.target as HTMLElement).style.backgroundColor = '#2563eb'
          }}
          onMouseLeave={e => {
            if (!uploading) (e.target as HTMLElement).style.backgroundColor = '#3b82f6'
          }}
        >
          {uploading ? (
            <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <span style={{ 
                width: '20px', 
                height: '20px', 
                borderRadius: '50%', 
                border: '3px solid rgba(255, 255, 255, 0.3)',
                borderTopColor: 'white',
                marginRight: '10px',
                animation: 'spin 1s linear infinite'
              }}></span>
              Processing...
            </span>
          ) : `${messageType === 'image' ? 'Upload Image' : 'Create Text Message'}`}
        </button>
      </div>

      {/* Records Table */}
      <div style={{ 
        padding: '25px',
        borderRadius: '12px',
        boxShadow: 'none'
      }}>
        <div style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center', 
          marginBottom: '20px',
          flexWrap: 'wrap',
          gap: '15px'
        }}>
          <h2 style={{ color: '#60a5fa', fontWeight: '600', fontSize: '22px', margin: 0 }}>
            Records <span style={{ 
              backgroundColor: '#374151', 
              padding: '4px 10px', 
              borderRadius: '999px', 
              fontSize: '16px', 
              marginLeft: '8px'
            }}>
              {messages.length}
            </span>
          </h2>
          <button
            onClick={loadMessages}
            disabled={loadingMessages}
            style={{
              backgroundColor: loadingMessages ? '#4b5563' : '#3b82f6',
              color: 'white',
              padding: '10px 16px',
              border: 'none',
              borderRadius: '8px',
              cursor: loadingMessages ? 'not-allowed' : 'pointer',
              fontWeight: '600',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              transition: 'all 0.2s ease'
            }}
            onMouseEnter={e => {
              if (!loadingMessages) (e.target as HTMLElement).style.backgroundColor = '#2563eb'
            }}
            onMouseLeave={e => {
              if (!loadingMessages) (e.target as HTMLElement).style.backgroundColor = '#3b82f6'
            }}
          >
            {loadingMessages ? (
              <>
                <span style={{ 
                  width: '16px', 
                  height: '16px', 
                  borderRadius: '50%', 
                  border: '3px solid rgba(255, 255, 255, 0.3)',
                  borderTopColor: 'white',
                  animation: 'spin 1s linear infinite'
                }}></span>
                Loading...
              </>
            ) : (
              <>
                <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                Refresh
              </>
            )}
          </button>
        </div>

        {loadingMessages ? (
          <div style={{ textAlign: 'center', padding: '40px 0' }}>
            <div style={{ 
              width: '40px', 
              height: '40px', 
              borderRadius: '50%', 
              border: '4px solid rgba(75, 85, 99, 0.2)',
              borderTopColor: '#60a5fa',
              margin: '0 auto',
              animation: 'spin 1s linear infinite'
            }}></div>
            <p style={{ marginTop: '16px', color: '#9ca3af', fontSize: '16px' }}>Loading records...</p>
          </div>
        ) : messages.length === 0 ? (
          <div style={{ 
            padding: '40px 0', 
            textAlign: 'center',
            backgroundColor: '#1f2937',
            borderRadius: '8px'
          }}>
            <svg width="50" height="50" fill="none" viewBox="0 0 24 24" stroke="#9ca3af" style={{ margin: '0 auto' }}>
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
            </svg>
            <p style={{ color: '#9ca3af', fontSize: '18px', marginTop: '16px' }}>No records found</p>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <style dangerouslySetInnerHTML={{
              __html: `
                @keyframes spin {
                  0% { transform: rotate(0deg); }
                  100% { transform: rotate(360deg); }
                }
                .table-header:hover {
                  background-color: rgba(55, 65, 81, 0.7);
                }
                .sort-indicator {
                  margin-left: 4px;
                  display: inline-block;
                  transition: transform 0.2s;
                }
              `
            }} />
            <table style={{ 
              width: '100%', 
              borderCollapse: 'separate',
              borderSpacing: '0',
              fontSize: '14px'
            }}>
              <thead>
                <tr>
                  <th 
                    className="table-header"
                    onClick={() => handleSort('id')}
                    style={{ 
                      padding: '12px', 
                      textAlign: 'left', 
                      backgroundColor: 'transparent', // Меняем на прозрачный
                      color: '#d1d5db',
                      fontWeight: '600',
                      borderBottom: '2px solid #374151',
                      borderTop: '1px solid #374151',
                      borderLeft: '1px solid #374151',
                      borderTopLeftRadius: '8px',
                      cursor: 'pointer',
                      userSelect: 'none'
                    }}
                  >
                    ID
                    {sortField === 'id' && (
                      <span className="sort-indicator" style={{
                        transform: sortDirection === 'asc' ? 'rotate(180deg)' : 'rotate(0deg)'
                      }}>▼</span>
                    )}
                  </th>
                  <th style={{ 
                    padding: '12px', 
                    textAlign: 'left', 
                    backgroundColor: 'transparent', // Меняем на прозрачный
                    color: '#d1d5db',
                    fontWeight: '600',
                    borderBottom: '2px solid #374151',
                    borderTop: '1px solid #374151',
                    cursor: 'default'
                  }}>Preview</th>
                  <th style={{ 
                    padding: '12px', 
                    textAlign: 'left', 
                    backgroundColor: 'transparent', // Меняем на прозрачный
                    color: '#d1d5db',
                    fontWeight: '600',
                    borderBottom: '2px solid #374151',
                    borderTop: '1px solid #374151',
                    cursor: 'default'
                  }}>Settings</th>
                  <th 
                    className="table-header"
                    onClick={() => handleSort('ip_address')}
                    style={{ 
                      padding: '12px', 
                      textAlign: 'left', 
                      backgroundColor: 'transparent', // Меняем на прозрачный
                      color: '#d1d5db',
                      fontWeight: '600',
                      borderBottom: '2px solid #374151',
                      borderTop: '1px solid #374151',
                      cursor: 'pointer',
                      userSelect: 'none'
                    }}
                  >
                    IP Address
                    {sortField === 'ip_address' && (
                      <span className="sort-indicator" style={{
                        transform: sortDirection === 'asc' ? 'rotate(180deg)' : 'rotate(0deg)'
                      }}>▼</span>
                    )}
                  </th>
                  <th 
                    className="table-header"
                    onClick={() => handleSort('created_at')}
                    style={{ 
                      padding: '12px', 
                      textAlign: 'left', 
                      backgroundColor: 'transparent', // Меняем на прозрачный
                      color: '#d1d5db',
                      fontWeight: '600',
                      borderBottom: '2px solid #374151',
                      borderTop: '1px solid #374151',
                      cursor: 'pointer',
                      userSelect: 'none'
                    }}
                  >
                    Date
                    {sortField === 'created_at' && (
                      <span className="sort-indicator" style={{
                        transform: sortDirection === 'asc' ? 'rotate(180deg)' : 'rotate(0deg)'
                      }}>▼</span>
                    )}
                  </th>
                  <th style={{ 
                    padding: '12px', 
                    textAlign: 'left', 
                    backgroundColor: 'transparent', // Меняем на прозрачный
                    color: '#d1d5db',
                    fontWeight: '600',
                    borderBottom: '2px solid #374151',
                    borderTop: '1px solid #374151',
                    cursor: 'default'
                  }}>Stats</th>
                  <th style={{ 
                    padding: '12px', 
                    textAlign: 'left', 
                    backgroundColor: 'transparent', // Меняем на прозрачный
                    color: '#d1d5db',
                    fontWeight: '600',
                    borderBottom: '2px solid #374151',
                    borderTop: '1px solid #374151',
                    borderRight: '1px solid #374151',
                    borderTopRightRadius: '8px',
                    cursor: 'default'
                  }}>Actions</th>
                  {/* Добавляем новый заголовок для email */}
                  {emailHeader}
                </tr>
              </thead>
              <tbody>
                {messages.map((record, index) => (
                  <tr 
                    key={record.id} 
                    style={{ 
                      backgroundColor: 'transparent', // Полностью прозрачный фон
                      transition: 'background-color 0.2s'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = 'rgba(55, 65, 81, 0.3)' // Полупрозрачный при наведении
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = 'transparent'
                    }}
                  >
                    <td style={{ 
                      padding: '12px',
                      borderLeft: '1px solid #374151',
                      borderBottom: index === messages.length - 1 ? '1px solid #374151' : 'none',
                      borderBottomLeftRadius: index === messages.length - 1 ? '8px' : '0'
                    }}>
                      {record.image_url ? (
                        <a
                          href={`/view/${record.id}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          style={{
                            color: '#60a5fa',
                            textDecoration: 'none',
                            fontFamily: 'monospace',
                            fontWeight: '600',
                            fontSize: '14px'
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.textDecoration = 'underline'
                            e.currentTarget.style.color = '#93c5fd'
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.textDecoration = 'none'
                            e.currentTarget.style.color = '#60a5fa'
                          }}
                        >
                          {record.id}
                        </a>
                      ) : (
                        <span style={{ fontFamily: 'monospace', fontWeight: '500' }}>{record.id}</span>
                      )}
                    </td>
                    <td style={{ 
                      padding: '12px',
                      borderBottom: index === messages.length - 1 ? '1px solid #374151' : 'none'
                    }}>
                      {record.image_url ? (
                        <div style={{ 
                          width: '32px', 
                          height: '32px', 
                          border: '2px solid #60a5fa',
                          borderRadius: '4px',
                          overflow: 'hidden',
                          boxShadow: '0 2px 4px rgba(0, 0, 0, 0.5)'
                        }}>
                          <img
                            src={record.image_url}
                            alt="Preview"
                            style={{
                              width: '100%',
                              height: '100%',
                              objectFit: 'cover',
                            }}
                          />
                        </div>
                      ) : (
                        <div style={{ 
                          width: '32px', 
                          height: '32px', 
                          border: '1px solid #4b5563',
                          borderRadius: '4px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          backgroundColor: '#374151'
                        }}>?</div>
                      )}
                    </td>
                    <td style={{ 
                      padding: '12px',
                      borderBottom: index === messages.length - 1 ? '1px solid #374151' : 'none'
                    }}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        {record.auto_delete && (
                          <div style={{ 
                            color: '#f87171', 
                            backgroundColor: 'rgba(248, 113, 113, 0.1)',
                            borderRadius: '4px',
                            padding: '3px 8px',
                            fontSize: '13px',
                            display: 'inline-block'
                          }}>
                            Delete after view
                          </div>
                        )}
                        {record.expire_at && (
                          <div style={{ 
                            color: '#fbbf24', 
                            backgroundColor: 'rgba(251, 191, 36, 0.1)',
                            borderRadius: '4px',
                            padding: '3px 8px',
                            fontSize: '13px',
                            display: 'inline-block'
                          }}>
                            Expires: {formatDate(record.expire_at)}
                          </div>
                        )}
                        {record.days_to_live && (
                          <div style={{ 
                            color: '#a78bfa', 
                            backgroundColor: 'rgba(167, 139, 250, 0.1)',
                            borderRadius: '4px',
                            padding: '3px 8px',
                            fontSize: '13px',
                            display: 'inline-block'
                          }}>
                            Days: {record.days_to_live}
                          </div>
                        )}
                        {!record.auto_delete && !record.expire_at && (
                          <div style={{ 
                            color: '#34d399', 
                            backgroundColor: 'rgba(52, 211, 153, 0.1)',
                            borderRadius: '4px',
                            padding: '3px 8px',
                            fontSize: '13px',
                            display: 'inline-block'
                          }}>
                            Permanent
                          </div>
                        )}
                      </div>
                    </td>
                    <td style={{ 
                      padding: '12px',
                      borderBottom: index === messages.length - 1 ? '1px solid #374151' : 'none',
                      fontFamily: 'monospace',
                      fontSize: '13px'
                    }}>
                      {record.client_ip || record.ip_address || (
                        <span style={{ color: '#9ca3af' }}>No IP</span>
                      )}
                    </td>
                    <td style={{ 
                      padding: '12px',
                      borderBottom: index === messages.length - 1 ? '1px solid #374151' : 'none'
                    }}>
                      {formatDate(record.created_at)}
                    </td>
                    <td style={{ 
                      padding: '12px',
                      borderBottom: index === messages.length - 1 ? '1px solid #374151' : 'none'
                    }}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        <div style={{ 
                          color: '#60a5fa', 
                          backgroundColor: 'rgba(96, 165, 250, 0.1)',
                          borderRadius: '4px',
                          padding: '3px 8px',
                          fontSize: '13px',
                          display: 'inline-block'
                        }}>
                          Views: {record.views || 0}
                        </div>
                        {record.is_read && (
                          <div style={{ 
                            color: '#34d399', 
                            backgroundColor: 'rgba(52, 211, 153, 0.1)',
                            borderRadius: '4px',
                            padding: '3px 8px',
                            fontSize: '13px',
                            display: 'inline-block'
                          }}>
                            Read
                          </div>
                        )}
                        {record.last_read_at && (
                          <div style={{ 
                            color: '#a78bfa', 
                            backgroundColor: 'rgba(167, 139, 250, 0.1)',
                            borderRadius: '4px',
                            padding: '3px 8px',
                            fontSize: '13px',
                            display: 'inline-block'
                          }}>
                            Last read: {formatDate(record.last_read_at)}
                          </div>
                        )}
                      </div>
                    </td>
                    <td style={{ 
                      padding: '12px',
                      borderRight: '1px solid #374151',
                      borderBottom: index === messages.length - 1 ? '1px solid #374151' : 'none',
                      borderBottomRightRadius: index === messages.length - 1 ? '8px' : '0'
                    }}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        {record.image_url && (
                          <>
                            <button
                              onClick={() => showQRForImage(record.id)}
                              style={{
                                backgroundColor: '#059669',
                                color: 'white',
                                border: 'none',
                                borderRadius: '6px',
                                padding: '8px 12px',
                                cursor: 'pointer',
                                fontWeight: '500',
                                fontSize: '13px',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: '6px',
                                transition: 'background-color 0.2s'
                              }}
                              onMouseEnter={(e) => {
                                e.currentTarget.style.backgroundColor = '#047857'
                              }}
                              onMouseLeave={(e) => {
                                e.currentTarget.style.backgroundColor = '#059669'
                              }}
                            >
                              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
                              </svg>
                              Show QR
                            </button>
                            <button
                              onClick={() => copyToClipboard(`${window.location.origin}/view/${record.id}`)}
                              style={{
                                backgroundColor: '#2563eb',
                                color: 'white',
                                border: 'none',
                                borderRadius: '6px',
                                padding: '8px 12px',
                                cursor: 'pointer',
                                fontWeight: '500',
                                fontSize: '13px',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: '6px',
                                transition: 'background-color 0.2s'
                              }}
                              onMouseEnter={(e) => {
                                e.currentTarget.style.backgroundColor = '#1d4ed8'
                              }}
                              onMouseLeave={(e) => {
                                e.currentTarget.style.backgroundColor = '#2563eb'
                              }}
                            >
                              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
                              </svg>
                              Copy Link
                            </button>
                          </>
                        )}
                        <button
                          onClick={() => deleteRecord(record.id)}
                          style={{
                            backgroundColor: '#dc2626',
                            color: 'white',
                            border: 'none',
                            borderRadius: '6px',
                            padding: '8px 12px',
                            cursor: 'pointer',
                            fontWeight: '500',
                            fontSize: '13px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '6px',
                            transition: 'background-color 0.2s'
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.backgroundColor = '#b91c1c'
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.backgroundColor = '#dc2626'
                          }}
                        >
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                          Delete
                        </button>
                      </div>
                    </td>
                    {/* Ячейка для email */}
                    {emailCell(record, index)}
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
          backdropFilter: 'blur(5px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          animation: 'fadeIn 0.2s ease-out'
        }} onClick={forceCloseModal}>
          <div 
            style={{
              backgroundColor: '#1f2937',
              borderRadius: '16px',
              maxWidth: '400px',
              width: '90%',
              position: 'relative',
              boxShadow: '0 25px 50px rgba(0, 0, 0, 0.25)',
              overflow: 'hidden',
              animation: 'scaleIn 0.3s ease-out',
              border: '1px solid #374151'
            }}
            onClick={e => e.stopPropagation()}
          >
            {/* Header with gradient background */}
            <div style={{
              background: 'linear-gradient(to right, #3b82f6, #8b5cf6)',
              padding: '20px',
              position: 'relative'
            }}>
              <button 
                onClick={forceCloseModal}
                style={{
                  position: 'absolute',
                  top: '12px',
                  right: '12px',
                  border: 'none',
                  backgroundColor: 'rgba(0, 0, 0, 0.2)',
                  color: 'white',
                  width: '30px',
                  height: '30px',
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  fontSize: '18px',
                  fontWeight: '600',
                  transition: 'all 0.2s'
                }}
                onMouseEnter={e => {
                  e.currentTarget.style.backgroundColor = 'rgba(0, 0, 0, 0.4)'
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.backgroundColor = 'rgba(0, 0, 0, 0.2)'
                }}
              >
                ✕
              </button>
              <h3 style={{ 
                color: 'white', 
                margin: 0,
                fontSize: '18px',
                fontWeight: '600'
              }}>
                {modalTitle}
              </h3>
            </div>
            
            {/* QR code container */}
            <div style={{ padding: '24px' }}>
              <div style={{
                backgroundColor: 'white',
                padding: '20px',
                marginBottom: '20px',
                borderRadius: '12px',
                display: 'flex',
                justifyContent: 'center',
                boxShadow: '0 2px 8px rgba(0, 0, 0, 0.15)'
              }}>
                <img 
                  src={qrCodeDataURL}
                  alt="QR Code"
                  style={{
                    width: '200px',
                    height: '200px',
                    objectFit: 'contain'
                  }}
                />
              </div>
              
              <div style={{ marginBottom: '20px' }}>
                <button
                  onClick={downloadQRCode}
                  style={{
                    width: '100%',
                    padding: '12px',
                    backgroundColor: '#059669',
                    color: 'white',
                    border: 'none',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    fontWeight: '600',
                    fontSize: '15px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px',
                    transition: 'all 0.2s'
                  }}
                  onMouseEnter={e => {
                    e.currentTarget.style.backgroundColor = '#047857'
                  }}
                  onMouseLeave={e => {
                    e.currentTarget.style.backgroundColor = '#059669'
                  }}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                  </svg>
                  Download QR Code
                </button>
              </div>
              
              <div style={{ position: 'relative' }}>
                <input
                  type="text"
                  value={generatedLink}
                  readOnly
                  style={{
                    width: '100%',
                    padding: '12px',
                    paddingRight: '110px',
                    backgroundColor: '#111827',
                    border: '1px solid #374151',
                    borderRadius: '8px',
                    color: 'white',
                    cursor: 'pointer',
                    fontSize: '14px',
                    fontFamily: 'monospace'
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
                  backgroundColor: 'rgba(59, 130, 246, 0.2)',
                  borderRadius: '4px',
                  padding: '4px 8px',
                  color: '#60a5fa',
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
                  padding: '12px',
                  backgroundColor: '#4b5563',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  fontWeight: '600',
                  fontSize: '15px',
                  marginTop: '16px',
                  transition: 'all 0.2s'
                }}
                onMouseEnter={e => {
                  e.currentTarget.style.backgroundColor = '#374151'
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.backgroundColor = '#4b5563'
                }}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      <style dangerouslySetInnerHTML={{
        __html: `
          @keyframes fadeIn {
            from { opacity: 0; }
            to { opacity: 1; }
          }
          @keyframes scaleIn {
            from { transform: scale(0.95); opacity: 0; }
            to { transform: scale(1); opacity: 1; }
          }
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        `
      }} />
    </div>
  )
}