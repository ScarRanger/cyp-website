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
    const ticketDoc = await ticketRef.get();

    if (!ticketDoc.exists) {
      return NextResponse.json(
        { error: 'Ticket not found' },
        { status: 404 }
      );
    }

    const ticketData = ticketDoc.data();

    // Only release if locked by this session
    if (ticketData?.status === 'soft-locked' && ticketData?.sessionId === sessionId) {
      await ticketRef.update({
        status: 'available',
        sessionId: null,
        lockedAt: null,
      });

      return NextResponse.json({
        success: true,
        message: 'Lock released successfully',
      });
    }

    return NextResponse.json({
      success: false,
      message: 'Ticket not locked by this session',
    });
  } catch (error) {
    console.error('Error releasing lock:', error);
    return NextResponse.json(
      { error: 'Failed to release lock' },
      { status: 500 }
    );
  }
}
