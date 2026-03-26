import { auth } from '@/auth'
import { NextResponse } from 'next/server'

export const proxy = auth((request) => {
  // If we reach here, request.auth contains the session (user is authenticated)
  // Redirect from /login to /kanban if already logged in
  if (request.nextUrl.pathname === '/login') {
    return NextResponse.redirect(new URL('/kanban', request.url))
  }
  // All other routes: let pass (auth() redirects to /login if not authenticated based on pages.signIn config)
})

export const config = {
  matcher: [
    '/((?!api/auth|_next/static|_next/image|favicon\\.ico|sitemap\\.xml|robots\\.txt).*)',
  ],
}
