import { sendEmailWithAttachmentsViaSES } from './ses';
import { isEmailSuppressed } from './email-suppression';
import type { QRPayload } from '@/app/types/concert';

export interface EmailAttachment {
  Name: string;
  Content: string; // base64 encoded
  ContentType: string;
}

export interface EmailOptions {
  to: string;
  subject: string;
  htmlBody: string;
  textBody?: string;
  tag?: string;
  attachments?: EmailAttachment[];
}

interface EmailResponse {
  success: boolean;
  messageId?: string;
  provider: string;
  suppressed?: boolean;
}

/**
 * Send an email using AWS SES
 * Checks suppression list before sending to protect sender reputation
 */
export async function sendEmail(options: EmailOptions): Promise<EmailResponse> {
  // Check if email is suppressed (bounced/complained)
  const suppressed = await isEmailSuppressed(options.to);
  if (suppressed) {
    console.log(`[email-service] Skipping email to ${options.to} - address is suppressed`);
    return {
      success: false,
      provider: 'ses',
      suppressed: true,
    };
  }

  const result = await sendEmailWithAttachmentsViaSES({
    to: options.to,
    subject: options.subject,
    htmlBody: options.htmlBody,
    textBody: options.textBody,
    attachments: options.attachments,
  });
  return {
    success: result.success,
    messageId: result.messageId,
    provider: 'ses',
  };
}

/**
 * Generate QR code URL
 */
export function generateQRCodeUrl(data: string, size: number = 200): string {
  const encodedData = encodeURIComponent(data);
  return `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&data=${encodedData}`;
}

/**
 * Ticket info for email generation
 */
export interface TicketInfo {
  ticketId: string;
  tier: string;
  qrPayload: QRPayload;
  fileName: string;
  pdfBase64: string;
}

/**
 * Send concert ticket email with multiple tickets (consolidated)
 */
export async function sendTicketEmail(
  buyerEmail: string,
  buyerName: string,
  purchaseDate: string,
  tickets: TicketInfo[]
): Promise<EmailResponse> {
  // Group tickets by tier
  const ticketsByTier = tickets.reduce((acc, ticket) => {
    const tier = ticket.tier;
    if (!acc[tier]) {
      acc[tier] = [];
    }
    acc[tier].push(ticket);
    return acc;
  }, {} as Record<string, TicketInfo[]>);

  const tierSummary = Object.entries(ticketsByTier)
    .map(([tier, tierTickets]) => `${tierTickets.length}x ${tier}`)
    .join(' + ');

  const htmlBody = generateTicketEmailHtml({
    buyerName,
    tierSummary,
    ticketsByTier,
    ticketCount: tickets.length,
    ticketIds: tickets.map(t => t.ticketId),
    purchaseDate,
    eventDate: 'Saturday, 21st March 2026',
    eventTime: '6:00 PM Onwards',
    venue: 'Rumao World School, Giriz, Vasai',
    mapUrl: 'https://maps.app.goo.gl/wt2GbSbStjn9KF6y8',
  });

  // Collect all PDF attachments
  const attachments: EmailAttachment[] = tickets.map(ticket => ({
    Name: ticket.fileName,
    Content: ticket.pdfBase64,
    ContentType: 'application/pdf',
  }));

  const subject = tickets.length === 1
    ? `🎟️ Your CYP Concert Ticket - ${tickets[0].tier}`
    : `🎟️ Your ${tickets.length} CYP Concert Tickets`;

  return sendEmail({
    to: buyerEmail,
    subject,
    htmlBody,
    tag: 'concert-ticket',
    attachments,
  });
}

interface TicketEmailData {
  buyerName: string;
  tierSummary: string;
  ticketsByTier: Record<string, TicketInfo[]>;
  ticketCount: number;
  ticketIds: string[];
  purchaseDate: string;
  eventDate: string;
  eventTime: string;
  venue: string;
  mapUrl?: string;
}

function generateTicketEmailHtml(data: TicketEmailData): string {
  // Generate HTML for each tier group
  const tierGroupsHtml = Object.entries(data.ticketsByTier)
    .map(([tier, tierTickets]) => {
      const ticketIdsHtml = tierTickets
        .map((t, i) => `<code style="color: #e94560; display: block; margin: 2px 0;">Ticket ${i + 1}: ${t.ticketId.substring(0, 8)}...</code>`)
        .join('');
      return `
        <div style="margin-bottom: 15px; padding: 15px; background: rgba(255,255,255,0.03); border-radius: 8px;">
          <span style="display: inline-block; background: linear-gradient(135deg, #e94560 0%, #533483 100%); color: #ffffff; padding: 6px 16px; border-radius: 15px; font-weight: bold; font-size: 14px; margin-bottom: 10px;">
            ${tierTickets.length}x ${tier} TICKET${tierTickets.length > 1 ? 'S' : ''}
          </span>
          <div style="text-align: left; color: #a0a0b0; font-size: 12px; margin-top: 10px;">
            ${ticketIdsHtml}
          </div>
        </div>
      `;
    })
    .join('');

  const ticketLabel = data.ticketCount === 1 ? 'ticket' : 'tickets';
  const attachmentNote = data.ticketCount === 1
    ? 'Your ticket PDF is attached to this email.'
    : `All ${data.ticketCount} ticket PDFs are attached to this email.`;

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Your Concert Ticket${data.ticketCount > 1 ? 's' : ''}</title>
</head>
<body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #0f0f1a;">
  <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background-color: #0f0f1a;">
    <tr>
      <td style="padding: 40px 20px;">
        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="max-width: 600px; margin: 0 auto;">
          
          <!-- Header -->
          <tr>
            <td style="background: linear-gradient(135deg, #e94560 0%, #533483 100%); padding: 30px; text-align: center; border-radius: 16px 16px 0 0;">
              <h1 style="color: #ffffff; margin: 0; font-size: 28px; font-weight: bold;">
                🎵 CYP CONCERT 2026
              </h1>
              <p style="color: rgba(255,255,255,0.9); margin: 10px 0 0 0; font-size: 16px;">
                An Evening of Praise & Worship
              </p>
            </td>
          </tr>
          
          <!-- Ticket Body -->
          <tr>
            <td style="background-color: #1a1a2e; padding: 30px; border-left: 1px solid rgba(233, 69, 96, 0.3); border-right: 1px solid rgba(233, 69, 96, 0.3);">
              
              <!-- Greeting -->
              <p style="color: #ffffff; font-size: 18px; margin: 0 0 20px 0;">
                Dear <strong>${data.buyerName}</strong>,
              </p>
              <p style="color: #a0a0b0; margin: 0 0 30px 0;">
                Thank you for your purchase! Here ${data.ticketCount === 1 ? 'is your e-ticket' : `are your ${data.ticketCount} e-tickets`} for the CYP Concert 2026.
              </p>
              
              <!-- Ticket Card -->
              <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background-color: rgba(255,255,255,0.03); border: 1px solid rgba(233, 69, 96, 0.3); border-radius: 12px; overflow: hidden;">
                <tr>
                  <td style="padding: 25px;">
                    
                    <!-- Tier Badge -->
                    <div style="text-align: center; margin-bottom: 20px;">
                      <span style="display: inline-block; background: linear-gradient(135deg, #e94560 0%, #533483 100%); color: #ffffff; padding: 8px 24px; border-radius: 20px; font-weight: bold; font-size: 18px;">
                        ${data.tierSummary} TICKETS
                      </span>
                    </div>
                    
                    <!-- Tickets by Tier -->
                    <div style="text-align: center; margin: 10px 0 20px 0;">
                      ${tierGroupsHtml}
                    </div>
                    
                    <!-- Event Details -->
                    <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                      <tr>
                        <td style="padding: 10px 0; border-top: 1px dashed rgba(233, 69, 96, 0.3);">
                          <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                            <tr>
                              <td style="color: #a0a0b0; font-size: 14px; width: 40px;">📅</td>
                              <td style="color: #ffffff; font-size: 14px;">${data.eventDate}</td>
                            </tr>
                          </table>
                        </td>
                      </tr>
                      <tr>
                        <td style="padding: 10px 0;">
                          <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                            <tr>
                              <td style="color: #a0a0b0; font-size: 14px; width: 40px;">⏰</td>
                              <td style="color: #ffffff; font-size: 14px;">${data.eventTime}</td>
                            </tr>
                          </table>
                        </td>
                      </tr>
                      <tr>
                        <td style="padding: 10px 0;">
                          <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                            <tr>
                              <td style="color: #a0a0b0; font-size: 14px; width: 40px;">📍</td>
                              <td style="color: #ffffff; font-size: 14px;">
                                ${data.venue}
                                ${data.mapUrl ? `<br/><a href="${data.mapUrl}" style="color: #e94560; text-decoration: none; font-size: 12px;">📍 View on Google Maps →</a>` : ''}
                              </td>
                            </tr>
                          </table>
                        </td>
                      </tr>
                    </table>
                    
                  </td>
                </tr>
              </table>
              
              <!-- Attachment Note -->
              <div style="margin-top: 20px; padding: 15px; background-color: rgba(83, 52, 131, 0.2); border-radius: 8px; border-left: 4px solid #533483;">
                <p style="color: #a0a0b0; margin: 0; font-size: 14px;">
                  📎 <strong style="color: #ffffff;">${attachmentNote}</strong>
                </p>
              </div>
              
              <!-- Instructions -->
              <div style="margin-top: 20px; padding: 20px; background-color: rgba(245, 197, 24, 0.1); border-radius: 12px; border-left: 4px solid #f5c518;">
                <p style="color: #f5c518; margin: 0 0 10px 0; font-weight: bold;">📱 How to Use Your ${ticketLabel}</p>
                <ol style="color: #a0a0b0; margin: 0; padding-left: 20px; line-height: 1.8;">
                  <li>Open the attached PDF ${ticketLabel}</li>
                  <li>Show the QR code${data.ticketCount > 1 ? 's' : ''} at the entrance on the event day</li>
                  <li>Our team will scan and verify your ${ticketLabel}</li>
                </ol>
              </div>
              
              <!-- Purchase Info -->
              <p style="color: #a0a0b0; font-size: 12px; margin: 30px 0 0 0; text-align: center;">
                Purchased on: ${data.purchaseDate}
              </p>
              
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td style="background-color: #1a1a2e; padding: 20px 30px; text-align: center; border-radius: 0 0 16px 16px; border: 1px solid rgba(233, 69, 96, 0.3); border-top: none;">
              <p style="color: #a0a0b0; margin: 0 0 10px 0; font-size: 14px;">
                For queries, contact: <a href="tel:+919923341074" style="color: #e94560; text-decoration: none;">+91 9923341074</a>
              </p>
              <p style="color: #666; margin: 0; font-size: 12px;">
                Organized by Christian Youth in Power (CYP) Vasai
              </p>
              <p style="color: #666; margin: 10px 0 0 0; font-size: 12px;">
                <a href="https://cypvasai.org" style="color: #e94560; text-decoration: none;">cypvasai.org</a>
              </p>
            </td>
          </tr>
          
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `;
}

/**
 * Simple HTML to plain text converter
 */
function stripHtml(html: string): string {
  return html
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<[^>]+>/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}
