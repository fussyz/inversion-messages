import { NextResponse } from 'next/server'

export function middleware() {
  /*  ⬇️  просто всегда пропускаем  */
  return NextResponse.next()
}
