import { NextResponse, type NextRequest } from 'next/server';

// 모든 페이지가 클라이언트 컴포넌트이므로 미들웨어 인증 불필요
// 세션 관리는 useAuth 훅에서 localStorage 기반으로 처리
export function middleware(request: NextRequest) {
  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|api/).*)',],
};
