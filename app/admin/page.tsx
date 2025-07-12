// Это серверный «обёрточный» компонент, никакого window-кода тут нет.
export const dynamic = 'force-dynamic'

import dynamic from 'next/dynamic'

// Динамически подгружаем только в браузере весь наш настоящий Admin UI
const AdminPageClient = dynamic(
  () => import('./AdminPageClient'),
  { ssr: false }
)

export default function AdminPage() {
  return <AdminPageClient />
}
