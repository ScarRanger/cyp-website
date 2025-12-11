// scripts/sync-lottery-to-sheets.ts
import path from 'path';
import dotenv from 'dotenv';
import { google } from 'googleapis';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

type ServiceAccount = {
  client_email: string;
  private_key: string;
  [k: string]: any;
};

const LOTTERY_SHEET_ID = '1ODlIMild9QS0wHSQny3BV1dQVqCrxEMqxGwdP9d8iFY';
const SHEET_NAME = 'Lottery';

// Load environment variables from project root .env.local
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

// Validate required envs up front
const REQUIRED_ENVS = [
  'GOOGLE_SERVICE_ACCOUNT_BASE64',
  'NEXT_PUBLIC_SUPABASE_URL',
  'SUPABASE_SERVICE_ROLE_KEY',
];

const missingEnvs = REQUIRED_ENVS.filter((k) => !process.env[k] || process.env[k]!.trim() === '');
if (missingEnvs.length > 0) {
  console.error(`❌ Missing required env vars: ${missingEnvs.join(', ')}`);
  console.error(`Make sure .env.local (or your environment) defines them and you're running the script from project root.`);
  process.exit(1);
}

let serviceAccount: ServiceAccount;
try {
  const decoded = Buffer.from(process.env.GOOGLE_SERVICE_ACCOUNT_BASE64!, 'base64').toString('utf8');
  serviceAccount = JSON.parse(decoded);
  if (!serviceAccount.client_email || !serviceAccount.private_key) {
    throw new Error('Decoded service account JSON missing client_email/private_key');
  }
} catch (err) {
  console.error('❌ Failed to decode/parse GOOGLE_SERVICE_ACCOUNT_BASE64:', (err as Error).message);
  process.exit(1);
}

// Initialize Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

// Create supabase client
let supabase: SupabaseClient;
try {
  supabase = createClient(supabaseUrl, supabaseServiceRoleKey);
} catch (err) {
  console.error('❌ Failed to create Supabase client:', (err as Error).message);
  process.exit(1);
}

// Initialize Google Auth & Sheets client
const auth = new google.auth.GoogleAuth({
  credentials: {
    client_email: serviceAccount.client_email,
    private_key: serviceAccount.private_key,
  },
  scopes: ['https://www.googleapis.com/auth/spreadsheets'],
});

const sheets = google.sheets({ version: 'v4', auth });

async function ensureHeadersExist() {
  try {
    const res = await sheets.spreadsheets.values.get({
      spreadsheetId: LOTTERY_SHEET_ID,
      range: `${SHEET_NAME}!A1:K1`,
    });

    if (!res.data.values || res.data.values.length === 0) {
      console.log('📝 No headers found — adding headers.');
      await addHeaders();
    } else {
      // If values exist but are empty array, also add
      const firstRow = res.data.values[0];
      const isEmpty = !firstRow || firstRow.every((v) => (v ?? '').toString().trim() === '');
      if (isEmpty) {
        console.log('📝 Headers were empty — adding headers.');
        await addHeaders();
      } else {
        console.log('✅ Headers exist.');
      }
    }
  } catch (err) {
    // If the sheet or range doesn't exist, write headers (covers new sheet / new range)
    console.warn('⚠️ Could not read headers (sheet might not exist or access issue). Attempting to write headers anyway.');
    await addHeaders();
  }
}

async function addHeaders() {
  const headers = [
    'Order ID',
    'Ticket Number',
    'Name',
    'Phone',
    'Email',
    'Parish',
    'Transaction ID',
    'Amount',
    'Status',
    'Confirmed At',
    'Order Created At',
  ];

  await sheets.spreadsheets.values.update({
    spreadsheetId: LOTTERY_SHEET_ID,
    range: `${SHEET_NAME}!A1:K1`,
    valueInputOption: 'RAW',
    requestBody: {
      values: [headers],
    },
  });
}

function formatDateToIndia(dateStr?: string | null) {
  if (!dateStr) return '';
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return '';
    return d.toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' });
  } catch {
    return '';
  }
}

async function getExistingOrderIds(): Promise<Set<string>> {
  try {
    const res = await sheets.spreadsheets.values.get({
      spreadsheetId: LOTTERY_SHEET_ID,
      range: `${SHEET_NAME}!A:A`,
    });
    const rows = res.data.values || [];
    // Exclude header if present
    const ids = rows.slice(1).map((r) => (r[0] ?? '').toString());
    return new Set(ids.filter(Boolean));
  } catch (err) {
    console.warn('⚠️ Could not fetch existing order IDs — assuming none exist.');
    return new Set();
  }
}

async function syncConfirmedOrdersToSheets() {
  try {
    console.log('🔄 Fetching confirmed orders from Supabase...');

    const { data: orders, error } = await supabase
      .from('lottery_orders')
      .select('*')
      .eq('status', 'confirmed')
      .order('confirmed_at', { ascending: true });

    if (error) {
      throw error;
    }

    if (!orders || orders.length === 0) {
      console.log('✅ No confirmed orders found.');
      return;
    }

    console.log(`📊 Found ${orders.length} confirmed orders.`);

    // Ensure headers
    await ensureHeadersExist();

    // Get existing IDs to avoid duplicates
    const existingOrderIds = await getExistingOrderIds();

    // Prepare rows to append (only new orders)
    const newRows = orders
      .filter((order: any) => !existingOrderIds.has(order.id))
      .map((order: any) => [
        order.id,
        order.ticket_number ?? '',
        order.name ?? '',
        order.phone ?? '',
        order.email ?? '',
        order.parish ?? '',
        order.transaction_id ?? '',
        order.amount ?? '',
        order.status ?? '',
        formatDateToIndia(order.confirmed_at),
        formatDateToIndia(order.created_at),
      ]);

    if (newRows.length === 0) {
      console.log('✅ All orders already synced to sheet.');
      return;
    }

    console.log(`📤 Appending ${newRows.length} new orders to sheet...`);

    await sheets.spreadsheets.values.append({
      spreadsheetId: LOTTERY_SHEET_ID,
      range: `${SHEET_NAME}!A:K`,
      valueInputOption: 'RAW',
      requestBody: {
        values: newRows,
      },
    });

    console.log(`✅ Successfully synced ${newRows.length} orders to Google Sheets!`);
    console.log(`📊 Total confirmed orders in DB: ${orders.length}`);
    console.log(`📊 New orders added to sheet: ${newRows.length}`);
  } catch (err) {
    console.error('❌ Error syncing orders to sheets:', (err as Error).message || err);
    throw err;
  }
}

// Run
(async () => {
  try {
    await syncConfirmedOrdersToSheets();
    console.log('🎉 Sync completed successfully!');
    process.exit(0);
  } catch (err) {
    console.error('💥 Sync failed:', (err as Error).message || err);
    process.exit(1);
  }
})();
