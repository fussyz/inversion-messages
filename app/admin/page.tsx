// app/admin/page.tsx

export const dynamic = 'force-dynamic'

import dyn from 'next/dynamic'

// динамически (только в браузере) подгружаем клиентский UI
const AdminPageClient = dyn(
  () => import('./AdminPageClient'),
  { ssr: false }
)

export default function AdminPage() {
  return <AdminPageClient />
}
