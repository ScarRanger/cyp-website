import { NextRequest, NextResponse } from 'next/server';
import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore, Timestamp } from 'firebase-admin/firestore';
import nodemailer from 'nodemailer';

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

// Create SMTP transporter
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.hostinger.com',
  port: parseInt(process.env.SMTP_PORT || '465'),
  secure: true,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASSWORD,
  },
});

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

    // Get order details
    const orderRef = db.collection('lottery_orders').doc(orderId);
    const orderDoc = await orderRef.get();

    if (!orderDoc.exists) {
      return NextResponse.json(
        { error: 'Order not found' },
        { status: 404 }
      );
    }

    const orderData = orderDoc.data();

    if (orderData?.status !== 'pending') {
      return NextResponse.json(
        { error: 'Order is not pending' },
        { status: 400 }
      );
    }

    // Update order status
    await orderRef.update({
      status: 'confirmed',
      confirmedAt: Timestamp.now(),
    });

    // Update ticket status to sold
    const ticketRef = db.collection('lottery_tickets').doc(orderData.ticketNumber.toString());
    await ticketRef.update({
      status: 'sold',
    });

    // Send E-Ticket email asynchronously (non-blocking)
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
          .divider { border-top: 2px dashed #FB923C; margin: 30px 0; }
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
            <div class="ticket-number">#${orderData.ticketNumber}</div>
            <div style="font-size: 16px; opacity: 0.9;">Keep this ticket safe!</div>
          </div>
          
          <div class="content">
            <p style="font-size: 18px; color: #22c55e; font-weight: bold; text-align: center;">✅ Payment Confirmed</p>
            
            <div class="divider"></div>
            
            <h2 style="color: #FB923C;">Ticket Holder Details</h2>
            
            <div class="field">
              <div class="label">Name</div>
              <div class="value">${orderData.name}</div>
            </div>
            
            <div class="field">
              <div class="label">Phone Number</div>
              <div class="value">${orderData.phone}</div>
            </div>
            
            <div class="field">
              <div class="label">Email</div>
              <div class="value">${orderData.email}</div>
            </div>
            
            <div class="field">
              <div class="label">Parish</div>
              <div class="value">${orderData.parish}</div>
            </div>
            
            <div class="divider"></div>
            
            <div class="field">
              <div class="label">Order ID</div>
              <div class="value">${orderId}</div>
            </div>
            
            <div class="field">
              <div class="label">Transaction ID</div>
              <div class="value">${orderData.transactionId}</div>
            </div>
            
            <div class="field">
              <div class="label">Amount Paid</div>
              <div class="value" style="color: #FB923C; font-size: 20px; font-weight: bold;">₹${orderData.amount}</div>
            </div>
            
            <div style="background-color: #fff3e0; padding: 20px; border-radius: 8px; margin-top: 30px; border: 2px solid #FB923C;">
              <p style="margin: 0; font-weight: bold; color: #FB923C;">📱 For Queries:</p>
              <p style="margin: 10px 0 0 0;">Contact us at <strong style="color: #FB923C;">+91 8551098035</strong></p>
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

    // Send email asynchronously without blocking the response
    transporter.sendMail({
      from: `"CYP Lottery" <${process.env.SMTP_USER}>`,
      to: orderData.email,
      subject: `🎟️ Your CYP Lottery E-Ticket - Ticket #${orderData.ticketNumber}`,
      html: eTicketHtml,
    }).catch(err => console.error('Error sending e-ticket email:', err));

    // Log to Google Sheets in background (non-blocking)
    (async () => {
      try {
        const { google } = await import('googleapis');
        const credentials = JSON.parse(
          Buffer.from(process.env.GOOGLE_SERVICE_ACCOUNT_BASE64 || '', 'base64').toString('utf-8')
        );

        const auth = new google.auth.GoogleAuth({
          credentials,
          scopes: ['https://www.googleapis.com/auth/spreadsheets'],
        });

        const sheets = google.sheets({ version: 'v4', auth });
        const timestamp = new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' });

        const row = [
          timestamp,
          orderId,
          `Ticket #${orderData.ticketNumber}`,
          orderData.name,
          orderData.phone,
          orderData.email,
          orderData.parish,
          orderData.transactionId,
          `₹${orderData.amount}`,
          'Confirmed'
        ];

        await sheets.spreadsheets.values.append({
          spreadsheetId: '1ODlIMild9QS0wHSQny3BV1dQVqCrxEMqxGwdP9d8iFY',
          range: 'Lottery!A:J',
          valueInputOption: 'RAW',
          requestBody: {
            values: [row],
          },
        });
      } catch (sheetError) {
        console.error('Error logging to Google Sheets:', sheetError);
      }
    })();

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
