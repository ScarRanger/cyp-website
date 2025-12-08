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

async function resetLotteryTickets() {
  console.log('Resetting all 50 lottery tickets to available state...\n');

  const batch = db.batch();
  let resetCount = 0;

  for (let i = 1; i <= 50; i++) {
    const ticketRef = db.collection('lottery_tickets').doc(i.toString());
    
    // Get current state
    const ticketDoc = await ticketRef.get();
    const currentStatus = ticketDoc.exists ? ticketDoc.data()?.status : 'not found';
    
    // Reset to available
    batch.set(ticketRef, {
      ticketNumber: i,
      status: 'available',
      sessionId: null,
      lockedAt: null,
      orderId: null,
    }, { merge: true });

    console.log(`Ticket #${i}: ${currentStatus} → available`);
    resetCount++;
  }

  await batch.commit();
  
  console.log('\n✅ Successfully reset all 50 lottery tickets!');
  console.log(`Total tickets reset: ${resetCount}`);
  console.log('All tickets are now available for purchase.');
}

resetLotteryTickets()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('Error resetting lottery tickets:', error);
    process.exit(1);
  });
