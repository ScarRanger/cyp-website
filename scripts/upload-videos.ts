/**
 * Video Upload Script for Homepage Gallery
 * Uploads video files to S3 and outputs CloudFront URLs
 * 
 * Usage: npx ts-node scripts/upload-videos.ts <directory-or-file>
 * 
 * Example:
 *   npx ts-node scripts/upload-videos.ts ./videos/clip1.mp4
 *   npx ts-node scripts/upload-videos.ts ./videos/
 */

import * as dotenv from 'dotenv';
import * as path from 'path';
import * as fs from 'fs';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';

// Load environment variables from .env.local
dotenv.config({ path: path.join(__dirname, '..', '.env.local') });

const BUCKET_NAME = process.env.AWS_ASSESTS_S3_BUCKET || 'cyp-website-assets';
const CLOUDFRONT_URL = 'https://ds33df8kutjjh.cloudfront.net';
const REGION = process.env.AWS_REGION || 'ap-south-1';

// S3 directory structure for homepage videos
const S3_PREFIX = 'homepage/videos';

const s3Client = new S3Client({
    region: REGION,
    credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
    },
});

// Allowed video extensions
const VIDEO_EXTENSIONS = ['.mp4', '.webm', '.mov'];

interface UploadResult {
    filename: string;
    s3Key: string;
    cloudFrontUrl: string;
    size: string;
}

async function uploadFile(filePath: string): Promise<UploadResult> {
    const filename = path.basename(filePath);
    const ext = path.extname(filePath).toLowerCase();

    if (!VIDEO_EXTENSIONS.includes(ext)) {
        throw new Error(`Unsupported file type: ${ext}. Allowed: ${VIDEO_EXTENSIONS.join(', ')}`);
    }

    const fileBuffer = fs.readFileSync(filePath);
    const fileSizeBytes = fileBuffer.length;
    const fileSizeMB = (fileSizeBytes / (1024 * 1024)).toFixed(2);

    // Generate S3 key with sanitized filename
    const sanitizedName = filename.replace(/[^a-zA-Z0-9._-]/g, '_');
    const s3Key = `${S3_PREFIX}/${sanitizedName}`;

    // Determine content type
    const contentTypeMap: Record<string, string> = {
        '.mp4': 'video/mp4',
        '.webm': 'video/webm',
        '.mov': 'video/quicktime',
    };
    const contentType = contentTypeMap[ext] || 'video/mp4';

    console.log(`  Uploading: ${filename} (${fileSizeMB} MB)...`);

    const command = new PutObjectCommand({
        Bucket: BUCKET_NAME,
        Key: s3Key,
        Body: fileBuffer,
        ContentType: contentType,
        CacheControl: 'public, max-age=31536000', // 1 year cache
    });

    await s3Client.send(command);

    const cloudFrontUrl = `${CLOUDFRONT_URL}/${s3Key}`;

    return {
        filename,
        s3Key,
        cloudFrontUrl,
        size: `${fileSizeMB} MB`,
    };
}

async function main() {
    const inputPath = process.argv[2];

    if (!inputPath) {
        console.error('Usage: npx ts-node scripts/upload-videos.ts <directory-or-file>');
        console.error('');
        console.error('Examples:');
        console.error('  npx ts-node scripts/upload-videos.ts ./videos/clip1.mp4');
        console.error('  npx ts-node scripts/upload-videos.ts ./videos/');
        process.exit(1);
    }

    // Verify AWS credentials
    if (!process.env.AWS_ACCESS_KEY_ID || !process.env.AWS_SECRET_ACCESS_KEY) {
        console.error('❌ Missing AWS credentials. Set AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY in .env.local');
        process.exit(1);
    }

    const resolvedPath = path.resolve(inputPath);

    if (!fs.existsSync(resolvedPath)) {
        console.error(`❌ Path not found: ${resolvedPath}`);
        process.exit(1);
    }

    const stats = fs.statSync(resolvedPath);
    const filesToUpload: string[] = [];

    if (stats.isDirectory()) {
        // Get all video files in directory
        const files = fs.readdirSync(resolvedPath);
        for (const file of files) {
            const ext = path.extname(file).toLowerCase();
            if (VIDEO_EXTENSIONS.includes(ext)) {
                filesToUpload.push(path.join(resolvedPath, file));
            }
        }
    } else {
        filesToUpload.push(resolvedPath);
    }

    if (filesToUpload.length === 0) {
        console.error('❌ No video files found. Supported formats: MP4, WebM, MOV');
        process.exit(1);
    }

    console.log('');
    console.log('📹 Video Upload Script');
    console.log('='.repeat(50));
    console.log(`Bucket: ${BUCKET_NAME}`);
    console.log(`CloudFront: ${CLOUDFRONT_URL}`);
    console.log(`Files to upload: ${filesToUpload.length}`);
    console.log('');

    const results: UploadResult[] = [];

    for (const file of filesToUpload) {
        try {
            const result = await uploadFile(file);
            results.push(result);
            console.log(`  ✅ Uploaded: ${result.cloudFrontUrl}`);
        } catch (error) {
            console.error(`  ❌ Failed: ${path.basename(file)} - ${error}`);
        }
    }

    console.log('');
    console.log('='.repeat(50));
    console.log('📋 Summary');
    console.log('');

    if (results.length > 0) {
        console.log('Add this to your NewHomePage.tsx:');
        console.log('');
        console.log('const featuredVideos = [');
        for (const r of results) {
            // Use similar image as poster (or placeholder)
            console.log(`  { src: '${r.cloudFrontUrl}', label: '${r.filename.replace(/\.[^.]+$/, '')}', poster: '/placeholder.jpg' },`);
        }
        console.log('];');
    }

    console.log('');
    console.log(`✅ Uploaded: ${results.length}/${filesToUpload.length} files`);
}

main().catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
});
