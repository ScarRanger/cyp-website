import { NextRequest, NextResponse } from 'next/server';
import { deleteTokens, getTokens } from '@/app/lib/google-photos-storage';

export async function POST(request: NextRequest) {
  try {
    const { sessionId } = await request.json();

    if (!sessionId) {
      return NextResponse.json(
        { error: 'Session ID is required' },
        { status: 400 }
      );
    }

    // Verify session exists (now async)
    const tokens = await getTokens(sessionId);
    if (!tokens) {
      return NextResponse.json(
        { error: 'No active session found' },
        { status: 404 }
      );
    }

    // Delete the stored tokens (now async)
    await deleteTokens(sessionId);

    const response = NextResponse.json({ success: true });
    
    // Clear session cookie
    response.cookies.delete('googlePhotosSessionId');
    
    return response;
  } catch (error: any) {
    console.error('Error disconnecting Google Photos:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to disconnect' },
      { status: 500 }
    );
  }
}
