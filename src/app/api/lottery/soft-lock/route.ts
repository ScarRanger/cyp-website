import { NextRequest, NextResponse } from 'next/server';
import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore, Timestamp } from 'firebase-admin/firestore';

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

const MAX_LOCKS_PER_SESSION = 10; // Maximum tickets one session can lock
const MAX_LOCKS_PER_IP = 10; // Maximum tickets one IP address can lock across all sessions

// Helper function to get client IP
function getClientIP(request: NextRequest): string {
  const forwarded = request.headers.get('x-forwarded-for');
  const realIp = request.headers.get('x-real-ip');
  
  if (forwarded) {
    return forwarded.split(',')[0].trim();
  }
  if (realIp) {
    return realIp;
  }
  return 'unknown';
}

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

    const clientIP = getClientIP(request);

    // Check how many tickets this session already has locked
    const allTicketsSnapshot = await db.collection('lottery_tickets')
      .where('sessionId', '==', sessionId)
      .where('status', '==', 'soft-locked')
      .get();
    
    const currentLockCount = allTicketsSnapshot.size;
    
    if (currentLockCount >= MAX_LOCKS_PER_SESSION) {
      return NextResponse.json(
        { error: `Maximum ${MAX_LOCKS_PER_SESSION} tickets can be selected at once` },
        { status: 400 }
      );
    }

    // Check how many tickets this IP has locked across ALL sessions
    const ipTicketsSnapshot = await db.collection('lottery_tickets')
      .where('clientIP', '==', clientIP)
      .where('status', '==', 'soft-locked')
      .get();
    
    const ipLockCount = ipTicketsSnapshot.size;
    
    // Allow if this IP already locked this specific ticket (re-locking same ticket)
    const alreadyLockedByThisIP = ipTicketsSnapshot.docs.some(
      doc => doc.data().ticketNumber === ticketNumber
    );
    
    if (ipLockCount >= MAX_LOCKS_PER_IP && !alreadyLockedByThisIP) {
      return NextResponse.json(
        { error: `Maximum ${MAX_LOCKS_PER_IP} tickets can be locked from your connection. Please complete your purchase before selecting more tickets.` },
        { status: 429 } // Too Many Requests
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

    // Check if ticket is available or already locked by this session
    if (ticketData?.status === 'sold') {
      return NextResponse.json(
        { error: 'Ticket already sold' },
        { status: 400 }
      );
    }

    if (ticketData?.status === 'soft-locked' && ticketData?.sessionId !== sessionId) {
      // Check if lock has expired
      const now = Date.now();
      const lockedTime = ticketData.lockedAt?.toMillis() || 0;
      const LOCK_EXPIRY = 5 * 60 * 1000; // 5 minutes

      if (now - lockedTime < LOCK_EXPIRY) {
        return NextResponse.json(
          { error: 'Ticket is currently reserved by another user' },
          { status: 400 }
        );
      }
    }

    // Soft lock the ticket
    await ticketRef.update({
      status: 'soft-locked',
      sessionId: sessionId,
      clientIP: clientIP,
      lockedAt: Timestamp.now(),
    });

    return NextResponse.json({
      success: true,
      message: 'Ticket soft-locked successfully',
      ticketNumber,
    });
  } catch (error) {
    console.error('Error soft-locking ticket:', error);
    return NextResponse.json(
      { error: 'Failed to lock ticket' },
      { status: 500 }
    );
  }
}
