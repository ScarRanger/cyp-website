import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/app/lib/supabase';

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

    const supabase = createServerSupabaseClient();

    // Get ticket
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

    // Only release if locked by this session AND no order has been placed
    if (ticket.status === 'soft-locked' && ticket.session_id === sessionId) {
      if (ticket.order_id) {
        return NextResponse.json({
          success: false,
          message: 'Cannot release - order already placed for this ticket',
        });
      }

      // Release the lock
      const { error: updateError } = await supabase
        .from('lottery_tickets')
        .update({
          status: 'available',
          session_id: null,
          locked_at: null,
        })
        .eq('ticket_number', ticketNumber);

      if (updateError) throw updateError;

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
