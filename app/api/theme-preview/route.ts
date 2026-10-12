import { NextRequest, NextResponse } from 'next/server';

// Simple API for theme preview - no authentication required for demo
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { mode, palette } = body;

    // This is just for demo - in production you'd save to database
    // For now, we just return success so the client can handle the preview
    
    return NextResponse.json({ 
      success: true, 
      message: 'Theme preview updated',
      mode,
      palette 
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: 'Invalid request' },
      { status: 400 }
    );
  }
}

export async function GET() {
  // Return current theme state for client
  return NextResponse.json({
    success: true,
    message: 'Theme preview API is working'
  });
}