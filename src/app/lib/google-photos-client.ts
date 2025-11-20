import { google } from 'googleapis';

// Google Photos API scopes
export const GOOGLE_PHOTOS_SCOPES = [
  'https://www.googleapis.com/auth/photoslibrary',
  'https://www.googleapis.com/auth/photoslibrary.sharing',
];

// OAuth2 client configuration
export function getOAuth2Client() {
  const clientId = process.env.GOOGLE_PHOTOS_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_PHOTOS_CLIENT_SECRET;
  const redirectUri = process.env.GOOGLE_PHOTOS_REDIRECT_URI || `${process.env.NEXT_PUBLIC_BASE_URL}/api/google-photos/callback`;

  if (!clientId || !clientSecret) {
    throw new Error('Missing Google Photos OAuth credentials. Please set GOOGLE_PHOTOS_CLIENT_ID and GOOGLE_PHOTOS_CLIENT_SECRET environment variables.');
  }

  return new google.auth.OAuth2(clientId, clientSecret, redirectUri);
}

// Generate OAuth URL for authorization
export function getAuthorizationUrl(state?: string) {
  const oauth2Client = getOAuth2Client();
  
  const authUrl = oauth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: GOOGLE_PHOTOS_SCOPES,
    prompt: 'consent',
    include_granted_scopes: false,
    state: state || '',
  });
  
  console.log('🔗 Generated OAuth URL:');
  console.log('   Scope:', GOOGLE_PHOTOS_SCOPES.join(', '));
  console.log('   Prompt: consent (forcing re-authorization)');
  console.log('   URL params:', new URL(authUrl).searchParams.toString());
  
  return authUrl;
}

// Exchange authorization code for tokens
export async function getTokensFromCode(code: string) {
  const oauth2Client = getOAuth2Client();
  const { tokens } = await oauth2Client.getToken(code);
  return tokens;
}

// Refresh access token
export async function refreshAccessToken(refreshToken: string) {
  const oauth2Client = getOAuth2Client();
  oauth2Client.setCredentials({ refresh_token: refreshToken });
  const { credentials } = await oauth2Client.refreshAccessToken();
  return credentials;
}

// Google Photos API client
export interface GooglePhotosAlbumResponse {
  id: string;
  title: string;
  productUrl: string;
  mediaItemsCount?: string;
  coverPhotoBaseUrl?: string;
  coverPhotoMediaItemId?: string;
}

export interface GooglePhotosMediaItemResponse {
  id: string;
  productUrl: string;
  baseUrl: string;
  mimeType: string;
  mediaMetadata: {
    creationTime: string;
    width: string;
    height: string;
    photo?: Record<string, unknown>;
    video?: {
      fps: number;
      status: string;
    };
  };
  filename: string;
}

export class GooglePhotosClient {
  private oauth2Client: any;

  constructor(accessToken: string, refreshToken?: string) {
    this.oauth2Client = getOAuth2Client();
    this.oauth2Client.setCredentials({
      access_token: accessToken,
      refresh_token: refreshToken,
    });
  }

  private async request(url: string, options: any = {}) {
    console.log('📡 Making Google Photos API request via googleapis:');
    console.log('  URL:', url);
    console.log('  Method:', options.method || 'GET');

    try {
      // Get fresh access token (auto-refreshes if needed)
      const accessToken = await this.oauth2Client.getAccessToken();
      
      const headers = {
        'Authorization': `Bearer ${accessToken.token}`,
        'Content-Type': 'application/json',
        ...options.headers,
      };

      const response = await fetch(url, {
        ...options,
        headers,
      });

      console.log('📡 Response:', response.status, response.statusText);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ API Error:', errorText);
        throw new Error(`Google Photos API error: ${response.status} ${errorText}`);
      }

      return response.json();
    } catch (error: any) {
      console.error('❌ Request failed:', error.message);
      throw error;
    }
  }

  async listAlbums(pageSize = 50, pageToken?: string) {
    const params = new URLSearchParams({
      pageSize: pageSize.toString(),
      ...(pageToken && { pageToken }),
    });

    const data = await this.request(
      `https://photoslibrary.googleapis.com/v1/albums?${params}`
    );
    
    return {
      albums: (data.albums || []) as GooglePhotosAlbumResponse[],
      nextPageToken: data.nextPageToken as string | undefined,
    };
  }

  async getAlbum(albumId: string) {
    return this.request(
      `https://photoslibrary.googleapis.com/v1/albums/${albumId}`
    ) as Promise<GooglePhotosAlbumResponse>;
  }

  async searchMediaItems(albumId: string, pageSize = 100, pageToken?: string) {
    const body = {
      albumId,
      pageSize,
      ...(pageToken && { pageToken }),
    };

    const data = await this.request(
      'https://photoslibrary.googleapis.com/v1/mediaItems:search',
      {
        method: 'POST',
        body: JSON.stringify(body),
      }
    );

    return {
      mediaItems: (data.mediaItems || []) as GooglePhotosMediaItemResponse[],
      nextPageToken: data.nextPageToken as string | undefined,
    };
  }

  async getMediaItem(mediaItemId: string) {
    return this.request(
      `https://photoslibrary.googleapis.com/v1/mediaItems/${mediaItemId}`
    ) as Promise<GooglePhotosMediaItemResponse>;
  }

  // Download media item with proper dimensions
  async downloadMediaItem(mediaItem: GooglePhotosMediaItemResponse): Promise<Buffer> {
    const isVideo = mediaItem.mimeType.startsWith('video/');
    
    // For images, request full resolution (max 16383x16383)
    // For videos, use =dv to download video
    const downloadUrl = isVideo 
      ? `${mediaItem.baseUrl}=dv`
      : `${mediaItem.baseUrl}=d`;

    const response = await fetch(downloadUrl);
    if (!response.ok) {
      throw new Error(`Failed to download media item: ${response.status}`);
    }

    const arrayBuffer = await response.arrayBuffer();
    return Buffer.from(arrayBuffer);
  }

  // Get thumbnail URL (doesn't require download)
  getThumbnailUrl(baseUrl: string, width = 400, height = 400): string {
    return `${baseUrl}=w${width}-h${height}-c`;
  }
}
