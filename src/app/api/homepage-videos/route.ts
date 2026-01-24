import { NextRequest, NextResponse } from 'next/server';
import { S3Client, ListObjectsV2Command } from '@aws-sdk/client-s3';

const s3Client = new S3Client({
    region: process.env.AWS_REGION || 'ap-south-1',
    credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
    },
});

const BUCKET_NAME = process.env.AWS_ASSESTS_S3_BUCKET || 'cyp-website-assets';
const CLOUDFRONT_URL = process.env.AWS_ASSETS_CLOUDFRONT_URL;

// Video file extensions to include
const VIDEO_EXTENSIONS = ['.mp4', '.webm', '.mov'];

export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const type = searchParams.get('type');

        let prefix = 'homepage/videos/';
        if (type === 'mobile') {
            prefix = 'homepage/videos/mobile/';
        }

        // List all objects in the prefix
        const command = new ListObjectsV2Command({
            Bucket: BUCKET_NAME,
            Prefix: prefix,
        });

        const response = await s3Client.send(command);
        const contents = response.Contents || [];

        // Filter for video files and build response
        const videos = contents
            .filter((obj) => {
                const key = obj.Key || '';
                // Filter by extension
                if (!VIDEO_EXTENSIONS.some((ext) => key.toLowerCase().endsWith(ext))) {
                    return false;
                }

                // If fetching desktop videos (default prefix), exclude those in 'mobile' or other subdirectories if we want to be strict
                // The user specifically asked: desktop from 'homepage/videos/' and mobile from 'homepage/videos/mobile/'
                // 'homepage/videos/mobile/' is a child of 'homepage/videos/'. 
                // We should prevent desktop fetch from showing mobile videos.
                if (type !== 'mobile' && key.includes('/mobile/')) {
                    return false;
                }

                return true;
            })
            .map((obj) => {
                const key = obj.Key || '';
                const filename = key.split('/').pop() || '';
                const nameWithoutExt = filename.replace(/\.[^.]+$/, '');

                // Generate label from filename (replace underscores/hyphens with spaces, title case)
                const label = nameWithoutExt
                    .replace(/[-_]/g, ' ')
                    .replace(/\b\w/g, (c) => c.toUpperCase());

                return {
                    src: `${CLOUDFRONT_URL}/${key}`,
                    label,
                    // Use a default poster - you can customize this logic
                    poster: `/placeholder-video.jpg`,
                    filename,
                    lastModified: obj.LastModified,
                    size: obj.Size,
                };
            })
            // Sort by filename for consistent ordering
            .sort((a, b) => a.filename.localeCompare(b.filename));

        return NextResponse.json({
            success: true,
            videos,
            count: videos.length,
        });
    } catch (error) {
        console.error('Error listing homepage videos:', error);
        return NextResponse.json(
            { success: false, error: 'Failed to list videos' },
            { status: 500 }
        );
    }
}
