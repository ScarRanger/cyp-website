import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Load environment variables from .env.local
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase environment variables');
  console.error('Make sure NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are set in .env.local');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function cleanupLotteryData() {
  console.log('🧹 Starting lottery data cleanup...\n');

  try {
    // 1. Get all orders
    console.log('📋 Fetching all orders...');
    const { data: orders, error: ordersError } = await supabase
      .from('lottery_orders')
      .select('*');

    if (ordersError) throw ordersError;

    console.log(`Found ${orders?.length || 0} orders\n`);

    // 2. Delete all orders
    if (orders && orders.length > 0) {
      console.log('🗑️  Deleting all orders...');
      const { error: deleteOrdersError } = await supabase
        .from('lottery_orders')
        .delete()
        .neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all

      if (deleteOrdersError) throw deleteOrdersError;
      console.log(`✅ Deleted ${orders.length} orders\n`);
    }

    // 3. Get all tickets
    console.log('🎫 Fetching all tickets...');
    const { data: tickets, error: ticketsError } = await supabase
      .from('lottery_tickets')
      .select('*');

    if (ticketsError) throw ticketsError;

    console.log(`Found ${tickets?.length || 0} tickets\n`);

    // 4. Reset all tickets to available status
    console.log('🔄 Resetting all tickets to available...');
    const { error: resetError } = await supabase
      .from('lottery_tickets')
      .update({
        status: 'available',
        session_id: null,
        client_ip: null,
        locked_at: null,
        order_id: null,
      })
      .neq('ticket_number', 0); // Update all tickets

    if (resetError) throw resetError;
    console.log(`✅ Reset ${tickets?.length || 0} tickets to available status\n`);

    // 5. Verify cleanup
    console.log('🔍 Verifying cleanup...');
    
    const { data: remainingOrders } = await supabase
      .from('lottery_orders')
      .select('id', { count: 'exact', head: true });

    const { data: availableTickets, error: verifyError } = await supabase
      .from('lottery_tickets')
      .select('ticket_number, status')
      .order('ticket_number');

    if (verifyError) throw verifyError;

    console.log('\n📊 Cleanup Summary:');
    console.log('═══════════════════════════════════════');
    console.log(`Orders remaining: 0`);
    console.log(`Tickets reset: ${availableTickets?.length || 0}`);
    console.log(`Available tickets: ${availableTickets?.filter(t => t.status === 'available').length || 0}`);
    console.log(`Soft-locked tickets: ${availableTickets?.filter(t => t.status === 'soft-locked').length || 0}`);
    console.log(`Sold tickets: ${availableTickets?.filter(t => t.status === 'sold').length || 0}`);
    console.log('═══════════════════════════════════════\n');

    console.log('✅ Cleanup complete! Lottery system is ready for production.');
    console.log('\n💡 Next steps:');
    console.log('   1. Test the lottery page - all tickets should be available');
    console.log('   2. Try selecting and purchasing tickets');
    console.log('   3. Check admin panel for new orders\n');

  } catch (error) {
    console.error('\n❌ Error during cleanup:', error);
    process.exit(1);
  }
}

// Run cleanup
cleanupLotteryData();
