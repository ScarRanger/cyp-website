import { NextRequest, NextResponse } from 'next/server';
import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore, Timestamp } from 'firebase-admin/firestore';
import { google } from 'googleapis';
import { Resend } from 'resend';

// Initialize Firebase Admin if not already initialized
if (getApps().length === 0) {
  const credentials = JSON.parse(
    Buffer.from(process.env.FIREBASE_SERVICE_ACCOUNT_BASE64 || '', 'base64').toString('utf-8')
  );

  initializeApp({
    credential: cert(credentials)
  });
}

const db = getFirestore();

// Google Sheet ID for lottery orders
const LOTTERY_SHEET_ID = '1ODlIMild9QS0wHSQny3BV1dQVqCrxEMqxGwdP9d8iFY';

// Email recipients
const EMAIL_RECIPIENTS = [
  "rhine.pereira@gmail.com",
  "dabrecarren10@gmail.com",
  "crystal.colaco@gmail.com"
].filter(Boolean);

// Initialize Resend
const resend = new Resend(process.env.RESEND_API_KEY);

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

    // Verify ticket is still locked by this session
    const ticketRef = db.collection('lottery_tickets').doc(ticketNumber.toString());
    const ticketDoc = await ticketRef.get();

    if (!ticketDoc.exists) {
      return NextResponse.json(
        { error: 'Ticket not found' },
        { status: 404 }
      );
    }

    const ticketData = ticketDoc.data();

    if (ticketData?.status !== 'soft-locked' || ticketData?.sessionId !== sessionId) {
      return NextResponse.json(
        { error: 'Ticket is no longer reserved for you' },
        { status: 400 }
      );
    }

    // Create order in Firestore
    const ordersRef = db.collection('lottery_orders');
    const orderDoc = await ordersRef.add({
      ticketNumber,
      name,
      phone,
      email,
      parish,
      transactionId,
      amount,
      status: 'pending',
      createdAt: Timestamp.now(),
      sessionId,
    });

    const orderId = orderDoc.id;

    // Update ticket with order ID (keep as soft-locked until admin confirms)
    await ticketRef.update({
      orderId,
    });

    // Send emails asynchronously (non-blocking)
    const timestamp = new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' });
    
    // Send emails in background but don't block the response
    setImmediate(async () => {
      try {
        console.log('[Lottery Order] Sending admin email...');

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

        try {
          console.log('[Lottery Order] Sending admin email to:', EMAIL_RECIPIENTS.join(','));
          await resend.emails.send({
            from: 'CYP Lottery <lottery@fundraiser.cypvasai.org>',
            to: EMAIL_RECIPIENTS,
            subject: `New Lottery Order - Ticket #${ticketNumber} - ${name}`,
            html: adminEmailHtml,
          });
          console.log('[Lottery Order] Admin email sent successfully');
        } catch (emailError) {
          console.error('[Lottery Order] Error sending admin email:', emailError);
        }

        // Send confirmation email to customer
        const customerEmailHtml = `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background-color: #FB923C; color: #1C1917; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
            .content { background-color: #f9f9f9; padding: 30px; border-radius: 0 0 8px 8px; }
            .ticket { font-size: 48px; font-weight: bold; color: #FB923C; text-align: center; margin: 30px 0; padding: 20px; background-color: white; border-radius: 8px; }
            .field { margin: 15px 0; padding: 10px; background-color: white; border-left: 4px solid #FB923C; }
            .label { font-weight: bold; color: #FB923C; }
            .value { margin-top: 5px; }
            .highlight-box { background-color: #fff3e0; padding: 15px; border-radius: 8px; margin: 20px 0; border: 2px solid #FB923C; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>✅ Order Confirmation</h1>
            </div>
            <div class="content">
              <p>Dear ${name},</p>
              <p>Thank you for your lottery ticket purchase! We have received your order.</p>
              
              <div class="ticket">Ticket #${ticketNumber}</div>
              
              <div class="field">
                <div class="label">Order ID:</div>
                <div class="value">${orderId}</div>
              </div>
              
              <div class="field">
                <div class="label">Amount Paid:</div>
                <div class="value"><strong>₹${amount}</strong></div>
              </div>
              
              <div class="field">
                <div class="label">UPI Transaction ID:</div>
                <div class="value">${transactionId}</div>
              </div>
              
              <div class="highlight-box">
                <p><strong>📧 E-Ticket Delivery:</strong></p>
                <p>Your E-Ticket will be sent to this email address after payment verification. This usually takes a few hours.</p>
                <p style="margin-top: 10px; font-size: 14px; color: #666;">⚠️ Please check your junk or spam inbox as well.</p>
              </div>
              
              <div class="highlight-box">
                <p><strong>📞 For Queries:</strong></p>
                <p>Contact us at <strong style="color: #FB923C;">+91 8551098035</strong></p>
              </div>
              
              <p>Thank you for supporting CYP Vasai Fundraiser! 🎉</p>
              <p>Visit: <a href="https://cypvasai.org">cypvasai.org</a></p>
            </div>
          </div>
        </body>
        </html>
      `;

        try {
          console.log('[Lottery Order] Sending customer email to:', email);
          await resend.emails.send({
            from: 'CYP Lottery <lottery@fundraiser.cypvasai.org>',
            to: [email],
            subject: `Lottery Ticket Order Confirmation - Ticket #${ticketNumber}`,
            html: customerEmailHtml,
          });
          console.log('[Lottery Order] Customer email sent successfully');
        } catch (emailError) {
          console.error('[Lottery Order] Error sending customer email:', emailError);
        }
      } catch (error) {
        console.error('[Lottery Order] Error in background email sending:', error);
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
