import { createClient } from '@supabase/supabase-js';
import { Resend } from 'resend';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Load environment variables
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

// Use fallback API key (API 2) to avoid quota issues
const resend = new Resend(process.env.RESEND_API_KEY2);

interface LotteryOrder {
  id: string;
  ticket_number: number;
  name: string;
  phone: string;
  email: string;
  parish: string;
  transaction_id: string;
  amount: number;
  status: string;
  confirmed_at: string;
  created_at: string;
}

async function resendETickets() {
  console.log('🔍 Fetching confirmed lottery orders...\n');

  // ==================== FILTERS ====================
  // Customize these filters to target specific orders:
  // Uncomment ONE option below and comment out the DEFAULT option
  
  // OPTION 1: Send from a specific ticket number onwards
  // const startTicket = 100; // Change this to your starting ticket number
  // let queryBuilder = supabase
  //   .from('lottery_orders')
  //   .select('*')
  //   .eq('status', 'confirmed')
  //   .gte('ticket_number', startTicket);

  // OPTION 2: Send for a range of ticket numbers
  // const startTicket = 100;
  // const endTicket = 150;
  // let queryBuilder = supabase
  //   .from('lottery_orders')
  //   .select('*')
  //   .eq('status', 'confirmed')
  //   .gte('ticket_number', startTicket)
  //   .lte('ticket_number', endTicket);

  // OPTION 3: Send to specific ticket numbers
  const ticketNumbers = [983,896,890,877,861];
  let queryBuilder = supabase
    .from('lottery_orders')
    .select('*')
    .eq('status', 'confirmed')
    .in('ticket_number', ticketNumbers);

  // OPTION 4: Send to orders confirmed after a specific date
  // const startDate = '2025-12-11T00:00:00'; // Change this date
  // let queryBuilder = supabase
  //   .from('lottery_orders')
  //   .select('*')
  //   .eq('status', 'confirmed')
  //   .gte('confirmed_at', startDate);

  // OPTION 5: Send to specific order IDs
  // const orderIds = ['order-id-1', 'order-id-2'];
  // let queryBuilder = supabase
  //   .from('lottery_orders')
  //   .select('*')
  //   .in('id', orderIds);

  // OPTION 6: Send to specific email addresses
  // const emails = ['customer1@example.com', 'customer2@example.com'];
  // let queryBuilder = supabase
  //   .from('lottery_orders')
  //   .select('*')
  //   .in('email', emails);

  // DEFAULT: Fetch ALL confirmed orders (comment this out if using an option above)
  // let queryBuilder = supabase
  //   .from('lottery_orders')
  //   .select('*')
  //   .eq('status', 'confirmed');
  
  // =================================================

  const { data: orders, error } = await queryBuilder.order('confirmed_at', { ascending: true });

  if (error) {
    console.error('❌ Error fetching orders:', error);
    return;
  }

  if (!orders || orders.length === 0) {
    console.log('✅ No confirmed orders found.');
    return;
  }

  console.log(`📧 Found ${orders.length} confirmed orders\n`);
  console.log('Order List:');
  console.log('─'.repeat(80));
  
  orders.forEach((order: LotteryOrder, index) => {
    console.log(`${index + 1}. Ticket #${order.ticket_number} - ${order.name} (${order.email})`);
    console.log(`   Confirmed: ${new Date(order.confirmed_at).toLocaleString()}`);
  });
  
  console.log('─'.repeat(80));
  console.log('\n⚠️  This will resend e-tickets to ALL confirmed orders listed above.');
  console.log('💡 If you want to send to specific orders only, edit this script to filter by date or order ID.\n');
  
  // Ask for confirmation
  const readline = require('readline');
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  rl.question('Do you want to proceed? (yes/no): ', async (answer: string) => {
    if (answer.toLowerCase() !== 'yes') {
      console.log('❌ Operation cancelled.');
      rl.close();
      return;
    }

    console.log('\n📤 Starting to resend e-tickets...\n');

    let successCount = 0;
    let failCount = 0;

    for (const order of orders as LotteryOrder[]) {
      try {
        const eTicketHtml = `
          <!DOCTYPE html>
          <html>
          <head>
            <style>
              body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; background-color: #f4f4f4; margin: 0; padding: 20px; }
              .container { max-width: 600px; margin: 0 auto; background-color: white; }
              .header { background-color: #FB923C; color: #1C1917; padding: 30px; text-align: center; }
              .ticket-box { background: linear-gradient(135deg, #FB923C 0%, #ea580c 100%); color: white; padding: 40px; text-align: center; margin: 30px; border-radius: 12px; box-shadow: 0 10px 30px rgba(0,0,0,0.2); }
              .ticket-number { font-size: 72px; font-weight: bold; margin: 20px 0; text-shadow: 2px 2px 4px rgba(0,0,0,0.3); }
              .content { padding: 30px; }
              .field { margin: 15px 0; padding: 15px; background-color: #f9f9f9; border-left: 4px solid #FB923C; }
              .label { font-weight: bold; color: #FB923C; font-size: 14px; }
              .value { margin-top: 5px; font-size: 16px; }
              .footer { background-color: #1C1917; color: #FAFAFA; padding: 20px; text-align: center; }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="header">
                <h1 style="margin: 0; font-size: 32px;">🎟️ CYP FUNDRAISER LOTTERY</h1>
                <p style="margin: 10px 0 0 0; font-size: 18px;">Official E-Ticket</p>
              </div>
              
              <div class="ticket-box">
                <div style="font-size: 20px; opacity: 0.9;">YOUR TICKET NUMBER</div>
                <div class="ticket-number">#${order.ticket_number}</div>
                <div style="font-size: 16px; opacity: 0.9;">Keep this ticket safe!</div>
              </div>
              
              <div class="content">
                <p style="font-size: 18px; color: #22c55e; font-weight: bold; text-align: center;">✅ Payment Confirmed</p>
                
                <h2 style="color: #FB923C;">Ticket Holder Details</h2>
                
                <div class="field">
                  <div class="label">Name</div>
                  <div class="value">${order.name}</div>
                </div>
                
                <div class="field">
                  <div class="label">Phone Number</div>
                  <div class="value">${order.phone}</div>
                </div>
                
                <div class="field">
                  <div class="label">Email</div>
                  <div class="value">${order.email}</div>
                </div>
                
                <div class="field">
                  <div class="label">Parish</div>
                  <div class="value">${order.parish}</div>
                </div>
                
                <div class="field">
                  <div class="label">Order ID</div>
                  <div class="value">${order.id}</div>
                </div>
                
                <div class="field">
                  <div class="label">Transaction ID</div>
                  <div class="value">${order.transaction_id}</div>
                </div>
                
                <div class="field">
                  <div class="label">Amount Paid</div>
                  <div class="value" style="color: #FB923C; font-size: 20px; font-weight: bold;">₹${order.amount}</div>
                </div>
                
                <div style="background-color: #fff3e0; padding: 20px; border-radius: 8px; margin-top: 30px; border: 2px solid #FB923C;">
                  <p style="margin: 0; font-weight: bold; color: #FB923C; font-size: 18px;">🎉 Draw Details</p>
                  <p style="margin: 10px 0 0 0; font-size: 16px;"><strong>Date:</strong> 29th December 2025</p>
                  <p style="margin: 5px 0 0 0; font-size: 16px;"><strong>Venue:</strong> Jeevan Darshan Kendra, Giriz</p>
                </div>
                
                <div style="background-color: #f0fdf4; padding: 20px; border-radius: 8px; margin-top: 20px; border: 2px solid #22c55e;">
                  <p style="margin: 0; font-weight: bold; color: #22c55e;">📱 For Queries:</p>
                  <p style="margin: 10px 0 0 0;">Contact us at <strong style="color: #FB923C;">+91 7875947907</strong></p>
                </div>
              </div>
              
              <div class="footer">
                <p style="margin: 0; font-size: 14px;">Thank you for supporting CYP Vasai Fundraiser! 🎉</p>
                <p style="margin: 10px 0 0 0; font-size: 12px;">The funds raised will be used for CYP Works of Mercy & Charity, Evangelizing youth, and Conducting retreats & youth camps</p>
                <p style="margin: 15px 0 0 0;"><a href="https://cypvasai.org" style="color: #FB923C; text-decoration: none;">cypvasai.org</a></p>
              </div>
            </div>
          </body>
          </html>
        `;

        const result = await resend.emails.send({
          from: 'CYP Lottery <lottery@fundraisers.cypvasai.org>',
          to: [order.email],
          subject: `🎟️ Your CYP Lottery E-Ticket - Ticket #${order.ticket_number}`,
          html: eTicketHtml,
        });

        if (result.error) {
          console.error(`❌ Failed - Ticket #${order.ticket_number} (${order.email}):`, result.error.message);
          failCount++;
        } else {
          console.log(`✅ Sent - Ticket #${order.ticket_number} to ${order.email}`);
          successCount++;
        }

        // Add small delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 500));

      } catch (error: any) {
        console.error(`❌ Error - Ticket #${order.ticket_number}:`, error.message);
        failCount++;
      }
    }

    console.log('\n' + '═'.repeat(80));
    console.log('📊 Summary:');
    console.log(`   ✅ Successfully sent: ${successCount}`);
    console.log(`   ❌ Failed: ${failCount}`);
    console.log(`   📧 Total: ${orders.length}`);
    console.log('═'.repeat(80));

    rl.close();
  });
}

resendETickets().catch(console.error);
