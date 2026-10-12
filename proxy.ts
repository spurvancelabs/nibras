import { NextRequest, NextResponse } from 'next/server';

// Simple proxy configuration - auth protection handled in page components
export default function proxy(request: NextRequest) {
  // Allow all requests - authentication is handled at the page level
  return NextResponse.next();
}

export const config = {
  // Skip static files and api routes
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico|.*\\..*).*)'],
};