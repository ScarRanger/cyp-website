import { NextRequest, NextResponse } from 'next/server';
import { getTokens, hasValidTokens } from '@/app/lib/google-photos-storage';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    let sessionId = searchParams.get('sessionId');
    
    // If no sessionId in params, check cookie
    if (!sessionId) {
      sessionId = request.cookies.get('googlePhotosSessionId')?.value || null;
    }

    if (!sessionId) {
      return NextResponse.json({
        connected: false,
        sessionId: null,
      });
    }

    // Check if valid tokens exist (now async with auto-refresh)
    const isConnected = await hasValidTokens(sessionId);
    const tokens = await getTokens(sessionId);

    return NextResponse.json({
      connected: isConnected,
      sessionId: isConnected ? sessionId : null,
      hasRefreshToken: !!tokens?.refreshToken,
    });
  } catch (error: any) {
    console.error('Error checking Google Photos connection:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to check connection status' },
      { status: 500 }
    );
  }
}
