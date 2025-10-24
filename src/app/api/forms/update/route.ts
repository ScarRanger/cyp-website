import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/app/lib/firebase-admin';
import { FormLayout } from '@/app/types/form';

export async function POST(request: NextRequest) {
  try {
    const formData: Partial<FormLayout> & { id?: string } = await request.json();

    if (!formData.id) {
      return NextResponse.json(
        { success: false, error: 'Form ID is required' },
        { status: 400 }
      );
    }

    const formRef = db.collection('forms').doc(formData.id);
    const existing = await formRef.get();
    if (!existing.exists) {
      return NextResponse.json(
        { success: false, error: 'Form not found' },
        { status: 404 }
      );
    }

    // Prevent accidental removal of important fields; update only provided fields
    const updatePayload: Partial<FormLayout> = {
      ...formData,
      updatedAt: new Date(),
    };

    // Do not allow client to change spreadsheetId here
    delete updatePayload.spreadsheetId;

    await formRef.update(updatePayload);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error updating form:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update form' },
      { status: 500 }
    );
  }
}
