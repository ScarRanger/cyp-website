import { NextRequest, NextResponse } from 'next/server';
import { getTokens, deleteTokens } from '@/app/lib/google-photos-storage';

/**
 * Completely revoke Google OAuth token and clear all stored data
 * This forces a fresh authorization next time
 */
export async function POST(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const sessionId = searchParams.get('sessionId');

    if (!sessionId) {
      return NextResponse.json(
        { error: 'Session ID is required' },
        { status: 400 }
      );
    }

    const tokens = await getTokens(sessionId);

    // Revoke the token with Google
    if (tokens?.accessToken) {
      try {
        console.log('🔄 Revoking token with Google...');
        const revokeResponse = await fetch(
          `https://oauth2.googleapis.com/revoke?token=${tokens.accessToken}`,
          { method: 'POST' }
        );
        
        if (revokeResponse.ok) {
          console.log('✅ Token revoked successfully with Google');
        } else {
          console.log('⚠️  Token revoke response:', revokeResponse.status);
        }
      } catch (err) {
        console.error('Error revoking token:', err);
      }
    }

    // Delete from our storage
    await deleteTokens(sessionId);
    console.log('✅ Deleted tokens from storage');

    const response = NextResponse.json({ 
      success: true,
      message: 'Token revoked and cleared. Please reconnect to get fresh authorization.' 
    });

    // Clear session cookie
    response.cookies.delete('googlePhotosSessionId');

    return response;
  } catch (error: any) {
    console.error('Error revoking token:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to revoke token' },
      { status: 500 }
    );
  }
}
