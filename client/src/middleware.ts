import { createServerClient } from '@supabase/ssr';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return request.cookies.getAll(); },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const { data: { session } } = await supabase.auth.getSession();
  const role = session?.user?.user_metadata?.role as string | undefined;
  const status = session?.user?.user_metadata?.status as string | undefined;

  const isAuth = !!session;
  const isApproved = status === 'approved';

  // Public routes
  if (pathname === '/login' || pathname === '/signup') {
    if (isAuth) {
      if (!isApproved) return NextResponse.redirect(new URL('/pending', request.url));
      return NextResponse.redirect(new URL('/analysis', request.url));
    }
    return response;
  }

  // Pending page
  if (pathname === '/pending') {
    if (!isAuth) return NextResponse.redirect(new URL('/login', request.url));
    if (isApproved) return NextResponse.redirect(new URL('/analysis', request.url));
    return response;
  }

  // Admin routes
  if (pathname.startsWith('/admin')) {
    if (!isAuth) return NextResponse.redirect(new URL('/login', request.url));
    if (!isApproved) return NextResponse.redirect(new URL('/pending', request.url));
    if (role !== 'admin') return NextResponse.redirect(new URL('/analysis', request.url));
    return response;
  }

  // Dashboard routes
  if (!isAuth) return NextResponse.redirect(new URL('/login', request.url));
  if (!isApproved) return NextResponse.redirect(new URL('/pending', request.url));

  return response;
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|api/).*)',
  ],
};
