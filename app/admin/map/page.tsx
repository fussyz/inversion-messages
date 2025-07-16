'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@supabase/supabase-js'
import dynamic from 'next/dynamic'

// Динамически загружаем карту (нужно для SSR)
const MapContainer = dynamic(() => import('react-leaflet').then(mod => mod.MapContainer), { ssr: false })
const TileLayer = dynamic(() => import('react-leaflet').then(mod => mod.TileLayer), { ssr: false })
const Marker = dynamic(() => import('react-leaflet').then(mod => mod.Marker), { ssr: false })
const Popup = dynamic(() => import('react-leaflet').then(mod => mod.Popup), { ssr: false })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
const supabase = supabaseUrl && supabaseKey ? createClient(supabaseUrl, supabaseKey) : null

interface ViewerLocation {
  id: string
  ip_address: string
  latitude: number
  longitude: number
  city?: string
  country?: string
  message_id: string
  viewed_at: string
  viewer_email?: string
}

export default function MapPage() {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [user, setUser] = useState<{ email: string } | null>(null)
  const [locations, setLocations] = useState<ViewerLocation[]>([])
  const [isMapReady, setIsMapReady] = useState(false)
  const router = useRouter()

  useEffect(() => {
    // Загружаем стили Leaflet
    const link = document.createElement('link')
    link.rel = 'stylesheet'
    link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css'
    document.head.appendChild(link)

    // Настраиваем иконки Leaflet
    if (typeof window !== 'undefined') {
      const L = require('leaflet')
      delete (L.Icon.Default.prototype as any)._getIconUrl
      L.Icon.Default.mergeOptions({
        iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
        iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
        shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
      })
      setIsMapReady(true)
    }

    return () => {
      document.head.removeChild(link)
    }
  }, [])

  useEffect(() => {
    const checkAuth = async () => {
      try {
        if (!supabase) {
          setError('Supabase client is not initialized')
          setLoading(false)
          return
        }

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
          await loadViewerLocations()
        }
        
        setLoading(false)
      } catch (error) {
        console.error('Auth error:', error)
        setError('Unexpected error: ' + (error instanceof Error ? error.message : String(error)))
        setLoading(false)
      }
    }

    checkAuth()
  }, [router])

  const loadViewerLocations = async () => {
    if (!supabase) return

    try {
      // Получаем сообщения с IP-адресами
      const { data: messages, error } = await supabase
        .from('messages')
        .select('id, ip_address, client_ip, viewer_email, last_read_at')
        .not('ip_address', 'is', null)

      if (error) {
        console.error('Error loading messages:', error)
        return
      }

      const locationsWithCoords: ViewerLocation[] = []

      // Для каждого IP получаем геолокацию
      for (const message of messages || []) {
        const ip = message.ip_address || message.client_ip
        if (ip && ip !== '127.0.0.1' && ip !== 'localhost') {
          try {
            const location = await getLocationFromIP(ip)
            if (location) {
              locationsWithCoords.push({
                id: `${message.id}-${ip}`,
                ip_address: ip,
                latitude: location.lat,
                longitude: location.lon,
                city: location.city,
                country: location.country,
                message_id: message.id,
                viewed_at: message.last_read_at || new Date().toISOString(),
                viewer_email: message.viewer_email
              })
            }
          } catch (error) {
            console.error(`Error getting location for IP ${ip}:`, error)
          }
        }
      }

      setLocations(locationsWithCoords)
    } catch (error) {
      console.error('Error loading viewer locations:', error)
      setError('Failed to load viewer locations')
    }
  }

  const getLocationFromIP = async (ip: string) => {
    try {
      // Используем HTTPS вместо HTTP для продакшена
      const response = await fetch(`https://ip-api.com/json/${ip}`)
      const data = await response.json()
      
      if (data.status === 'success') {
        return {
          lat: data.lat,
          lon: data.lon,
          city: data.city,
          country: data.country
        }
      }
      return null
    } catch (error) {
      console.error('Error fetching location:', error)
      return null
    }
  }

  const handleLogout = async () => {
    if (!supabase) return
    await supabase.auth.signOut()
    router.push('/signin')
  }

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
          <h2 style={{ marginTop: '20px', fontWeight: '500' }}>Загрузка карты...</h2>
        </div>
      </div>
    )
  }

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
          borderRadius: '12px'
        }}>
          <h2 style={{ color: '#ef4444', marginBottom: '20px' }}>Ошибка</h2>
          <p>{error}</p>
          <button 
            onClick={() => router.push('/admin')}
            style={{ 
              marginTop: '20px',
              padding: '12px 25px',
              background: 'linear-gradient(to right, #4f46e5, #3b82f6)',
              border: 'none',
              borderRadius: '8px',
              color: 'white',
              cursor: 'pointer'
            }}
          >
            Вернуться в админку
          </button>
        </div>
      </div>
    )
  }

  return (
    <div style={{ 
      padding: '20px', 
      maxWidth: '1400px', 
      margin: '0 auto',
      backgroundColor: '#0f172a',
      color: 'white',
      minHeight: '100vh',
      fontFamily: 'Arial, sans-serif'
    }}>
      {/* Header */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '25px',
        padding: '16px 20px',
        background: 'linear-gradient(to right, #3b82f6, #8b5cf6)',
        borderRadius: '12px'
      }}>
        <h1 style={{ 
          fontSize: '28px', 
          margin: 0,
          fontWeight: '700'
        }}>
          КАРТА ЗРИТЕЛЕЙ
        </h1>
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
          <button
            onClick={() => router.push('/admin')}
            style={{
              padding: '10px 16px',
              backgroundColor: 'rgba(255, 255, 255, 0.2)',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer',
              fontWeight: '600'
            }}
          >
            Назад в админку
          </button>
          <button 
            onClick={handleLogout}
            style={{ 
              padding: '10px 16px', 
              backgroundColor: '#ef4444', 
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer',
              fontWeight: '600'
            }}
          >
            Выйти
          </button>
        </div>
      </div>

      {/* Stats */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
        gap: '16px',
        marginBottom: '25px'
      }}>
        <div style={{
          padding: '20px',
          background: 'linear-gradient(to bottom right, #1e293b, #111827)',
          borderRadius: '12px',
          textAlign: 'center'
        }}>
          <h3 style={{ margin: '0 0 8px 0', color: '#60a5fa', fontSize: '18px' }}>
            Всего локаций
          </h3>
          <p style={{ margin: 0, fontSize: '32px', fontWeight: '700', color: 'white' }}>
            {locations.length}
          </p>
        </div>
        <div style={{
          padding: '20px',
          background: 'linear-gradient(to bottom right, #1e293b, #111827)',
          borderRadius: '12px',
          textAlign: 'center'
        }}>
          <h3 style={{ margin: '0 0 8px 0', color: '#34d399', fontSize: '18px' }}>
            Уникальных стран
          </h3>
          <p style={{ margin: 0, fontSize: '32px', fontWeight: '700', color: 'white' }}>
            {new Set(locations.map(l => l.country)).size}
          </p>
        </div>
      </div>

      {/* Map */}
      <div style={{
        height: '600px',
        borderRadius: '12px',
        overflow: 'hidden',
        border: '1px solid #374151'
      }}>
        {isMapReady && typeof window !== 'undefined' && (
          <MapContainer
            center={[55.7558, 37.6173]} // Москва по умолчанию
            zoom={2}
            style={{ height: '100%', width: '100%' }}
          >
            <TileLayer
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            />
            {locations.map((location) => (
              <Marker
                key={location.id}
                position={[location.latitude, location.longitude]}
              >
                <Popup>
                  <div style={{ color: '#000', fontFamily: 'Arial, sans-serif' }}>
                    <strong>IP:</strong> {location.ip_address}<br/>
                    <strong>Город:</strong> {location.city || 'Неизвестно'}<br/>
                    <strong>Страна:</strong> {location.country || 'Неизвестно'}<br/>
                    <strong>Сообщение ID:</strong> {location.message_id}<br/>
                    <strong>Дата просмотра:</strong> {new Date(location.viewed_at).toLocaleString()}<br/>
                    {location.viewer_email && (
                      <>
                        <strong>Email:</strong> {location.viewer_email}<br/>
                      </>
                    )}
                  </div>
                </Popup>
              </Marker>
            ))}
          </MapContainer>
        )}
      </div>

      {/* Locations List */}
      <div style={{ marginTop: '30px' }}>
        <h2 style={{ 
          marginBottom: '20px', 
          color: '#60a5fa',
          fontSize: '22px',
          fontWeight: '600'
        }}>
          Список локаций ({locations.length})
        </h2>
        
        {locations.length === 0 ? (
          <div style={{ 
            padding: '40px', 
            textAlign: 'center',
            backgroundColor: '#1f2937',
            borderRadius: '8px'
          }}>
            <p style={{ color: '#9ca3af', fontSize: '18px' }}>
              Пока нет данных о локациях зрителей
            </p>
          </div>
        ) : (
          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', 
            gap: '16px' 
          }}>
            {locations.map((location) => (
              <div
                key={location.id}
                style={{
                  padding: '16px',
                  background: 'linear-gradient(to bottom right, #1e293b, #111827)',
                  borderRadius: '8px',
                  border: '1px solid #374151'
                }}
              >
                <div style={{ marginBottom: '8px' }}>
                  <strong style={{ color: '#60a5fa' }}>IP:</strong> {location.ip_address}
                </div>
                <div style={{ marginBottom: '8px' }}>
                  <strong style={{ color: '#34d399' }}>Локация:</strong> {location.city}, {location.country}
                </div>
                <div style={{ marginBottom: '8px' }}>
                  <strong style={{ color: '#fbbf24' }}>Сообщение:</strong> {location.message_id}
                </div>
                <div style={{ marginBottom: '8px' }}>
                  <strong style={{ color: '#a78bfa' }}>Просмотрено:</strong> {new Date(location.viewed_at).toLocaleString()}
                </div>
                {location.viewer_email && (
                  <div>
                    <strong style={{ color: '#f87171' }}>Email:</strong> {location.viewer_email}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      <style dangerouslySetInnerHTML={{
        __html: `
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        `
      }} />
    </div>
  )
}