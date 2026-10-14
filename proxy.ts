import { withAuth } from 'next-auth/middleware';
import { NextResponse } from 'next/server';

export default withAuth(
  function middleware(req) {
    const { pathname } = req.nextUrl;
    
    // If user is logged in and tries to access login page, redirect to dashboard
    if (pathname.startsWith('/login') && req.nextauth.token) {
      return NextResponse.redirect(new URL('/dashboard', req.url));
    }
    
    return NextResponse.next();
  },
  {
    callbacks: {
      authorized: ({ token, req }) => {
        const isLoggedIn = !!token;
        const path = req.nextUrl.pathname;
        const isAuthPage = path.startsWith('/login');
        const isPublic = path === '/';

        // Allow access to login page when not logged in
        if (isAuthPage && !isLoggedIn) return true;
        
        // Allow access to public pages
        if (isPublic) return true;
        
        // Require authentication for all other pages
        return isLoggedIn;
      },
    },
    pages: {
      signIn: '/login',
    },
  }
);

export function proxy(request: any) {
  // This is a workaround for Vercel's requirement
  // The actual middleware is handled by the default export above
  return new Response('OK', { status: 200 });
}

export const config = {
  // Skip API routes, static assets, and files with an extension
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico|.*\\..*).*)'],
};