import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/app/lib/firebase-admin';
import { sheets } from '@/app/lib/google-sheets';

export async function POST(request: NextRequest) {
  try {
    const { formId, data } = await request.json();
    
    // Get form configuration
    const formDoc = await db.collection('forms').doc(formId).get();
    if (!formDoc.exists) {
      return NextResponse.json(
        { success: false, error: 'Form not found' },
        { status: 404 }
      );
    }
    
    const form = formDoc.data() as any;
    // Respect acceptingResponses flag; if undefined, treat as accepting
    if (form.acceptingResponses === false) {
      return NextResponse.json(
        { success: false, error: 'This form is no longer accepting responses.' },
        { status: 403 }
      );
    }
    
    // Save submission to Firestore
    const submissionId = `submission_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const submission = {
      id: submissionId,
      formId,
      data,
      submittedAt: new Date(),
      ipAddress: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown',
    };
    
    await db.collection('submissions').doc(submissionId).set(submission);
    
    // Add row to Google Sheets
    if (form.spreadsheetId) {
      const timestamp = new Date().toLocaleString();
      const ipAddress = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown';
      
      const rowData = [
        // Exclude 'admin-image' fields from being added to the sheet
        ...form.fields.filter((field: any) => field.type !== 'admin-image').map((field: any) => {
          const value = data[field.id];
          if (Array.isArray(value)) {
            return value.join(', ');
          }
          // For image fields, show a clickable link if it's a URL
          if (field.type === 'image' && value && typeof value === 'string' && value.startsWith('http')) {
            return `=HYPERLINK("${value}", "View Image")`;
          }
          return value || '';
        }),
        timestamp,
        ipAddress
      ];
      
      await sheets.spreadsheets.values.append({
        spreadsheetId: form.spreadsheetId,
        range: 'A:Z',
        valueInputOption: 'USER_ENTERED',
        // Ensure new submissions insert rows instead of overwriting existing rows
        insertDataOption: 'INSERT_ROWS',
        requestBody: {
          values: [rowData],
        },
      });
    }
    
    return NextResponse.json({
      success: true,
      submissionId,
    });
    
  } catch (error) {
    console.error('Error submitting form:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to submit form' },
      { status: 500 }
    );
  }
}
