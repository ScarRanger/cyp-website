import { SESClient, SendEmailCommand, SendRawEmailCommand } from '@aws-sdk/client-ses';

const AWS_SES_REGION = process.env.AWS_SES_REGION || process.env.AWS_REGION || 'ap-south-1';
const AWS_SES_FROM_EMAIL = process.env.AWS_SES_FROM_EMAIL || 'CYP Vasai <tickets@concert.cypvasai.org>';

// Create SES client (uses AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY from env)
const sesClient = new SESClient({
    region: AWS_SES_REGION,
    credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
    },
});

interface SESEmailOptions {
    to: string;
    subject: string;
    htmlBody: string;
    textBody?: string;
}

interface SESAttachment {
    Name: string;
    Content: string; // base64 encoded
    ContentType: string;
}

interface SESEmailWithAttachmentsOptions extends SESEmailOptions {
    attachments?: SESAttachment[];
}

interface SESResponse {
    messageId: string;
    success: boolean;
}

/**
 * Send a simple email via AWS SES (no attachments)
 */
export async function sendEmailViaSES(options: SESEmailOptions): Promise<SESResponse> {
    const command = new SendEmailCommand({
        Source: AWS_SES_FROM_EMAIL,
        Destination: {
            ToAddresses: [options.to],
        },
        Message: {
            Subject: {
                Data: options.subject,
                Charset: 'UTF-8',
            },
            Body: {
                Html: {
                    Data: options.htmlBody,
                    Charset: 'UTF-8',
                },
                Text: {
                    Data: options.textBody || stripHtml(options.htmlBody),
                    Charset: 'UTF-8',
                },
            },
        },
    });

    const response = await sesClient.send(command);

    return {
        messageId: response.MessageId || '',
        success: true,
    };
}

/**
 * Send an email with attachments via AWS SES using raw email
 */
export async function sendEmailWithAttachmentsViaSES(
    options: SESEmailWithAttachmentsOptions
): Promise<SESResponse> {
    // If no attachments, use simple send
    if (!options.attachments || options.attachments.length === 0) {
        return sendEmailViaSES(options);
    }

    // Build raw MIME email for attachments
    const boundary = `----=_Part_${Date.now()}_${Math.random().toString(36).substring(2)}`;

    const rawEmailParts: string[] = [
        `From: ${AWS_SES_FROM_EMAIL}`,
        `To: ${options.to}`,
        `Subject: =?UTF-8?B?${Buffer.from(options.subject).toString('base64')}?=`,
        'MIME-Version: 1.0',
        `Content-Type: multipart/mixed; boundary="${boundary}"`,
        '',
        `--${boundary}`,
        'Content-Type: multipart/alternative; boundary="alt-boundary"',
        '',
        '--alt-boundary',
        'Content-Type: text/plain; charset=UTF-8',
        'Content-Transfer-Encoding: quoted-printable',
        '',
        options.textBody || stripHtml(options.htmlBody),
        '',
        '--alt-boundary',
        'Content-Type: text/html; charset=UTF-8',
        'Content-Transfer-Encoding: quoted-printable',
        '',
        options.htmlBody,
        '',
        '--alt-boundary--',
    ];

    // Add attachments
    for (const attachment of options.attachments) {
        rawEmailParts.push(
            '',
            `--${boundary}`,
            `Content-Type: ${attachment.ContentType}; name="${attachment.Name}"`,
            'Content-Transfer-Encoding: base64',
            `Content-Disposition: attachment; filename="${attachment.Name}"`,
            '',
            // Split base64 into 76-character lines
            attachment.Content.match(/.{1,76}/g)?.join('\n') || attachment.Content
        );
    }

    rawEmailParts.push('', `--${boundary}--`);

    const rawEmail = rawEmailParts.join('\r\n');

    const command = new SendRawEmailCommand({
        RawMessage: {
            Data: Buffer.from(rawEmail),
        },
    });

    const response = await sesClient.send(command);

    return {
        messageId: response.MessageId || '',
        success: true,
    };
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
