import { NextRequest, NextResponse } from 'next/server';
import { getTokens, hasValidTokens } from '@/app/lib/google-photos-storage';
import { GooglePhotosClient } from '@/app/lib/google-photos-client';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ albumId: string }> }
) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const sessionId = searchParams.get('sessionId');
    const pageToken = searchParams.get('pageToken');
    const pageSize = parseInt(searchParams.get('pageSize') || '100', 10);

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

    const { albumId } = await params;

    // Initialize Google Photos client
    const client = new GooglePhotosClient(tokens.accessToken, tokens.refreshToken);

    // Fetch media items from album
    const { mediaItems, nextPageToken } = await client.searchMediaItems(
      albumId,
      pageSize,
      pageToken || undefined
    );

    // Transform to our format
    const transformedItems = mediaItems.map((item) => {
      const isVideo = item.mimeType.startsWith('video/');
      
      return {
        id: item.id,
        filename: item.filename,
        mimeType: item.mimeType,
        type: isVideo ? 'video' : 'image',
        baseUrl: item.baseUrl,
        thumbnailUrl: client.getThumbnailUrl(item.baseUrl, 400, 400),
        createdAt: item.mediaMetadata.creationTime,
        width: parseInt(item.mediaMetadata.width, 10),
        height: parseInt(item.mediaMetadata.height, 10),
      };
    });

    return NextResponse.json({
      photos: transformedItems,
      nextPageToken,
      hasMore: !!nextPageToken,
    });
  } catch (error: any) {
    console.error('Error fetching Google Photos media items:', error);
    
    // Handle token expiration
    if (error.message?.includes('401') || error.message?.includes('invalid_grant')) {
      return NextResponse.json(
        { error: 'Authentication expired. Please reconnect to Google Photos.' },
        { status: 401 }
      );
    }

    return NextResponse.json(
      { error: error.message || 'Failed to fetch photos' },
      { status: 500 }
    );
  }
}
