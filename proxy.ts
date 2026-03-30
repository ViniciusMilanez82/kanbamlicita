import { auth } from '@/auth'
import { NextResponse } from 'next/server'

export const proxy = auth((request) => {
  const { pathname } = request.nextUrl
  const isLoggedIn = !!request.auth?.user

  // Se está na página de login e já está logado, redirecionar para o kanban
  if (pathname === '/login' && isLoggedIn) {
    return NextResponse.redirect(new URL('/kanban', request.url))
  }

  // Se NÃO está logado e NÃO está na página de login, redirecionar para login
  if (!isLoggedIn && pathname !== '/login') {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  // Caso contrário, deixar passar
  return NextResponse.next()
})

export const config = {
  matcher: [
    '/((?!api|_next/static|_next/image|favicon\\.ico|sitemap\\.xml|robots\\.txt).*)',
  ],
}
