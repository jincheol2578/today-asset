import { createServerClient } from '@supabase/ssr';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  let response = NextResponse.next({ request });

  // /login, /signup은 항상 통과 (페이지에서 로그아웃 처리)
  if (pathname === '/login' || pathname === '/signup') {
    return response;
  }

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

  if (!session) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  // 인증된 유저 — profiles 조회
  const { data: profile } = await supabase
    .from('profiles')
    .select('role, status')
    .eq('id', session.user.id)
    .single();

  const isApproved = profile?.status === 'approved';
  const role = profile?.role as string | undefined;

  // /pending 페이지
  if (pathname === '/pending') {
    if (isApproved) return NextResponse.redirect(new URL('/analysis', request.url));
    return response;
  }

  if (!isApproved) {
    return NextResponse.redirect(new URL('/pending', request.url));
  }

  // /admin/* — admin만 접근
  if (pathname.startsWith('/admin')) {
    if (role !== 'admin') return NextResponse.redirect(new URL('/analysis', request.url));
  }

  return response;
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|api/).*)',],
};
