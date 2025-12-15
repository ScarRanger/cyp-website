import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/app/lib/supabase';
import { google } from 'googleapis';
import { Resend } from 'resend';

// Google Sheet ID for lottery orders
const LOTTERY_SHEET_ID = '1ODlIMild9QS0wHSQny3BV1dQVqCrxEMqxGwdP9d8iFY';

// Email recipients
const EMAIL_RECIPIENTS = [
  "rhinepereira0@gmail.com",
  "crystal.colaco@gmail.com"
].filter(Boolean);

// Initialize Resend with API 2 as primary and API 1 as fallback
const resend = new Resend(process.env.RESEND_API_KEY2);
const resendFallback = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, phone, email, parish, transactionId, ticketNumber, amount, sessionId } = body;

    // Validate required fields
    if (!name || !phone || !email || !parish || !transactionId || !ticketNumber || !amount || !sessionId) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    const supabase = createServerSupabaseClient();

    // Check for duplicate transactionId
    const { data: existingOrder, error: duplicateError } = await supabase
      .from('lottery_orders')
      .select('id')
      .eq('transaction_id', transactionId)
      .maybeSingle();

    if (duplicateError && duplicateError.code !== 'PGRST116') {
      throw duplicateError;
    }

    if (existingOrder) {
      return NextResponse.json(
        { 
          error: 'This transaction ID has already been used',
          existingOrderId: existingOrder.id,
        },
        { status: 409 }
      );
    }

    // Verify ticket is still locked by this session
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

    if (ticket.status !== 'soft-locked' || ticket.session_id !== sessionId) {
      console.error('[Order Error]', {
        ticketNumber,
        expectedSession: sessionId,
        actualSession: ticket.session_id,
        expectedStatus: 'soft-locked',
        actualStatus: ticket.status,
        hasOrderId: !!ticket.order_id,
      });
      return NextResponse.json(
        { 
          error: 'Ticket is no longer reserved for you',
          details: {
            ticketStatus: ticket.status,
            sessionMatch: ticket.session_id === sessionId,
          }
        },
        { status: 400 }
      );
    }

    // Create order
    const { data: newOrder, error: orderError } = await supabase
      .from('lottery_orders')
      .insert({
        ticket_number: ticketNumber,
        name,
        phone,
        email,
        parish,
        transaction_id: transactionId,
        amount,
        status: 'pending',
        session_id: sessionId,
      })
      .select()
      .single();

    if (orderError) throw orderError;

    const orderId = newOrder.id;

    // Update ticket with order ID
    const { error: updateError } = await supabase
      .from('lottery_tickets')
      .update({ order_id: orderId })
      .eq('ticket_number', ticketNumber);

    if (updateError) throw updateError;

    // Send emails in background (non-blocking)
    // TEMPORARILY PAUSED - Uncomment to re-enable
    /*
    const timestamp = new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' });
    
    setImmediate(async () => {
      try {
        // Send email notification to admins
        const adminEmailHtml = `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background-color: #FB923C; color: #1C1917; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
            .content { background-color: #f9f9f9; padding: 30px; border-radius: 0 0 8px 8px; }
            .field { margin: 15px 0; padding: 10px; background-color: white; border-left: 4px solid #FB923C; }
            .label { font-weight: bold; color: #FB923C; }
            .value { margin-top: 5px; }
            .ticket { font-size: 36px; font-weight: bold; color: #FB923C; text-align: center; margin: 20px 0; }
            .button { display: inline-block; padding: 12px 24px; background-color: #FB923C; color: white; text-decoration: none; border-radius: 6px; margin: 10px 5px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>🎟️ New Lottery Ticket Order</h1>
            </div>
            <div class="content">
              <p>A new lottery ticket order has been placed!</p>
              
              <div class="ticket">Ticket #${ticketNumber}</div>
              
              <div class="field">
                <div class="label">Order ID:</div>
                <div class="value">${orderId}</div>
              </div>
              
              <div class="field">
                <div class="label">Customer Name:</div>
                <div class="value">${name}</div>
              </div>
              
              <div class="field">
                <div class="label">Phone Number:</div>
                <div class="value">${phone}</div>
              </div>
              
              <div class="field">
                <div class="label">Email:</div>
                <div class="value">${email}</div>
              </div>
              
              <div class="field">
                <div class="label">Parish:</div>
                <div class="value">${parish}</div>
              </div>
              
              <div class="field">
                <div class="label">UPI Transaction ID:</div>
                <div class="value"><strong>${transactionId}</strong></div>
              </div>
              
              <div class="field">
                <div class="label">Amount:</div>
                <div class="value"><strong>₹${amount}</strong></div>
              </div>
              
              <div class="field">
                <div class="label">Order Time:</div>
                <div class="value">${timestamp}</div>
              </div>
              
              <div style="text-align: center; margin-top: 30px;">
                <p><strong>Please verify the payment and confirm/decline the order from the admin panel.</strong></p>
                <a href="${process.env.NEXT_PUBLIC_BASE_URL || 'https://cypvasai.org'}/admin/lottery" class="button">Go to Admin Panel</a>
              </div>
            </div>
          </div>
        </body>
        </html>
      `;

        // Try primary, fallback to secondary if it fails
        let emailSent = false;
        let emailError = null;
        
        // Retry function with delay
        const sendWithRetry = async (resendClient: any, fromAddress: string, maxRetries = 2) => {
          for (let attempt = 1; attempt <= maxRetries; attempt++) {
            try {
              const result = await resendClient.emails.send({
                from: fromAddress,
                to: EMAIL_RECIPIENTS,
                subject: `New Lottery Order - Ticket #${ticketNumber} - ${name}`,
                html: adminEmailHtml,
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
          console.log('[Email] Primary Resend success');
        } catch (primaryError: any) {
          console.error('[Email] Primary Resend failed after retries:', primaryError?.message || primaryError);
          emailError = primaryError?.message || String(primaryError);
          
          // Try fallback
          if (resendFallback) {
            try {
              await sendWithRetry(resendFallback, 'CYP Lottery <lottery@fundraiser.cypvasai.org>');
              emailSent = true;
              console.log('[Email] Fallback Resend success');
              emailError = null;
            } catch (fallbackError: any) {
              console.error('[Email] Fallback Resend also failed after retries:', fallbackError?.message || fallbackError);
              emailError = `Primary: ${primaryError?.message || primaryError} | Fallback: ${fallbackError?.message || fallbackError}`;
            }
          } else {
            console.error('[Email] No fallback API key configured');
          }
        }
        
        // Log failed email to database for manual retry
        if (!emailSent) {
          console.error('[Email] ⚠️ CRITICAL: All email attempts failed for order:', orderId);
          try {
            await supabase.from('lottery_orders').update({
              email_failed: true,
              email_error: emailError?.substring(0, 500),
            }).eq('id', orderId);
          } catch (dbError) {
            console.error('[Email] Failed to log email failure to database:', dbError);
          }
        }

        // Customer will only receive E-Ticket email after admin approval (no confirmation email)
      } catch (error) {
        console.error('[Lottery Order] Error sending emails:', error);
      }
    });
    */

    return NextResponse.json({
      success: true,
      message: 'Order placed successfully!',
      orderId,
    });
  } catch (error) {
    console.error('Error processing lottery order:', error);
    return NextResponse.json(
      { error: 'Failed to process order' },
      { status: 500 }
    );
  }
}
