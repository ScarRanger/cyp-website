import { NextRequest, NextResponse } from 'next/server';
import { google } from 'googleapis';

// Add your Google Sheet ID here
const SHEET_ID = '1ed3DawNs7Sva_-KFnMdEzWpVaPgiKUqQpj9-41V9gxc';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, number, instaId, ageGroup, gender } = body;

    // Validate required fields
    if (!name || !number || !ageGroup || !gender) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Initialize Google Sheets API
    const credentials = JSON.parse(
      Buffer.from(process.env.GOOGLE_SERVICE_ACCOUNT_BASE64 || '', 'base64').toString('utf-8')
    );

    const auth = new google.auth.GoogleAuth({
      credentials,
      scopes: ['https://www.googleapis.com/auth/spreadsheets'],
    });

    const sheets = google.sheets({ version: 'v4', auth });

    // Prepare row data
    const timestamp = new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' });
    const row = [name, number, instaId || '', ageGroup, gender,timestamp];

    // Append to sheet
    await sheets.spreadsheets.values.append({
      spreadsheetId: SHEET_ID,
      range: 'responses!A:F', // Adjust sheet name if needed
      valueInputOption: 'RAW',
      requestBody: {
        values: [row],
      },
    });

    return NextResponse.json(
      { message: 'Registration successful!' },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error submitting to Google Sheets:', error);
    return NextResponse.json(
      { error: 'Failed to submit registration' },
      { status: 500 }
    );
  }
}
