import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { getToken } from '@auth/core/jwt'

export async function middleware(req: NextRequest) {
  const url = req.nextUrl.clone()
  // Protect /dashboard and /api routes
  if (url.pathname.startsWith('/dashboard') || url.pathname.startsWith('/api')) {
    const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET })
    if (!token) {
      url.pathname = '/login'
      return NextResponse.redirect(url)
    }
  }
  return NextResponse.next()
}

export const config = {
  matcher: ['/dashboard/:path*', '/api/:path*'],
}
