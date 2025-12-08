import { NextRequest, NextResponse } from 'next/server';
import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

// Initialize Firebase Admin if not already initialized
if (getApps().length === 0) {
  const credentials = JSON.parse(
    Buffer.from(process.env.FIREBASE_SERVICE_ACCOUNT_BASE64 || '', 'base64').toString('utf-8')
  );

  initializeApp({
    credential: cert(credentials)
  });
}

const db = getFirestore();

export async function GET(request: NextRequest) {
  try {
    const ticketsRef = db.collection('lottery_tickets');
    const snapshot = await ticketsRef.get();

    const available: number[] = [];
    const softLocked: number[] = [];
    const sold: number[] = [];

    // If no tickets exist, initialize them
    if (snapshot.empty) {
      const batch = db.batch();
      for (let i = 1; i <= 50; i++) {
        const docRef = ticketsRef.doc(i.toString());
        batch.set(docRef, {
          ticketNumber: i,
          status: 'available',
          sessionId: null,
          clientIP: null,
          lockedAt: null,
          orderId: null,
        });
        available.push(i);
      }
      await batch.commit();
    } else {
      const now = Date.now();
      const LOCK_EXPIRY = 5 * 60 * 1000; // 5 minutes

      snapshot.forEach((doc) => {
        const data = doc.data();
        const ticketNumber = data.ticketNumber;

        // Check if soft lock has expired
        if (data.status === 'soft-locked' && data.lockedAt) {
          const lockedTime = data.lockedAt.toMillis();
          if (now - lockedTime > LOCK_EXPIRY) {
            // Release expired lock
            doc.ref.update({
              status: 'available',
              sessionId: null,
              clientIP: null,
              lockedAt: null,
            });
            available.push(ticketNumber);
            return;
          }
        }

        if (data.status === 'available') {
          available.push(ticketNumber);
        } else if (data.status === 'soft-locked') {
          softLocked.push(ticketNumber);
        } else if (data.status === 'sold') {
          sold.push(ticketNumber);
        }
      });
    }

    return NextResponse.json({
      available: available.sort((a, b) => a - b),
      softLocked: softLocked.sort((a, b) => a - b),
      sold: sold.sort((a, b) => a - b),
    });
  } catch (error) {
    console.error('Error fetching tickets:', error);
    return NextResponse.json(
      { error: 'Failed to fetch tickets' },
      { status: 500 }
    );
  }
}
