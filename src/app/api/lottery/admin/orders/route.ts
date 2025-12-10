import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/app/lib/supabase';

export async function GET(request: NextRequest) {
  try {
    const supabase = createServerSupabaseClient();
    
    const { data: orders, error } = await supabase
      .from('lottery_orders')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;

    // Format the response to match the expected structure
    const formattedOrders = orders?.map(order => ({
      id: order.id,
      ticketNumber: order.ticket_number,
      name: order.name,
      phone: order.phone,
      email: order.email,
      parish: order.parish,
      transactionId: order.transaction_id,
      amount: order.amount,
      status: order.status,
      createdAt: order.created_at,
      confirmedAt: order.confirmed_at,
      declinedAt: order.declined_at,
    })) || [];

    return NextResponse.json({ orders: formattedOrders });
  } catch (error) {
    console.error('Error fetching lottery orders:', error);
    return NextResponse.json(
      { error: 'Failed to fetch orders' },
      { status: 500 }
    );
  }
}
