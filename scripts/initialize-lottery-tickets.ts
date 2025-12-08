import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Load environment variables
dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

// Initialize Firebase Admin
if (getApps().length === 0) {
  const credentials = JSON.parse(
    Buffer.from(process.env.FIREBASE_SERVICE_ACCOUNT_BASE64 || '', 'base64').toString('utf-8')
  );

  initializeApp({
    credential: cert(credentials)
  });
}

const db = getFirestore();

async function initializeLotteryTickets() {
  console.log('Initializing 50 lottery tickets...');

  const batch = db.batch();

  for (let i = 1; i <= 50; i++) {
    const ticketRef = db.collection('lottery_tickets').doc(i.toString());
    
    batch.set(ticketRef, {
      ticketNumber: i,
      status: 'available',
      sessionId: null,
      lockedAt: null,
      orderId: null,
    });

    console.log(`✓ Ticket #${i} prepared`);
  }

  await batch.commit();
  console.log('\n✅ Successfully created 50 lottery tickets in Firestore!');
  console.log('Collection: lottery_tickets');
  console.log('Tickets: 1-50');
  console.log('Initial status: available');
}

initializeLotteryTickets()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('Error initializing lottery tickets:', error);
    process.exit(1);
  });
