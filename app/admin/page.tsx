// app/admin/page.tsx
'use client'

import dynamic from 'next/dynamic'

// Dynamically import the admin component with no SSR
const AdminNewPage = dynamic(() => import('./admin-new'), { ssr: false })

// This prevents prerendering during build
export default function AdminPage() {
  return <AdminNewPage />
}