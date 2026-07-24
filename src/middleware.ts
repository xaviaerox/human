import { NextResponse, type NextRequest } from 'next/server';
import { createServerClient } from '@supabase/ssr';

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  });

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  // In static mode or without env vars, allow client-side handling
  if (process.env.NEXT_PUBLIC_DATA_SOURCE === 'static' || !url || !key) {
    return response;
  }

  const supabase = createServerClient(url, key, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({
          request,
        });
        cookiesToSet.forEach(({ name, value, options }) =>
          response.cookies.set(name, value, options)
        );
      },
    },
  });

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const pathname = request.nextUrl.pathname;

  // Protected routes check
  const isParentRoute = pathname.startsWith('/dashboard');
  const isChildRoute =
    pathname.startsWith('/home') ||
    pathname.startsWith('/routines') ||
    pathname.startsWith('/goals') ||
    pathname.startsWith('/checkin') ||
    pathname.startsWith('/rewards');

  if ((isParentRoute || isChildRoute) && !user) {
    const redirectUrl = new URL('/login', request.url);
    return NextResponse.redirect(redirectUrl);
  }

  if (user) {
    const userRole = user.user_metadata?.role as 'parent' | 'child' | undefined;

    // Enforce role-based access: children cannot access parent dashboard
    if (isParentRoute && userRole === 'child') {
      const redirectUrl = new URL('/home', request.url);
      return NextResponse.redirect(redirectUrl);
    }
  }

  return response;
}

export const config = {
  matcher: [
    '/dashboard/:path*',
    '/home/:path*',
    '/routines/:path*',
    '/goals/:path*',
    '/checkin/:path*',
    '/rewards/:path*',
  ],
};
