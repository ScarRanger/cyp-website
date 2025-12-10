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

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { ticketNumber, sessionId } = body;

    if (!ticketNumber || !sessionId) {
      return NextResponse.json(
        { error: 'Missing ticketNumber or sessionId' },
        { status: 400 }
      );
    }

    const ticketRef = db.collection('lottery_tickets').doc(ticketNumber.toString());

    try {
      // Use transaction to ensure atomic release
      await db.runTransaction(async (transaction) => {
        const ticketDoc = await transaction.get(ticketRef);

        if (!ticketDoc.exists) {
          throw new Error('Ticket not found');
        }

        const ticketData = ticketDoc.data();

        // Only release if locked by this session AND no order has been placed
        if (ticketData?.status === 'soft-locked' && ticketData?.sessionId === sessionId) {
          // Don't release if there's a pending order
          if (ticketData?.orderId) {
            throw new Error('Cannot release - order already placed for this ticket');
          }
          
          transaction.update(ticketRef, {
            status: 'available',
            sessionId: null,
            lockedAt: null,
          });
        } else {
          throw new Error('Ticket not locked by this session');
        }
      });

      return NextResponse.json({
        success: true,
        message: 'Lock released successfully',
      });
    } catch (error) {
      if (error instanceof Error) {
        if (error.message === 'Ticket not locked by this session' || 
            error.message === 'Cannot release - order already placed for this ticket') {
          return NextResponse.json({
            success: false,
            message: error.message,
          });
        }
      }
      throw error;
    }
  } catch (error) {
    console.error('Error releasing lock:', error);
    return NextResponse.json(
      { error: 'Failed to release lock' },
      { status: 500 }
    );
  }
}
