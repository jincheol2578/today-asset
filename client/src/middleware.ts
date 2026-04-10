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
  const isAuth = !!session;

  // Public routes — no DB query needed
  if (pathname === '/login' || pathname === '/signup') {
    if (isAuth) {
      // fetch profile to decide redirect
      const { data: profile } = await supabase
        .from('profiles')
        .select('role, status')
        .eq('id', session!.user.id)
        .single();
      if (profile?.status !== 'approved') return NextResponse.redirect(new URL('/pending', request.url));
      return NextResponse.redirect(new URL('/analysis', request.url));
    }
    return response;
  }

  if (!isAuth) return NextResponse.redirect(new URL('/login', request.url));

  // Fetch profile for authenticated routes
  const { data: profile } = await supabase
    .from('profiles')
    .select('role, status')
    .eq('id', session.user.id)
    .single();

  const isApproved = profile?.status === 'approved';
  const role = profile?.role as string | undefined;

  // Pending page
  if (pathname === '/pending') {
    if (isApproved) return NextResponse.redirect(new URL('/analysis', request.url));
    return response;
  }

  if (!isApproved) return NextResponse.redirect(new URL('/pending', request.url));

  // Admin routes
  if (pathname.startsWith('/admin')) {
    if (role !== 'admin') return NextResponse.redirect(new URL('/analysis', request.url));
    return response;
  }

  return response;
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|api/).*)',
  ],
};
