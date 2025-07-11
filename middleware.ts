// middleware.ts  (корень)
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { createMiddlewareSupabaseClient } from '@supabase/auth-helpers-nextjs'

const PUBLIC = ['/signin', '/auth/callback', '/favicon.ico']

export async function middleware(req: NextRequest) {
  const res = NextResponse.next()
  const sb  = createMiddlewareSupabaseClient({ req, res })
  const { data: { session } } = await sb.auth.getSession()

  const path = req.nextUrl.pathname
  const open = PUBLIC.some(p => path.startsWith(p))

  if (!session && !open) {
    const url = req.nextUrl.clone()
    url.pathname = '/signin'
    url.searchParams.set('returnTo', path)
    return NextResponse.redirect(url)
  }
  return res
}

export const config = {
  matcher: '/((?!_next/|static/|favicon.ico|.*\\..*).*)',
}
