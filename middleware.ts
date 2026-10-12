import { NextRequest, NextResponse } from 'next/server';

// Simple middleware - auth protection will be handled in individual pages for now
export function middleware(request: NextRequest) {
  // Allow all requests for now - we'll implement auth protection in page components
  return NextResponse.next();
}

export const config = {
  // Skip static files and api routes
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico|.*\\..*).*)'],
};