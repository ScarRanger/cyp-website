import { NextRequest, NextResponse } from 'next/server';
import { storage } from '@/app/lib/firebase';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;
    
    if (!file) {
      return NextResponse.json(
        { success: false, error: 'No file provided' },
        { status: 400 }
      );
    }

    // Validate file type
    if (!file.type.startsWith('image/')) {
      return NextResponse.json(
        { success: false, error: 'Only image files are allowed' },
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

    // Create a unique filename
    const timestamp = Date.now();
    const filename = `form-images/${timestamp}_${file.name}`;
    
    // Upload to Firebase Storage
    const storageRef = ref(storage, filename);
    const arrayBuffer = await file.arrayBuffer();
    const uint8Array = new Uint8Array(arrayBuffer);
    
    const snapshot = await uploadBytes(storageRef, uint8Array, {
      contentType: file.type,
    });
    
    // Get download URL
    const downloadURL = await getDownloadURL(snapshot.ref);
    
    return NextResponse.json({
      success: true,
      url: downloadURL,
      filename: filename,
    });
    
  } catch (error) {
    console.error('Error uploading file:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to upload file' },
      { status: 500 }
    );
  }
}
