import { NextRequest, NextResponse } from 'next/server';
import { google } from 'googleapis';
import nodemailer from 'nodemailer';

// Google Sheet ID for fundraiser orders
const FUNDRAISER_SHEET_ID = '1ODlIMild9QS0wHSQny3BV1dQVqCrxEMqxGwdP9d8iFY';

// Email recipients
const EMAIL_RECIPIENTS = [
  "rhine.pereira@gmail.com",
  "dabrecarren10@gmail.com",
  "crystal.colaco@gmail.com"
].filter(Boolean);

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
    const { name, phone, email, parish, paymentMode, transactionId, items, subtotal } = body;

    // Validate required fields
    if (!name || !phone || !email || !parish || !paymentMode || !items || !subtotal) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Initialize Google Sheets API
    const credentials = JSON.parse(
      Buffer.from(process.env.GOOGLE_SERVICE_ACCOUNT_BASE64 || '', 'base64').toString('utf-8')
    );

    const auth = new google.auth.GoogleAuth({
      credentials,
      scopes: ['https://www.googleapis.com/auth/spreadsheets'],
    });

    const sheets = google.sheets({ version: 'v4', auth });

    // Prepare timestamp
    const timestamp = new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' });

    // Prepare items summary
    const itemsSummary = items.map((item: any) => 
      `${item.title}${item.variant ? ` (${item.variant})` : ''} (Qty: ${item.qty}) - ₹${item.price * item.qty}`
    ).join(', ');

    // Prepare row data
    const row = [timestamp, name, phone, email, parish, paymentMode, transactionId || 'N/A', itemsSummary, `₹${subtotal}`];

    // Append to sheet
    await sheets.spreadsheets.values.append({
      spreadsheetId: FUNDRAISER_SHEET_ID,
      range: 'Preorders!A:I',
      valueInputOption: 'RAW',
      requestBody: {
        values: [row],
      },
    });

    // Send email notification
    try {
      const emailHtml = `
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
            .items-table { width: 100%; border-collapse: collapse; margin: 15px 0; }
            .items-table th, .items-table td { padding: 10px; text-align: left; border-bottom: 1px solid #ddd; }
            .items-table th { background-color: #FB923C; color: white; }
            .total { font-size: 18px; font-weight: bold; color: #FB923C; margin-top: 20px; text-align: right; }
            .footer { text-align: center; margin-top: 20px; color: #666; font-size: 12px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>🛒 New Fundraiser Order</h1>
            </div>
            <div class="content">
              <p>A new order has been placed for the CYP Fundraiser!</p>
              
              <div class="field">
                <div class="label">Customer Name:</div>
                <div class="value">${name}</div>
              </div>
              
              <div class="field">
                <div class="label">Phone Number:</div>
                <div class="value">${phone}</div>
              </div>
              
              <div class="field">
                <div class="label">Parish:</div>
                <div class="value">${parish}</div>
              </div>
              
              <div class="field">
                <div class="label">Payment Mode:</div>
                <div class="value"><strong>${paymentMode}</strong></div>
              </div>
              
              <div class="field">
                <div class="label">Order Items:</div>
                <table class="items-table">
                  <thead>
                    <tr>
                      <th>Item</th>
                      <th>Qty</th>
                      <th>Price</th>
                      <th>Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    ${items.map((item: any) => `
                      <tr>
                        <td>${item.title}${item.variant ? ` <span style="color: #FB923C;">(${item.variant})</span>` : ''}</td>
                        <td>${item.qty}</td>
                        <td>₹${item.price}</td>
                        <td>₹${item.price * item.qty}</td>
                      </tr>
                    `).join('')}
                  </tbody>
                </table>
              </div>
              
              <div class="total">
                Total Amount: ₹${subtotal}
              </div>
              
              <div class="field">
                <div class="label">Order Time:</div>
                <div class="value">${timestamp}</div>
              </div>
              
              <div class="footer">
                <p>This is an automated notification from CYP Vasai Fundraiser</p>
                <p>For queries, contact: <strong>+91 8551098035</strong></p>
                <p>Visit: <a href="https://cypvasai.org">cypvasai.org</a></p>
              </div>
            </div>
          </div>
        </body>
        </html>
      `;

      const itemsText = items.map((item: any) => 
        `${item.title} - Qty: ${item.qty} - ₹${item.price} x ${item.qty} = ₹${item.price * item.qty}`
      ).join('\n');

      await transporter.sendMail({
        from: `"CYP Fundraiser" <${process.env.SMTP_USER}>`,
        to: EMAIL_RECIPIENTS.join(', '),
        subject: `New Fundraiser Order: ${name} - ₹${subtotal}`,
        html: emailHtml,
        text: `New Fundraiser Order\n\nCustomer: ${name}\nPhone: ${phone}\nParish: ${parish}\nPayment Mode: ${paymentMode}\n\nItems:\n${itemsText}\n\nTotal: ₹${subtotal}\nTime: ${timestamp}\n\nFor queries, contact: +91 8551098035`,
      });

      console.log('Email notification sent successfully');
    } catch (emailError) {
      console.error('Error sending email:', emailError);
      // Don't fail the entire request if email fails
    }

    // Send confirmation email to customer
    try {
      const customerEmailHtml = `
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
            .items-table { width: 100%; border-collapse: collapse; margin: 15px 0; }
            .items-table th, .items-table td { padding: 10px; text-align: left; border-bottom: 1px solid #ddd; }
            .items-table th { background-color: #FB923C; color: white; }
            .total { font-size: 18px; font-weight: bold; color: #FB923C; margin-top: 20px; text-align: right; }
            .highlight-box { background-color: #fff3e0; padding: 15px; border-radius: 8px; margin: 20px 0; border: 2px solid #FB923C; }
            .footer { text-align: center; margin-top: 20px; color: #666; font-size: 12px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>✅ Order Confirmation</h1>
            </div>
            <div class="content">
              <p>Dear ${name},</p>
              <p>Thank you for your order! We have received your order details and will process it shortly.</p>
              
              <div class="field">
                <div class="label">Order Details:</div>
              </div>
              
              <table class="items-table">
                <thead>
                  <tr>
                    <th>Item</th>
                    <th>Qty</th>
                    <th>Price</th>
                    <th>Total</th>
                  </tr>
                </thead>
                <tbody>
                  ${items.map((item: any) => `
                    <tr>
                      <td>${item.title}${item.variant ? ` <span style="color: #FB923C;">(${item.variant})</span>` : ''}</td>
                      <td>${item.qty}</td>
                      <td>₹${item.price}</td>
                      <td>₹${item.price * item.qty}</td>
                    </tr>
                  `).join('')}
                </tbody>
              </table>
              
              <div class="total">
                Total Amount: ₹${subtotal}
              </div>

              <div class="field">
                <div class="label">Payment Mode:</div>
                <div class="value">${paymentMode}${transactionId ? ` (Transaction ID: ${transactionId})` : ''}</div>
              </div>
              
              <div class="highlight-box">
                <p><strong>📦 For Delivery:</strong></p>
                <p>Please contact us at <strong style="color: #FB923C;">+91 8551098035</strong> to arrange delivery of your order.</p>
              </div>

              <div class="field">
                <div class="label">Order Time:</div>
                <div class="value">${timestamp}</div>
              </div>
              
              <div class="footer">
                <p>Thank you for supporting CYP Vasai Fundraiser! 🎉</p>
                <p>For queries, contact: <strong>+91 8551098035</strong></p>
                <p>Visit: <a href="https://cypvasai.org">cypvasai.org</a></p>
              </div>
            </div>
          </div>
        </body>
        </html>
      `;

      await transporter.sendMail({
        from: `"CYP Fundraiser" <${process.env.SMTP_USER}>`,
        to: email,
        subject: `Order Confirmation - CYP Fundraiser`,
        html: customerEmailHtml,
        text: `Dear ${name},\n\nThank you for your order!\n\nOrder Details:\n${items.map((item: any) => 
          `${item.title} - Qty: ${item.qty} - ₹${item.price * item.qty}`
        ).join('\n')}\n\nTotal: ₹${subtotal}\nPayment Mode: ${paymentMode}${transactionId ? ` (Transaction ID: ${transactionId})` : ''}\n\nFor delivery, please contact us at +91 8551098035\n\nOrder Time: ${timestamp}\n\nThank you for supporting CYP Vasai Fundraiser!\nFor queries, contact: +91 8551098035\nVisit: cypvasai.org`,
      });

      console.log('Customer confirmation email sent successfully');
    } catch (emailError) {
      console.error('Error sending customer confirmation email:', emailError);
    }

    return NextResponse.json(
      { message: 'Order placed successfully!' },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error processing order:', error);
    return NextResponse.json(
      { error: 'Failed to process order' },
      { status: 500 }
    );
  }
}
