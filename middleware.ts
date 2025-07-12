// middleware.ts (в корне проекта)
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export default function middleware(req: NextRequest) {
  const { pathname, searchParams } = new URL(req.url)
  // пробрасываем только для защищённых маршрутов
  const protectedPaths = ['/admin', '/message']
  if (protectedPaths.some(p => pathname.startsWith(p))) {
    const returnTo = encodeURIComponent(
      pathname + (searchParams.toString() ? `?${searchParams}` : '')
    )
    return NextResponse.redirect(
      `/signin?returnTo=${returnTo}`
    )
  }
  return NextResponse.next()
}

export const config = { matcher: ['/admin/:path*', '/message/:path*'] }
