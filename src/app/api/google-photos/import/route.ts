import { NextRequest, NextResponse } from 'next/server';
import { getTokens, hasValidTokens } from '@/app/lib/google-photos-storage';
import { GooglePhotosClient } from '@/app/lib/google-photos-client';
import { s3, S3_BUCKET, S3_PUBLIC_BASEURL } from '@/app/lib/s3';
import { PutObjectCommand } from '@aws-sdk/client-s3';
import { randomUUID } from 'node:crypto';
import type { GalleryItem } from '@/app/types/gallery';

interface ImportRequest {
  sessionId: string;
  mediaItemIds: string[];
  category: string;
  categoryLabel: string;
  year: number;
  eventId?: string;
}

export async function POST(request: NextRequest) {
  try {
    const body: ImportRequest = await request.json();
    const { sessionId, mediaItemIds, category, categoryLabel, year, eventId } = body;

    // Validation
    if (!sessionId || !mediaItemIds || !Array.isArray(mediaItemIds) || mediaItemIds.length === 0) {
      return NextResponse.json(
        { error: 'Session ID and media item IDs are required' },
        { status: 400 }
      );
    }

    if (!category || /^\d{4}$/.test(category)) {
      return NextResponse.json(
        { error: 'Valid category is required (cannot be a year value)' },
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

    // Initialize Google Photos client
    const client = new GooglePhotosClient(tokens.accessToken, tokens.refreshToken);

    // Process media items in batches
    const results: { success: GalleryItem[]; failed: Array<{ id: string; error: string }> } = {
      success: [],
      failed: [],
    };

    const batchSize = 5; // Process 5 items at a time
    for (let i = 0; i < mediaItemIds.length; i += batchSize) {
      const batch = mediaItemIds.slice(i, i + batchSize);
      
      await Promise.all(
        batch.map(async (mediaItemId) => {
          try {
            // Fetch media item details
            const mediaItem = await client.getMediaItem(mediaItemId);
            
            const isVideo = mediaItem.mimeType.startsWith('video/');
            const fileType = isVideo ? 'video' : 'image';
            
            // Download the media file
            const buffer = await client.downloadMediaItem(mediaItem);
            
            // Generate S3 key
            const ext = mediaItem.filename.split('.').pop() || (isVideo ? 'mp4' : 'jpg');
            const key = `gallery/assets/${year}/${fileType}/${category}/${randomUUID()}.${ext}`;
            
            // Upload to S3
            await s3.send(
              new PutObjectCommand({
                Bucket: S3_BUCKET,
                Key: key,
                Body: buffer,
                ContentType: mediaItem.mimeType,
                CacheControl: 'public, max-age=31536000, immutable',
              })
            );
            
            // Generate public URL
            const base = S3_PUBLIC_BASEURL || `https://${S3_BUCKET}.s3.amazonaws.com`;
            const publicUrl = `${base}${base.endsWith('/') ? '' : '/'}${key}`;
            
            // Generate thumbnail URL for videos
            let thumbnailUrl: string | undefined;
            if (isVideo) {
              thumbnailUrl = client.getThumbnailUrl(mediaItem.baseUrl, 800, 600);
            }
            
            // Create gallery item
            const galleryItem: GalleryItem = {
              id: randomUUID(),
              type: fileType,
              title: mediaItem.filename,
              url: publicUrl,
              key,
              thumbnailUrl,
              category,
              categoryLabel,
              eventId,
              year,
              createdAt: mediaItem.mediaMetadata.creationTime,
            };
            
            results.success.push(galleryItem);
          } catch (error: any) {
            console.error(`Failed to import media item ${mediaItemId}:`, error);
            results.failed.push({
              id: mediaItemId,
              error: error.message || 'Unknown error',
            });
          }
        })
      );
    }

    return NextResponse.json({
      imported: results.success.length,
      failed: results.failed.length,
      items: results.success,
      errors: results.failed,
    });
  } catch (error: any) {
    console.error('Error importing from Google Photos:', error);
    
    // Handle token expiration
    if (error.message?.includes('401') || error.message?.includes('invalid_grant')) {
      return NextResponse.json(
        { error: 'Authentication expired. Please reconnect to Google Photos.' },
        { status: 401 }
      );
    }

    return NextResponse.json(
      { error: error.message || 'Failed to import photos' },
      { status: 500 }
    );
  }
}
