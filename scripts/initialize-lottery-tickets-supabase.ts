import * as dotenv from 'dotenv';
import * as path from 'path';
import { createClient } from '@supabase/supabase-js';

// Load environment variables
dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase environment variables!');
  console.error('Make sure NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are set in .env.local');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function initializeLotteryTickets() {
  console.log('🎟️  Initializing lottery tickets in Supabase...\n');

  const ranges = [
    [851, 900],
    [951, 1000],
  ];

  const tickets = [];

  for (const [start, end] of ranges) {
    for (let i = start; i <= end; i++) {
      tickets.push({
        ticket_number: i,
        status: 'available',
        session_id: null,
        client_ip: null,
        locked_at: null,
        order_id: null,
      });
      console.log(`✓ Ticket #${i} prepared`);
    }
  }

  console.log(`\n📤 Inserting ${tickets.length} tickets into Supabase...`);

  const { data, error } = await supabase
    .from('lottery_tickets')
    .upsert(tickets, { onConflict: 'ticket_number' });

  if (error) {
    console.error('❌ Error inserting tickets:', error);
    process.exit(1);
  }

  console.log('\n✅ Successfully created lottery tickets!');
  console.log('Ranges initialized: 851–900 and 951–1000');
  console.log(`Total tickets: ${tickets.length}`);
  console.log('\n🎉 Migration complete! You can now start your dev server.');
}

initializeLotteryTickets()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('❌ Error initializing lottery tickets:', error);
    process.exit(1);
  });
