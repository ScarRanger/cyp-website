import { NextRequest, NextResponse } from 'next/server';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';

const s3Client = new S3Client({
  region: process.env.AWS_REGION || 'ap-south-1',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  },
});

const BUCKET_NAME = process.env.AWS_ASSESTS_S3_BUCKET || 'cyp-website-assets';
const CLOUDFRONT_URL = 'https://ds33df8kutjjh.cloudfront.net';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const isAdminUpload = formData.get('isAdminUpload') === 'true';
    const uploadType = (formData.get('uploadType') as string) || 'file'; // 'image' | 'file'
    const productId = formData.get('productId') as string | null;
    const imageIndex = formData.get('imageIndex') as string | null;
    
    if (!file) {
      return NextResponse.json(
        { success: false, error: 'No file provided' },
        { status: 400 }
      );
    }

    // Conditionally validate file type
    if (uploadType === 'image' && !file.type.startsWith('image/')) {
      return NextResponse.json(
        { success: false, error: 'Only image files are allowed for this field' },
        { status: 400 }
      );
    }

    // Validate file size (5MB limit)
    if (file.size > 5 * 1024 * 1024) {
      return NextResponse.json(
        { success: false, error: 'File size must be less than 5MB' },
        { status: 400 }
      );
    }

    // Convert file to buffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Generate unique filename
    const timestamp = Date.now();
    const randomStr = Math.random().toString(36).substring(2, 8);
    const ext = file.name.split('.').pop() || 'jpg';
    
    // Determine S3 key based on upload type
    let s3Key: string;
    
    if (productId && imageIndex !== null) {
      // For existing product with specific index
      s3Key = `fundraiser/${productId}/image-${imageIndex}.${ext}`;
    } else if (productId) {
      // For existing product, generate next index
      s3Key = `fundraiser/${productId}/image-${timestamp}-${randomStr}.${ext}`;
    } else if (isAdminUpload && uploadType === 'image') {
      // For form header images or fundraiser temp uploads
      s3Key = `forms/headers/${timestamp}-${randomStr}.${ext}`;
    } else if (isAdminUpload) {
      // For new fundraiser product (temp upload), use temp folder
      s3Key = `fundraiser/temp/${timestamp}-${randomStr}.${ext}`;
    } else {
      // For form submissions (user uploads), use forms folder
      const sanitizedFilename = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
      s3Key = `forms/submissions/${timestamp}-${randomStr}-${sanitizedFilename}`;
    }

    // Upload to S3
    const command = new PutObjectCommand({
      Bucket: BUCKET_NAME,
      Key: s3Key,
      Body: buffer,
      ContentType: file.type,
      CacheControl: 'public, max-age=31536000',
    });

    await s3Client.send(command);

    // Build CloudFront URL
    const cloudFrontUrl = `${CLOUDFRONT_URL}/${s3Key}`;

    return NextResponse.json({
      success: true,
      url: cloudFrontUrl,
      s3Key,
      isAdminUpload,
    });
    
  } catch (error) {
    console.error('Error uploading file:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to upload file' },
      { status: 500 }
    );
  }
}
