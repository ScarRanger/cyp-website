import { NextRequest, NextResponse } from 'next/server';
import { getTokensFromCode } from '@/app/lib/google-photos-client';
import { storeTokens } from '@/app/lib/google-photos-storage';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const code = searchParams.get('code');
    const state = searchParams.get('state'); // This is our sessionId
    const error = searchParams.get('error');

    if (error) {
      // User denied access or error occurred
      return NextResponse.redirect(
        new URL(`/admin/google-photos?error=${encodeURIComponent(error)}`, request.url)
      );
    }

    if (!code || !state) {
      return NextResponse.redirect(
        new URL('/admin/google-photos?error=missing_code', request.url)
      );
    }

    // Exchange code for tokens
    const tokens = await getTokensFromCode(code);

    if (!tokens.access_token) {
      throw new Error('No access token received');
    }

    // Log the scope to verify it's correct
    console.log('🔍 Token scope:', tokens.scope);
    console.log('🔍 Has refresh token:', !!tokens.refresh_token);
    
    // Check token details from Google
    try {
      const tokenInfoResponse = await fetch(`https://www.googleapis.com/oauth2/v1/tokeninfo?access_token=${tokens.access_token}`);
      const tokenInfo = await tokenInfoResponse.json();
      console.log('🔍 Token issued for user:', tokenInfo.email);
      console.log('🔍 Issued by:', tokenInfo.issued_to);
      console.log('🔍 User ID:', tokenInfo.user_id);
      
      // Most important - verify this matches your project
      console.log('');
      console.log('⚠️  CRITICAL: Verify this Client ID matches your GCP OAuth client:');
      console.log('   ', tokenInfo.audience || tokenInfo.issued_to);
      console.log('   Expected:', process.env.GOOGLE_PHOTOS_CLIENT_ID);
      console.log('   Match:', (tokenInfo.audience || tokenInfo.issued_to) === process.env.GOOGLE_PHOTOS_CLIENT_ID);
      console.log('');
    } catch (err) {
      console.error('Could not verify token details:', err);
    }

    // Store tokens with session ID (now async with Firestore persistence)
    await storeTokens(state, {
      accessToken: tokens.access_token,
      refreshToken: tokens.refresh_token || undefined,
      expiryDate: tokens.expiry_date || undefined,
    });

    // Redirect back to Google Photos admin page with success
    const redirectUrl = new URL('/admin/google-photos', request.url);
    redirectUrl.searchParams.set('sessionId', state);
    redirectUrl.searchParams.set('connected', 'true');
    
    const response = NextResponse.redirect(redirectUrl);
    
    // Set session cookie for persistence (30 days)
    response.cookies.set('googlePhotosSessionId', state, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 30 * 24 * 60 * 60, // 30 days
      path: '/',
    });
    
    return response;
  } catch (error: any) {
    console.error('Error in Google Photos OAuth callback:', error);
    return NextResponse.redirect(
      new URL(`/admin/google-photos?error=${encodeURIComponent(error.message)}`, request.url)
    );
  }
}
