import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/app/lib/firebase-admin';
import { createSpreadsheet, setSpreadsheetPermissions, addHeaders } from '@/app/lib/google-sheets';
import { FormLayout } from '@/app/types/form';

// Hardcoded admin email for Google Sheets access
const ADMIN_EMAIL = 'rhine.pereira@gmail.com'; // Replace with your actual email

export async function POST(request: NextRequest) {
  try {
    const formData: FormLayout = await request.json();
    
    // Generate form ID
    const formId = `form_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    // Create the form document in Firestore
    const formDoc = {
      ...formData,
      id: formId,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    
    await db.collection('forms').doc(formId).set(formDoc);
    
    // Create Google Sheets spreadsheet
    const spreadsheet = await createSpreadsheet(formData.title);
    const spreadsheetId = spreadsheet.spreadsheetId;
    
    if (!spreadsheetId) {
      throw new Error('Failed to create spreadsheet');
    }
    
    // Set permissions for admin email
    await setSpreadsheetPermissions(spreadsheetId, ADMIN_EMAIL);
    
    // Prepare headers for the spreadsheet (form fields first, then metadata)
    const headers = [...formData.fields.map(field => field.label), 'Timestamp', 'IP Address'];
    
    // Add headers to the spreadsheet
    await addHeaders(spreadsheetId, headers);
    
    // Update form document with spreadsheet ID
    await db.collection('forms').doc(formId).update({
      spreadsheetId,
      updatedAt: new Date(),
    });
    
    return NextResponse.json({
      success: true,
      formId,
      spreadsheetId,
      spreadsheetUrl: `https://docs.google.com/spreadsheets/d/${spreadsheetId}`,
    });
    
  } catch (error) {
    console.error('Error saving form:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to save form' },
      { status: 500 }
    );
  }
}
