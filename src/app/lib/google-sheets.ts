import { google } from 'googleapis';

// Google Sheets API configuration with base64 encoded service account
const getGoogleAuth = () => {
  // Check if we have base64 encoded service account
  if (process.env.GOOGLE_SERVICE_ACCOUNT_BASE64) {
    try {
      const serviceAccountJson = JSON.parse(
        Buffer.from(process.env.GOOGLE_SERVICE_ACCOUNT_BASE64, 'base64').toString()
      );
      
      return new google.auth.GoogleAuth({
        credentials: serviceAccountJson,
        scopes: [
          'https://www.googleapis.com/auth/spreadsheets',
          'https://www.googleapis.com/auth/drive',
        ],
      });
    } catch (error) {
      console.error('Error parsing base64 Google service account:', error);
      throw new Error('Invalid base64 encoded Google service account');
    }
  }
  
  // Fallback to individual environment variables
  return new google.auth.GoogleAuth({
    credentials: {
      client_email: process.env.GOOGLE_CLIENT_EMAIL,
      private_key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    },
    scopes: [
      'https://www.googleapis.com/auth/spreadsheets',
      'https://www.googleapis.com/auth/drive',
    ],
  });
};

const auth = getGoogleAuth();

export const sheets = google.sheets({ version: 'v4', auth });
export const drive = google.drive({ version: 'v3', auth });

// Create a new spreadsheet
export async function createSpreadsheet(title: string) {
  try {
    const response = await sheets.spreadsheets.create({
      requestBody: {
        properties: {
          title,
        },
      },
    });
    
    return response.data;
  } catch (error) {
    console.error('Error creating spreadsheet:', error);
    throw error;
  }
}

// Set permissions for a spreadsheet
export async function setSpreadsheetPermissions(spreadsheetId: string, email: string) {
  try {
    await drive.permissions.create({
      fileId: spreadsheetId,
      requestBody: {
        role: 'writer',
        type: 'user',
        emailAddress: email,
      },
    });
  } catch (error) {
    console.error('Error setting permissions:', error);
    throw error;
  }
}

// Add headers to a spreadsheet
export async function addHeaders(spreadsheetId: string, headers: string[]) {
  try {
    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range: 'A1:Z1',
      valueInputOption: 'RAW',
      requestBody: {
        values: [headers],
      },
    });
  } catch (error) {
    console.error('Error adding headers:', error);
    throw error;
  }
}
