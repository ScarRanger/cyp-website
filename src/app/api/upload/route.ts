import { NextRequest, NextResponse } from 'next/server';
import { storage, ID } from '@/app/lib/appwrite';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const isAdminUpload = formData.get('isAdminUpload') === 'true';
    const uploadType = (formData.get('uploadType') as string) || 'file'; // 'image' | 'file'
    
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

    // Read file bytes (Appwrite SDK accepts File directly; no need to access raw bytes here)
    // const arrayBuffer = await file.arrayBuffer();

    // Upload to Appwrite Storage
    const bucketId = process.env.APPWRITE_BUCKET_ID as string;
    
    if (!bucketId) {
      return NextResponse.json(
        { success: false, error: 'Storage bucket not configured' },
        { status: 500 }
      );
    }

    const uploaded = await storage.createFile(
      bucketId,
      ID.unique(),
      file
    );

    // Build a public view URL
    const endpoint = process.env.APPWRITE_ENDPOINT as string;
    const projectId = process.env.APPWRITE_PROJECT_ID as string;
    const fileId = uploaded.$id;
    const viewUrl = `${endpoint}/storage/buckets/${bucketId}/files/${fileId}/view?project=${projectId}`;

    return NextResponse.json({
      success: true,
      url: viewUrl,
      fileId,
      bucketId,
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
