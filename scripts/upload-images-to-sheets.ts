import * as fs from 'fs';
import * as path from 'path';
import { google } from 'googleapis';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

// Your Google Sheets configuration
const SPREADSHEET_ID = '1ODlIMild9QS0wHSQny3BV1dQVqCrxEMqxGwdP9d8iFY';
const SHEET_NAME = 'Old Items Stock';

// S3 Configuration
const s3Client = new S3Client({
  region: process.env.AWS_REGION || 'ap-south-1',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  },
});

const BUCKET_NAME = process.env.AWS_ASSESTS_S3_BUCKET || 'cyp-website-assets';
const CLOUDFRONT_URL = 'https://ds33df8kutjjh.cloudfront.net';

// Folders to scan for images
const IMAGE_FOLDERS = [
  'WhatsApp Unknown 2025-12-10 at 18.17.26',
  'WhatsApp Unknown 2025-12-10 at 18.17.33',
  'WhatsApp Unknown 2025-12-10 at 18.17.44',
  'WhatsApp Unknown 2025-12-10 at 18.17.49',
  'WhatsApp Unknown 2025-12-10 at 18.18.15',
];

interface ImageInfo {
  path: string;
  filename: string;
  folder: string;
}

async function getGoogleSheetsClient() {
  // Check if we have base64 encoded service account
  if (process.env.GOOGLE_SERVICE_ACCOUNT_BASE64) {
    const credentials = JSON.parse(
      Buffer.from(process.env.GOOGLE_SERVICE_ACCOUNT_BASE64, 'base64').toString('utf-8')
    );

    const auth = new google.auth.GoogleAuth({
      credentials,
      scopes: ['https://www.googleapis.com/auth/spreadsheets'],
    });

    const sheets = google.sheets({ version: 'v4', auth });

    return { sheets, auth };
  }
  
  // Fallback to GOOGLE_SHEETS_CREDENTIALS_BASE64
  if (process.env.GOOGLE_SHEETS_CREDENTIALS_BASE64) {
    const credentials = JSON.parse(
      Buffer.from(process.env.GOOGLE_SHEETS_CREDENTIALS_BASE64, 'base64').toString('utf-8')
    );

    const auth = new google.auth.GoogleAuth({
      credentials,
      scopes: ['https://www.googleapis.com/auth/spreadsheets'],
    });

    const sheets = google.sheets({ version: 'v4', auth });

    return { sheets, auth };
  }

  throw new Error('Missing Google Sheets credentials. Set GOOGLE_SERVICE_ACCOUNT_BASE64 or GOOGLE_SHEETS_CREDENTIALS_BASE64');
}

async function getAllImages(): Promise<ImageInfo[]> {
  const images: ImageInfo[] = [];
  const workspaceRoot = process.cwd();

  for (const folder of IMAGE_FOLDERS) {
    const folderPath = path.join(workspaceRoot, folder);
    
    if (!fs.existsSync(folderPath)) {
      console.log(`⚠️  Folder not found: ${folder}`);
      continue;
    }

    const files = fs.readdirSync(folderPath);
    const imageFiles = files.filter(f => /\.(jpg|jpeg|png|gif|webp)$/i.test(f));

    imageFiles.forEach(filename => {
      images.push({
        path: path.join(folderPath, filename),
        filename,
        folder
      });
    });

    console.log(`📁 Found ${imageFiles.length} images in ${folder}`);
  }

  return images;
}

async function uploadImageToS3(imagePath: string, filename: string, index: number): Promise<string> {
  try {
    const fileBuffer = fs.readFileSync(imagePath);
    const ext = path.extname(filename).toLowerCase();
    
    const contentType = ext === '.png' ? 'image/png' : 
                       ext === '.gif' ? 'image/gif' : 
                       ext === '.webp' ? 'image/webp' : 'image/jpeg';
    
    // Use inventory folder structure
    const s3Key = `inventory/old-stock/image-${index + 1}${ext}`;
    
    const command = new PutObjectCommand({
      Bucket: BUCKET_NAME,
      Key: s3Key,
      Body: fileBuffer,
      ContentType: contentType,
      CacheControl: 'public, max-age=31536000',
    });

    await s3Client.send(command);
    
    const cloudFrontUrl = `${CLOUDFRONT_URL}/${s3Key}`;
    return cloudFrontUrl;
  } catch (error) {
    console.error(`Error uploading ${filename} to S3:`, error);
    throw error;
  }
}

async function insertImageFormula(sheets: any, row: number, imageUrl: string) {
  const formula = `=IMAGE("${imageUrl}", 1)`;
  
  try {
    await sheets.spreadsheets.values.update({
      spreadsheetId: SPREADSHEET_ID,
      range: `${SHEET_NAME}!B${row}`,
      valueInputOption: 'USER_ENTERED',
      requestBody: {
        values: [[formula]],
      },
    });
  } catch (error: any) {
    if (error.message?.includes('not found')) {
      throw new Error(`Sheet "${SHEET_NAME}" not found in spreadsheet. Please check the sheet name.`);
    }
    throw error;
  }
}

async function getNextEmptyRow(sheets: any): Promise<number> {
  try {
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: `${SHEET_NAME}!B:B`,
    });

    const values = response.data.values || [];
    return values.length + 1;
  } catch (error: any) {
    if (error.message?.includes('not found')) {
      console.error(`\n❌ Sheet "${SHEET_NAME}" not found!`);
      console.log('\nAvailable sheets in this spreadsheet:');
      
      // Try to get sheet metadata
      try {
        const metadata = await sheets.spreadsheets.get({
          spreadsheetId: SPREADSHEET_ID,
        });
        
        metadata.data.sheets.forEach((sheet: any) => {
          console.log(`   - "${sheet.properties.title}"`);
        });
      } catch {
        console.log('   (Unable to fetch sheet list)');
      }
      
      throw new Error(`Sheet "${SHEET_NAME}" not found. Please update SHEET_NAME in the script.`);
    }
    throw error;
  }
}

async function main() {
  console.clear();
  console.log('=' .repeat(80));
  console.log('  GOOGLE SHEETS IMAGE UPLOADER');
  console.log('=' .repeat(80));
  console.log('');

  try {
    // Get all images from folders
    console.log('🔍 Scanning folders for images...\n');
    const images = await getAllImages();
    
    if (images.length === 0) {
      console.log('❌ No images found in any folder');
      return;
    }

    console.log('\n' + '=' .repeat(80));
    console.log(`\n📊 Total images found: ${images.length}\n`);

    // Initialize Google Sheets
    console.log('🔐 Authenticating with Google...');
    const { sheets } = await getGoogleSheetsClient();
    console.log('✓ Authentication successful\n');

    // Get starting row
    const startRow = await getNextEmptyRow(sheets);
    console.log(`📍 Starting from row ${startRow}\n`);

    console.log('=' .repeat(80));
    console.log('\n🚀 Uploading images to S3 and inserting into sheet...\n');

    let successCount = 0;
    let failCount = 0;

    for (let i = 0; i < images.length; i++) {
      const image = images[i];
      const currentRow = startRow + i;

      try {
        console.log(`[${i + 1}/${images.length}] Processing: ${image.filename}`);
        console.log(`   From: ${image.folder}`);
        
        // Upload to S3
        console.log(`   ⬆️  Uploading to S3...`);
        const imageUrl = await uploadImageToS3(image.path, image.filename, i);
        console.log(`   ✓ Uploaded: ${imageUrl}`);

        // Insert IMAGE formula in column B
        console.log(`   📝 Inserting into row ${currentRow}...`);
        await insertImageFormula(sheets, currentRow, imageUrl);
        console.log(`   ✓ Inserted into B${currentRow}`);
        
        successCount++;
        console.log(`   ✅ Complete\n`);

        // Small delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 300));

      } catch (error) {
        console.error(`   ❌ Failed: ${error}`);
        failCount++;
        console.log('');
      }
    }

    // Summary
    console.log('=' .repeat(80));
    console.log('\n✅ UPLOAD COMPLETE!\n');
    console.log(`   Total images: ${images.length}`);
    console.log(`   Successfully uploaded: ${successCount}`);
    console.log(`   Failed: ${failCount}`);
    console.log(`   Rows updated: B${startRow} to B${startRow + successCount - 1}`);
    console.log('\n' + '=' .repeat(80));

  } catch (error) {
    console.error('\n❌ Error:', error);
    process.exit(1);
  }
}

main();
