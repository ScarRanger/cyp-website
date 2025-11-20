import { NextRequest, NextResponse } from 'next/server';
import { getTokens, hasValidTokens } from '@/app/lib/google-photos-storage';
import { GooglePhotosClient } from '@/app/lib/google-photos-client';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const sessionId = searchParams.get('sessionId');
    const pageToken = searchParams.get('pageToken');
    const pageSize = parseInt(searchParams.get('pageSize') || '50', 10);

    if (!sessionId) {
      return NextResponse.json(
        { error: 'Session ID is required' },
        { status: 400 }
      );
    }

    if (!(await hasValidTokens(sessionId))) {
      return NextResponse.json(
        { error: 'Not authenticated. Please connect to Google Photos first.' },
        { status: 401 }
      );
    }

    const tokens = await getTokens(sessionId);
    if (!tokens) {
      return NextResponse.json(
        { error: 'Session not found' },
        { status: 401 }
      );
    }

    console.log('🔍 Token info:');
    console.log('  - Has access token:', !!tokens.accessToken);
    console.log('  - Token length:', tokens.accessToken?.length);
    console.log('  - Token preview:', tokens.accessToken?.substring(0, 20) + '...');
    console.log('  - Expiry:', tokens.expiryDate ? new Date(tokens.expiryDate).toISOString() : 'none');
    console.log('  - Is expired:', tokens.expiryDate ? tokens.expiryDate < Date.now() : false);

    // Verify token scopes by calling Google's tokeninfo endpoint
    try {
      const tokenInfoResponse = await fetch(`https://www.googleapis.com/oauth2/v1/tokeninfo?access_token=${tokens.accessToken}`);
      const tokenInfo = await tokenInfoResponse.json();
      console.log('🔍 Token verification from Google:');
      console.log('  - Scope in token:', tokenInfo.scope);
      console.log('  - Audience:', tokenInfo.audience);
      console.log('  - Expires in:', tokenInfo.expires_in, 'seconds');
      
      // Normalize and check for either full or readonly photoslibrary scopes
      const scopes = (tokenInfo.scope || '').split(/\s+/).filter(Boolean);
      const hasPhotosScope = scopes.includes('https://www.googleapis.com/auth/photoslibrary')
        || scopes.includes('https://www.googleapis.com/auth/photoslibrary.readonly')
        || scopes.includes('photoslibrary')
        || scopes.includes('photoslibrary.readonly');

      if (!hasPhotosScope) {
        console.error('❌ TOKEN DOES NOT HAVE PHOTOS LIBRARY SCOPE!');
        console.error('   Token only has:', tokenInfo.scope);
      } else {
        console.log('  - Photos scope present:', scopes.filter((s: string) => s.includes('photoslibrary')).join(', '));
      }
    } catch (err) {
      console.error('Failed to verify token:', err);
    }

    // Initialize Google Photos client with refresh token for auto-refresh
    const client = new GooglePhotosClient(tokens.accessToken, tokens.refreshToken);

    // Fetch albums
    const { albums, nextPageToken } = await client.listAlbums(pageSize, pageToken || undefined);

    // Transform to our format
    const transformedAlbums = albums.map((album) => ({
      id: album.id,
      title: album.title,
      mediaItemsCount: parseInt(album.mediaItemsCount || '0', 10),
      coverPhotoUrl: album.coverPhotoBaseUrl 
        ? client.getThumbnailUrl(album.coverPhotoBaseUrl, 400, 400)
        : undefined,
    }));

    return NextResponse.json({
      albums: transformedAlbums,
      nextPageToken,
      hasMore: !!nextPageToken,
    });
  } catch (error: any) {
    console.error('Error fetching Google Photos albums:', error);
    
    // Handle token expiration
    if (error.message?.includes('401') || error.message?.includes('invalid_grant')) {
      return NextResponse.json(
        { error: 'Authentication expired. Please reconnect to Google Photos.' },
        { status: 401 }
      );
    }

    return NextResponse.json(
      { error: error.message || 'Failed to fetch albums' },
      { status: 500 }
    );
  }
}
