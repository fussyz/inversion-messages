import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

/* Пути, куда пускаем без логина */
const PUBLIC = ['/signin', '/auth/callback', '/favicon.ico']

export function middleware(req: NextRequest) {
  const token = req.cookies.get('sb-access-token')?.value
  const path  = req.nextUrl.pathname
  const open  = PUBLIC.some(p => path.startsWith(p))

  /* Нет токена и путь не публичный → редирект на /signin */
  if (!token && !open) {
    const url = req.nextUrl.clone()
    url.pathname = '/signin'
    url.searchParams.set('returnTo', path)
    return NextResponse.redirect(url)
  }

  return NextResponse.next()
}

export const config = {
  matcher: '/((?!_next/|static/|favicon.ico|.*\\..*).*)',
}
