import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/app/lib/supabase';

const MAX_LOCKS_PER_SESSION = 10;
const MAX_LOCKS_PER_IP = 10;

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
    const supabase = createServerSupabaseClient();

    // Check how many tickets this session already has locked
    const { count: sessionLockCount, error: sessionError } = await supabase
      .from('lottery_tickets')
      .select('*', { count: 'exact', head: true })
      .eq('session_id', sessionId)
      .eq('status', 'soft-locked');

    if (sessionError) throw sessionError;

    if ((sessionLockCount || 0) >= MAX_LOCKS_PER_SESSION) {
      return NextResponse.json(
        { error: `Maximum ${MAX_LOCKS_PER_SESSION} tickets can be selected at once` },
        { status: 400 }
      );
    }

    // Check how many tickets this IP has locked
    const { data: ipTickets, error: ipError } = await supabase
      .from('lottery_tickets')
      .select('ticket_number')
      .eq('client_ip', clientIP)
      .eq('status', 'soft-locked');

    if (ipError) throw ipError;

    const alreadyLockedByThisIP = ipTickets?.some(t => t.ticket_number === ticketNumber);

    if ((ipTickets?.length || 0) >= MAX_LOCKS_PER_IP && !alreadyLockedByThisIP) {
      return NextResponse.json(
        { error: `Maximum ${MAX_LOCKS_PER_IP} tickets can be locked from your connection` },
        { status: 429 }
      );
    }

    // Get ticket and validate
    const { data: ticket, error: ticketError } = await supabase
      .from('lottery_tickets')
      .select('*')
      .eq('ticket_number', ticketNumber)
      .single();

    if (ticketError || !ticket) {
      return NextResponse.json(
        { error: 'Ticket not found' },
        { status: 404 }
      );
    }

    // Check if ticket is sold
    if (ticket.status === 'sold') {
      return NextResponse.json(
        { error: 'Ticket already sold' },
        { status: 400 }
      );
    }

    // Check if locked by another session
    if (ticket.status === 'soft-locked' && ticket.session_id !== sessionId) {
      const now = Date.now();
      const lockedTime = new Date(ticket.locked_at).getTime();
      const LOCK_EXPIRY = 5 * 60 * 1000;

      if (now - lockedTime < LOCK_EXPIRY) {
        return NextResponse.json(
          { error: 'Ticket is currently reserved by another user' },
          { status: 400 }
        );
      }
    }

    // ATOMIC UPDATE: Only lock if ticket is available OR expired lock OR locked by same session
    // This prevents race conditions where two users try to lock simultaneously
    const { data: updatedTicket, error: updateError } = await supabase
      .from('lottery_tickets')
      .update({
        status: 'soft-locked',
        session_id: sessionId,
        client_ip: clientIP,
        locked_at: new Date().toISOString(),
      })
      .eq('ticket_number', ticketNumber)
      .or(`status.eq.available,and(status.eq.soft-locked,session_id.eq.${sessionId})`)
      .select()
      .maybeSingle();

    if (updateError) throw updateError;

    // If no rows updated, ticket was locked by someone else between check and update
    if (!updatedTicket) {
      return NextResponse.json(
        { error: 'Ticket was just reserved by another user' },
        { status: 409 }
      );
    }

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
