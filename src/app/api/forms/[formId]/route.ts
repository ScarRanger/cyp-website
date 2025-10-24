import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/app/lib/firebase-admin';

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ formId: string }> }
) {
  try {
    const { formId } = await context.params;
    
    const db = getDb();
    const formDoc = await db.collection('forms').doc(formId).get();
    
    if (!formDoc.exists) {
      return NextResponse.json(
        { success: false, error: 'Form not found' },
        { status: 404 }
      );
    }
    
    const formData = formDoc.data();
    
    return NextResponse.json({
      success: true,
      form: {
        id: formDoc.id,
        ...formData,
        createdAt: formData?.createdAt?.toDate(),
        updatedAt: formData?.updatedAt?.toDate(),
      }
    });
    
  } catch (error) {
    console.error('Error fetching form:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch form' },
      { status: 500 }
    );
  }
}
