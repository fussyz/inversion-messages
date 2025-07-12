// app/admin/page.tsx
export const dynamic = 'force-dynamic'   // 👉 не SSG/SSR

import AdminPageClient from './AdminPageClient'

export default function AdminPage() {
  return <AdminPageClient />
}
