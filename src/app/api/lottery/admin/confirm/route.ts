import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/app/lib/supabase';
import { Resend } from 'resend';
import { google } from 'googleapis';

const resend = new Resend(process.env.RESEND_API_KEY2);
const resendFallback = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;

const LOTTERY_SHEET_ID = '1ODlIMild9QS0wHSQny3BV1dQVqCrxEMqxGwdP9d8iFY';
const SHEET_NAME = 'Lottery';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { orderId } = body;

    if (!orderId) {
      return NextResponse.json(
        { error: 'Missing orderId' },
        { status: 400 }
      );
    }

    const supabase = createServerSupabaseClient();

    // Get order details
    const { data: order, error: orderError } = await supabase
      .from('lottery_orders')
      .select('*')
      .eq('id', orderId)
      .single();

    if (orderError || !order) {
      return NextResponse.json(
        { error: 'Order not found' },
        { status: 404 }
      );
    }

    if (order.status !== 'pending') {
      return NextResponse.json(
        { error: 'Order is not pending' },
        { status: 400 }
      );
    }

    // Update order status to confirmed
    const { error: updateOrderError } = await supabase
      .from('lottery_orders')
      .update({
        status: 'confirmed',
        confirmed_at: new Date().toISOString(),
      })
      .eq('id', orderId);

    if (updateOrderError) throw updateOrderError;

    // Update ticket status to sold
    const { error: updateTicketError } = await supabase
      .from('lottery_tickets')
      .update({ status: 'sold' })
      .eq('ticket_number', order.ticket_number);

    if (updateTicketError) throw updateTicketError;

    // Send E-Ticket email
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
              <div class="value">${orderId}</div>
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

    try {
      // Try primary, fallback to secondary if it fails
      let emailSent = false;
      let emailError = null;
      
      // Retry function with delay
      const sendWithRetry = async (resendClient: any, fromAddress: string, maxRetries = 2) => {
        for (let attempt = 1; attempt <= maxRetries; attempt++) {
          try {
            const result = await resendClient.emails.send({
              from: fromAddress,
              to: [order.email],
              subject: `🎟️ Your CYP Lottery E-Ticket - Ticket #${order.ticket_number}`,
              html: eTicketHtml,
            });
            
            if (result.error) {
              throw new Error(result.error.message || 'Resend API error');
            }
            return { success: true, result };
          } catch (error: any) {
            if (attempt < maxRetries) {
              await new Promise(resolve => setTimeout(resolve, 1000 * attempt)); // Wait 1s, 2s
            } else {
              throw error;
            }
          }
        }
      };
      
      try {
        await sendWithRetry(resend, 'CYP Lottery <lottery@fundraisers.cypvasai.org>');
        emailSent = true;
        console.log('[E-Ticket Email] Primary Resend success');
      } catch (primaryError: any) {
        console.error('[E-Ticket Email] Primary Resend failed after retries:', primaryError?.message || primaryError);
        emailError = primaryError?.message || String(primaryError);
        
        // Try fallback
        if (resendFallback) {
          try {
            await sendWithRetry(resendFallback, 'CYP Lottery <lottery@fundraiser.cypvasai.org>');
            emailSent = true;
            console.log('[E-Ticket Email] Fallback Resend success');
            emailError = null;
          } catch (fallbackError: any) {
            console.error('[E-Ticket Email] Fallback Resend also failed after retries:', fallbackError?.message || fallbackError);
            emailError = `Primary: ${primaryError?.message || primaryError} | Fallback: ${fallbackError?.message || fallbackError}`;
          }
        } else {
          console.error('[E-Ticket Email] No fallback API key configured');
        }
      }
      
      // Log failed email to database for manual retry
      if (!emailSent) {
        console.error('[E-Ticket Email] ⚠️ CRITICAL: All email attempts failed for order:', orderId);
        try {
          await supabase.from('lottery_orders').update({
            eticket_email_failed: true,
            eticket_email_error: emailError?.substring(0, 500),
          }).eq('id', orderId);
        } catch (dbError) {
          console.error('[E-Ticket Email] Failed to log email failure to database:', dbError);
        }
      }
    } catch (err) {
      console.error('Error sending e-ticket email (both attempts):', err);
    }

    // Append to Google Sheets in background
    setImmediate(async () => {
      try {
        // Decode base64 service account JSON
        const serviceAccount = JSON.parse(
          Buffer.from(process.env.GOOGLE_SERVICE_ACCOUNT_BASE64 || '', 'base64').toString('utf8')
        );

        const auth = new google.auth.GoogleAuth({
          credentials: {
            client_email: serviceAccount.client_email,
            private_key: serviceAccount.private_key,
          },
          scopes: ['https://www.googleapis.com/auth/spreadsheets'],
        });


        const sheets = google.sheets({ version: 'v4', auth });

        // Prepare row data
        const rowData = [
          orderId,
          order.ticket_number,
          order.name,
          order.phone,
          order.email,
          order.parish,
          order.transaction_id,
          order.amount,
          'confirmed',
          new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }),
          order.created_at ? new Date(order.created_at).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }) : '',
        ];

        // Append to sheet
        await sheets.spreadsheets.values.append({
          spreadsheetId: LOTTERY_SHEET_ID,
          range: `${SHEET_NAME}!A:K`,
          valueInputOption: 'RAW',
          requestBody: {
            values: [rowData],
          },
        });

        console.log(`✅ Order ${orderId} appended to Google Sheets`);
      } catch (sheetError) {
        console.error('Error appending to Google Sheets:', sheetError);
        // Don't fail the request if sheets fails
      }
    });

    return NextResponse.json({
      success: true,
      message: 'Order confirmed and E-Ticket sent',
    });
  } catch (error) {
    console.error('Error confirming order:', error);
    return NextResponse.json(
      { error: 'Failed to confirm order' },
      { status: 500 }
    );
  }
}
