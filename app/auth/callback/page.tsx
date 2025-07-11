export const dynamic = 'force-dynamic'   // ← страница — серверная

import CallbackClient from './CallbackClient'

type Props = {
  searchParams: { returnTo?: string }
}

export default function CallbackPage({ searchParams }: Props) {
  const returnTo = searchParams.returnTo ?? '/admin'
  return <CallbackClient returnTo={returnTo} />
}
