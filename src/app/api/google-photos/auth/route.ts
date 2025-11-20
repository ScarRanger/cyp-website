import { NextRequest, NextResponse } from 'next/server';
import { getAuthorizationUrl } from '@/app/lib/google-photos-client';
import { generateSessionId } from '@/app/lib/google-photos-storage';

export async function GET(request: NextRequest) {
  try {
    // Generate a session ID to track this auth flow
    const sessionId = generateSessionId();
    
    // Get the authorization URL
    const authUrl = getAuthorizationUrl(sessionId);
    
    // Return the auth URL and session ID
    return NextResponse.json({
      authUrl,
      sessionId,
    });
  } catch (error: any) {
    console.error('Error initiating Google Photos auth:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to initiate authorization' },
      { status: 500 }
    );
  }
}
