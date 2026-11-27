import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { decodeJwt } from 'jose'
import {
  isManagementPath,
  isPublicPath,
  normalizeRoleId,
  requiredRoleForPath,
  ROLE_DASHBOARDS,
} from '@/lib/roles'

/*
 * proxy.ts — Middleware của Next.js 16 (thay cho `middleware.ts`).
 *
 * NHIỆM VỤ:
 *   1. Chưa có token -> chặn khỏi route nội bộ, đẩy về /login hoặc /management-login.
 *   2. Có token     -> đã login thì không cho vào lại /login, /register, /management-login.
 *   3. Có token     -> kiểm tra RBAC theo ROUTE_ROLE_GUARDS (lib/roles.ts).
 *   4. Token lỗi/hết hạn -> xoá cookie + redirect về trang login tương ứng.
 *
 * NGUỒN SỰ THẬT VỀ ROLE:
 *   Toàn bộ mapping role -> dashboard và role -> route nằm ở `lib/roles.ts`.
 *   File này KHÔNG định nghĩa lại danh sách role/route nữa.
 */

export function proxy(request: NextRequest) {
  const token = request.cookies.get('token')?.value
  const { pathname } = request.nextUrl

  // Removed early exit for login pages to allow logged-in users to be redirected to their dashboard

  const isStaticFile =
    pathname.startsWith('/_next') ||
    pathname.startsWith('/assets') ||
    pathname.includes('.') ||
    pathname === '/favicon.ico'

  // Danh sách route public + khu vực quản trị lấy từ lib/roles.ts
  const isPublicRoute = isPublicPath(pathname)
  const isManagementContext = isManagementPath(pathname)

  /* =========================
     1. NO TOKEN
     ========================= */
  if (!token) {
    if (isStaticFile || isPublicRoute) {
      return NextResponse.next()
    }

    return NextResponse.redirect(
      new URL(
        isManagementContext ? '/management-login' : '/login',
        request.url
      )
    )
  }

  /* =========================
     2. HAS TOKEN
     ========================= */
  try {
    const payload = decodeJwt(token) as any
    const roleId = normalizeRoleId(
      payload.role_id || payload.roleid || payload.role
    )

    /* =========================
       Đã login → không cho vào login page
       ========================= */
    if (
      pathname === '/login' ||
      pathname === '/management-login' ||
      pathname === '/register'
    ) {
      const dashboard = ROLE_DASHBOARDS[roleId]
      if (!dashboard) return NextResponse.next()

      return NextResponse.redirect(new URL(dashboard, request.url))
    }

    /* =========================
       RBAC — luật chặn lấy từ ROUTE_ROLE_GUARDS (lib/roles.ts)
       ========================= */
    const requiredRole = requiredRoleForPath(pathname)
    if (requiredRole !== null && roleId !== requiredRole) {
      return NextResponse.redirect(new URL('/403', request.url))
    }

    return NextResponse.next()
  } catch (err) {
    /* =========================
       TOKEN LỖI / EXPIRED
       ========================= */
    // Tránh infinite redirect loop nếu đang ở trang login/register
    if (
      pathname.startsWith('/login') ||
      pathname.startsWith('/management-login') ||
      pathname.startsWith('/register')
    ) {
      const response = NextResponse.next()
      response.cookies.delete('token')
      return response
    }

    const response = NextResponse.redirect(
      new URL(
        isManagementContext ? '/management-login' : '/login',
        request.url
      )
    )

    response.cookies.delete('token')
    return response
  }
}

export const config = {
  matcher: [
    '/((?!api|_next/static|_next/image|assets|favicon.ico|sitemap.xml|robots.txt).*)'
  ]
}