import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/app/lib/supabase';

// In-memory cache to reduce database reads
let ticketCache: any = null;
let cacheTimestamp = 0;
const CACHE_DURATION = 30000; // 30 seconds cache

export async function GET(request: NextRequest) {
  try {
    // Get sessionId from query params to filter soft-locked tickets
    const { searchParams } = new URL(request.url);
    const sessionId = searchParams.get('sessionId');

    const now = Date.now();
    const supabase = createServerSupabaseClient();

    // ALWAYS fetch fresh data when sessionId is provided (for verification)
    // Use cache only for general ticket listing
    let tickets;
    if (!sessionId && ticketCache && (now - cacheTimestamp) < CACHE_DURATION) {
      tickets = ticketCache;
    } else {
      const { data, error } = await supabase
        .from('lottery_tickets')
        .select('*')
        .order('ticket_number');

      if (error) throw error;

      tickets = data;
      
      // Only cache if no sessionId (general listing)
      if (!sessionId) {
        ticketCache = tickets;
        cacheTimestamp = now;
      }
    }

    const available: number[] = [];
    const softLocked: number[] = [];
    const myTickets: number[] = [];
    const sold: number[] = [];

    const LOCK_EXPIRY = 5 * 60 * 1000; // 5 minutes
    const expiredTickets: number[] = [];

    tickets?.forEach((ticket: any) => {
      const ticketNumber = ticket.ticket_number;

      // Check if soft lock has expired (but DON'T release if there's a pending order)
      if (ticket.status === 'soft-locked' && ticket.locked_at && !ticket.order_id) {
        const lockedTime = new Date(ticket.locked_at).getTime();
        if (now - lockedTime > LOCK_EXPIRY) {
          // Mark for release
          expiredTickets.push(ticketNumber);
          available.push(ticketNumber);
          return;
        }
      }

      if (ticket.status === 'available') {
        available.push(ticketNumber);
      } else if (ticket.status === 'soft-locked') {
        // Separate tickets locked by current session vs others
        if (sessionId && ticket.session_id === sessionId) {
          myTickets.push(ticketNumber);
        } else {
          softLocked.push(ticketNumber);
        }
      } else if (ticket.status === 'sold') {
        sold.push(ticketNumber);
      }
    });

    // Release expired locks in background (non-blocking)
    if (expiredTickets.length > 0) {
      (async () => {
        try {
          await supabase
            .from('lottery_tickets')
            .update({
              status: 'available',
              session_id: null,
              client_ip: null,
              locked_at: null,
            })
            .in('ticket_number', expiredTickets);
          
          // Clear cache after updating
          ticketCache = null;
        } catch (err) {
          console.error('Error releasing expired locks:', err);
        }
      })();
    }

    return NextResponse.json({
      available: available.sort((a, b) => a - b),
      softLocked: softLocked.sort((a, b) => a - b),
      myTickets: myTickets.sort((a, b) => a - b),
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
