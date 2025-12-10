import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Load environment variables
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { autoRefreshToken: false, persistSession: false }
});

async function verifyProductionReadiness() {
  console.log('🔍 Running Production Readiness Verification...\n');
  
  let passed = 0;
  let failed = 0;

  // Test 1: Database Connection
  console.log('1️⃣  Testing database connection...');
  try {
    const { error } = await supabase.from('lottery_tickets').select('ticket_number', { count: 'exact', head: true });
    if (error) throw error;
    console.log('   ✅ Database connection successful\n');
    passed++;
  } catch (error) {
    console.log('   ❌ Database connection failed:', error);
    failed++;
  }

  // Test 2: Verify Tables Exist
  console.log('2️⃣  Verifying tables exist...');
  try {
    const { data: tickets } = await supabase.from('lottery_tickets').select('*').limit(1);
    const { data: orders } = await supabase.from('lottery_orders').select('*').limit(1);
    console.log('   ✅ Both tables exist and accessible\n');
    passed++;
  } catch (error) {
    console.log('   ❌ Table verification failed:', error);
    failed++;
  }

  // Test 3: Verify Ticket Count
  console.log('3️⃣  Verifying ticket count...');
  try {
    const { data: tickets, error } = await supabase.from('lottery_tickets').select('ticket_number');
    if (error) throw error;
    
    if (tickets?.length === 100) {
      console.log(`   ✅ Correct ticket count: ${tickets.length}\n`);
      passed++;
    } else {
      console.log(`   ❌ Incorrect ticket count: ${tickets?.length} (expected 100)\n`);
      failed++;
    }
  } catch (error) {
    console.log('   ❌ Ticket count check failed:', error);
    failed++;
  }

  // Test 4: Verify Ticket Ranges
  console.log('4️⃣  Verifying ticket ranges...');
  try {
    const { data: tickets } = await supabase
      .from('lottery_tickets')
      .select('ticket_number')
      .order('ticket_number');
    
    const numbers = tickets?.map(t => t.ticket_number) || [];
    const range1 = numbers.filter(n => n >= 851 && n <= 900);
    const range2 = numbers.filter(n => n >= 951 && n <= 1000);
    
    if (range1.length === 50 && range2.length === 50) {
      console.log('   ✅ Ticket ranges correct (851-900: 50, 951-1000: 50)\n');
      passed++;
    } else {
      console.log(`   ❌ Ticket ranges incorrect (851-900: ${range1.length}, 951-1000: ${range2.length})\n`);
      failed++;
    }
  } catch (error) {
    console.log('   ❌ Ticket range check failed:', error);
    failed++;
  }

  // Test 5: Verify All Tickets Available
  console.log('5️⃣  Verifying all tickets are available...');
  try {
    const { data: tickets } = await supabase
      .from('lottery_tickets')
      .select('ticket_number, status, order_id, session_id');
    
    const available = tickets?.filter(t => t.status === 'available') || [];
    const locked = tickets?.filter(t => t.status === 'soft-locked') || [];
    const sold = tickets?.filter(t => t.status === 'sold') || [];
    const withOrders = tickets?.filter(t => t.order_id) || [];
    const withSessions = tickets?.filter(t => t.session_id) || [];
    
    console.log(`   Available: ${available.length}`);
    console.log(`   Soft-locked: ${locked.length}`);
    console.log(`   Sold: ${sold.length}`);
    console.log(`   With order_id: ${withOrders.length}`);
    console.log(`   With session_id: ${withSessions.length}`);
    
    if (available.length === 100 && locked.length === 0 && sold.length === 0) {
      console.log('   ✅ All tickets available for purchase\n');
      passed++;
    } else {
      console.log('   ⚠️  Some tickets not available - Run cleanup script!\n');
      failed++;
    }
  } catch (error) {
    console.log('   ❌ Ticket status check failed:', error);
    failed++;
  }

  // Test 6: Verify No Pending Orders
  console.log('6️⃣  Verifying no pending orders...');
  try {
    const { data: orders, count } = await supabase
      .from('lottery_orders')
      .select('*', { count: 'exact' });
    
    if (count === 0) {
      console.log('   ✅ No pending orders (clean slate)\n');
      passed++;
    } else {
      console.log(`   ⚠️  Found ${count} order(s) - Run cleanup script before launch!\n`);
      failed++;
    }
  } catch (error) {
    console.log('   ❌ Order check failed:', error);
    failed++;
  }

  // Test 7: Verify Unique Index on Transaction ID
  console.log('7️⃣  Testing duplicate transaction prevention...');
  try {
    const testTxnId = `TEST-${Date.now()}`;
    
    // Insert first order
    const { error: insert1 } = await supabase
      .from('lottery_orders')
      .insert({
        ticket_number: 851,
        name: 'Test User',
        phone: '1234567890',
        email: 'test@test.com',
        parish: 'Test Parish',
        transaction_id: testTxnId,
        amount: 100,
        status: 'pending',
        session_id: 'test-session',
      });
    
    if (insert1) throw insert1;
    
    // Try duplicate transaction
    const { error: insert2 } = await supabase
      .from('lottery_orders')
      .insert({
        ticket_number: 852,
        name: 'Test User 2',
        phone: '9876543210',
        email: 'test2@test.com',
        parish: 'Test Parish 2',
        transaction_id: testTxnId, // Same transaction ID
        amount: 100,
        status: 'pending',
        session_id: 'test-session-2',
      });
    
    // Clean up test order
    await supabase.from('lottery_orders').delete().eq('transaction_id', testTxnId);
    
    if (insert2) {
      console.log('   ✅ Duplicate transaction correctly prevented\n');
      passed++;
    } else {
      console.log('   ❌ Duplicate transaction NOT prevented - CRITICAL ISSUE!\n');
      failed++;
    }
  } catch (error) {
    console.log('   ❌ Duplicate prevention test failed:', error);
    failed++;
  }

  // Test 8: Verify Environment Variables
  console.log('8️⃣  Verifying environment variables...');
  let envIssues = [];
  
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL) envIssues.push('NEXT_PUBLIC_SUPABASE_URL');
  if (!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) envIssues.push('NEXT_PUBLIC_SUPABASE_ANON_KEY');
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) envIssues.push('SUPABASE_SERVICE_ROLE_KEY');
  if (!process.env.RESEND_API_KEY) envIssues.push('RESEND_API_KEY');
  
  if (envIssues.length === 0) {
    console.log('   ✅ All required environment variables set\n');
    passed++;
  } else {
    console.log(`   ❌ Missing environment variables: ${envIssues.join(', ')}\n`);
    failed++;
  }

  // Final Report
  console.log('═══════════════════════════════════════════════════════');
  console.log('📊 PRODUCTION READINESS REPORT');
  console.log('═══════════════════════════════════════════════════════');
  console.log(`✅ Passed: ${passed}/8`);
  console.log(`❌ Failed: ${failed}/8`);
  console.log('═══════════════════════════════════════════════════════\n');

  if (failed === 0) {
    console.log('🎉 ALL CHECKS PASSED - SYSTEM IS PRODUCTION READY!\n');
    console.log('📋 Next Steps:');
    console.log('   1. Deploy to production');
    console.log('   2. Test one order end-to-end');
    console.log('   3. Monitor first few real orders');
    console.log('   4. Go live! 🚀\n');
  } else if (failed <= 2) {
    console.log('⚠️  MINOR ISSUES FOUND - Fix before launch\n');
    console.log('📋 Action Required:');
    console.log('   1. Run cleanup script if test data exists');
    console.log('   2. Re-run this verification');
    console.log('   3. Deploy when all checks pass\n');
  } else {
    console.log('❌ CRITICAL ISSUES FOUND - DO NOT DEPLOY\n');
    console.log('📋 Action Required:');
    console.log('   1. Review failed checks above');
    console.log('   2. Fix all critical issues');
    console.log('   3. Re-run verification\n');
  }

  process.exit(failed > 0 ? 1 : 0);
}

verifyProductionReadiness();
