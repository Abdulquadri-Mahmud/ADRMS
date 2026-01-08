import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { decrypt } from '@/lib/session'

export async function proxy(request: NextRequest) {
    const session = request.cookies.get('session')
    const isDashboard = request.nextUrl.pathname.startsWith('/dashboard')
    const isLogin = request.nextUrl.pathname.startsWith('/login')

    if (isDashboard) {
        if (!session) {
            return NextResponse.redirect(new URL('/login', request.url))
        }
        try {
            const payload = await decrypt(session.value)
            if (!payload) return NextResponse.redirect(new URL('/login', request.url))
        } catch (error) {
            return NextResponse.redirect(new URL('/login', request.url))
        }
    }

    if (isLogin && session) {
        // If already logged in, redirect to dashboard
        try {
            await decrypt(session.value)
            return NextResponse.redirect(new URL('/dashboard', request.url))
        } catch (error) {
            // invalid session, allow login
        }
    }

    return NextResponse.next()
}

export const config = {
    matcher: ['/dashboard/:path*', '/login'],
}
