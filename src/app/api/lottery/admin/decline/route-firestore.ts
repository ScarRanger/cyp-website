import { NextRequest, NextResponse } from 'next/server';
import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore, Timestamp } from 'firebase-admin/firestore';
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

// Initialize Resend
const resend = new Resend(process.env.RESEND_API_KEY);

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

    // Use transaction to ensure atomic updates
    let orderData: any;
    
    await db.runTransaction(async (transaction) => {
      // Re-read order within transaction
      const orderDoc = await transaction.get(orderRef);
      
      if (!orderDoc.exists) {
        throw new Error('Order not found');
      }

      orderData = orderDoc.data();

      if (orderData?.status !== 'pending') {
        throw new Error('Order is not pending');
      }

      // Atomically update both ticket and order
      const ticketRef = db.collection('lottery_tickets').doc(orderData.ticketNumber.toString());
      transaction.update(ticketRef, {
        status: 'available',
        sessionId: null,
        lockedAt: null,
        orderId: null,
      });

      transaction.update(orderRef, {
        status: 'declined',
        declinedAt: Timestamp.now(),
      });
    });

    // Send decline notification email
    const declineHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; background-color: #f4f4f4; margin: 0; padding: 20px; }
          .container { max-width: 600px; margin: 0 auto; background-color: white; }
          .header { background-color: #ef4444; color: white; padding: 30px; text-align: center; }
          .content { padding: 30px; }
          .notice-box { background-color: #fee2e2; border-left: 4px solid #ef4444; padding: 20px; margin: 20px 0; border-radius: 4px; }
          .info-box { background-color: #f9f9f9; padding: 15px; margin: 15px 0; border-radius: 4px; }
          .footer { background-color: #1C1917; color: #FAFAFA; padding: 20px; text-align: center; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1 style="margin: 0; font-size: 28px;">⚠️ Order Status Update</h1>
            <p style="margin: 10px 0 0 0;">CYP Lottery - Order Declined</p>
          </div>
          
          <div class="content">
            <p>Dear ${orderData.name},</p>
            
            <div class="notice-box">
              <p style="margin: 0; font-weight: bold; color: #ef4444;">Your lottery ticket order has been declined by our admin team.</p>
            </div>
            
            <h3 style="color: #FB923C;">Order Details</h3>
            
            <div class="info-box">
              <p style="margin: 5px 0;"><strong>Order ID:</strong> ${orderId}</p>
              <p style="margin: 5px 0;"><strong>Ticket Number:</strong> #${orderData.ticketNumber}</p>
              <p style="margin: 5px 0;"><strong>Transaction ID:</strong> ${orderData.transactionId}</p>
              <p style="margin: 5px 0;"><strong>Amount:</strong> ₹${orderData.amount}</p>
            </div>
            
            <h3 style="color: #FB923C;">What This Means</h3>
            <p>The ticket <strong>#${orderData.ticketNumber}</strong> has been released and is now available for others to purchase. This could be due to:</p>
            <ul>
              <li>Payment verification issues</li>
              <li>Incomplete transaction details</li>
              <li>Duplicate order</li>
            </ul>
            
            <h3 style="color: #FB923C;">Next Steps</h3>
            <p>If you believe this was an error or would like to purchase another ticket, please:</p>
            <ul>
              <li>Contact us at <strong style="color: #FB923C;">+91 8551098035</strong></li>
              <li>Email us with your order details</li>
              <li>Visit our lottery page to select a new ticket</li>
            </ul>
            
            <div style="background-color: #fff3e0; padding: 20px; border-radius: 8px; margin-top: 30px; border: 2px solid #FB923C;">
              <p style="margin: 0; font-weight: bold; color: #FB923C;">📱 Need Help?</p>
              <p style="margin: 10px 0 0 0;">Contact us at <strong style="color: #FB923C;">+91 8551098035</strong></p>
              <p style="margin: 10px 0 0 0;">Email: <strong style="color: #FB923C;">admin@cypvasai.org</strong></p>
            </div>
          </div>
          
          <div class="footer">
            <p style="margin: 0; font-size: 14px;">CYP Vasai Fundraiser</p>
            <p style="margin: 10px 0 0 0;"><a href="https://cypvasai.org" style="color: #FB923C; text-decoration: none;">cypvasai.org</a></p>
          </div>
        </div>
      </body>
      </html>
    `;

    // Send email (await to ensure it completes in production)
    try {
      await resend.emails.send({
        from: 'CYP Lottery <lottery@fundraiser.cypvasai.org>',
        to: [orderData.email],
        subject: `⚠️ CYP Lottery - Order Declined (Ticket #${orderData.ticketNumber})`,
        html: declineHtml,
      });
    } catch (err) {
      console.error('Error sending decline email:', err);
    }

    return NextResponse.json({
      success: true,
      message: 'Order declined, ticket released, and customer notified',
    });
  } catch (error) {
    console.error('Error declining order:', error);
    return NextResponse.json(
      { error: 'Failed to decline order' },
      { status: 500 }
    );
  }
}
