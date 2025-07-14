// app/admin/page.tsx
'use client'

// DESIGN UPDATE: TEST BRIGHT COLORS - WILL BE CLEARLY VISIBLE IF APPLIED
export const dynamic = 'force-dynamic'

import AdminNewPage from './admin-new'

export default function AdminPage() {
  // Просто возвращаем новый компонент админки
  return <AdminNewPage />
}