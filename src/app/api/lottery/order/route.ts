import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/app/lib/supabase';
import { google } from 'googleapis';
import { Resend } from 'resend';

// Google Sheet ID for lottery orders
const LOTTERY_SHEET_ID = '1ODlIMild9QS0wHSQny3BV1dQVqCrxEMqxGwdP9d8iFY';

// Email recipients
const EMAIL_RECIPIENTS = [
  "rhine.pereira@gmail.com",
  "dabrecarren10@gmail.com",
  "crystal.colaco@gmail.com"
].filter(Boolean);

// Initialize Resend with fallback support
const resend = new Resend(process.env.RESEND_API_KEY);
const resendFallback = process.env.RESEND_API_KEY2 ? new Resend(process.env.RESEND_API_KEY2) : null;

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
      return NextResponse.json(
        { error: 'Ticket is no longer reserved for you' },
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
        try {
          await resend.emails.send({
            from: 'CYP Lottery <lottery@fundraiser.cypvasai.org>',
            to: EMAIL_RECIPIENTS,
            subject: `New Lottery Order - Ticket #${ticketNumber} - ${name}`,
            html: adminEmailHtml,
          });
        } catch (primaryError) {
          console.log('[Email] Primary Resend failed, trying fallback:', primaryError);
          if (resendFallback) {
            await resendFallback.emails.send({
              from: 'CYP Lottery <lottery@fundraisers.cypvasai.org>',
              to: EMAIL_RECIPIENTS,
              subject: `New Lottery Order - Ticket #${ticketNumber} - ${name}`,
              html: adminEmailHtml,
            });
          } else {
            throw primaryError;
          }
        }

        // Customer will only receive E-Ticket email after admin approval (no confirmation email)
      } catch (error) {
        console.error('[Lottery Order] Error sending emails:', error);
      }
    });

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
