import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/app/lib/supabase';
import { createQRPayload } from '@/app/lib/qr-signature';
import type { TicketMetadata } from '@/app/types/concert';
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import QRCode from 'qrcode';

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { tier, quantity, name, email, phone } = body;

        // Validate required fields
        if (!tier || !quantity || !name || !email || !phone) {
            return NextResponse.json(
                { error: 'Missing required fields' },
                { status: 400 }
            );
        }

        const supabase = createServerSupabaseClient();

        // Get tier info and check availability
        const { data: tierData, error: tierError } = await supabase
            .from('concert_ticket_inventory')
            .select('*')
            .eq('tier', tier)
            .single();

        if (tierError || !tierData) {
            return NextResponse.json(
                { error: 'Tier not found' },
                { status: 404 }
            );
        }

        // Check availability
        const available = tierData.total_tickets - tierData.sold_tickets;

        if (available < quantity) {
            return NextResponse.json(
                { error: `Only ${available} tickets available in ${tier} tier` },
                { status: 400 }
            );
        }

        // Generate order ID
        const orderId = `ORD-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        const purchaseDate = new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' });

        // Create tickets
        const tickets = [];
        const pdfDataUrls = [];

        for (let i = 0; i < quantity; i++) {
            // Create QR payload for this ticket
            const ticketId = crypto.randomUUID();
            const qrPayload = createQRPayload(ticketId, name, tier);

            const metadata: TicketMetadata = {
                buyer_name: name,
                buyer_email: email,
                buyer_phone: phone,
                order_id: orderId,
                qr_data: qrPayload,
                purchase_date: purchaseDate,
            };

            // Insert ticket record
            const { data: ticket, error: ticketError } = await supabase
                .from('tickets')
                .insert({
                    id: ticketId,
                    tier,
                    status: 'active',
                    metadata,
                })
                .select()
                .single();

            if (ticketError) throw ticketError;

            tickets.push(ticket);

            // Generate ticket data for PDF
            const ticketData = {
                ticketId,
                orderId,
                tier,
                buyerName: name,
                buyerEmail: email,
                buyerPhone: phone,
                purchaseDate,
                qrData: qrPayload,
                eventDetails: {
                    name: 'CYP Concert 2026',
                    date: 'Saturday, 21st March 2026',
                    time: '6:00 PM Onwards',
                    venue: 'GG College, Vasai',
                },
            };

            // Generate PDF and get base64
            const pdfBase64 = await generateTicketPDF(ticketData);
            pdfDataUrls.push({
                ticketId,
                tier,
                fileName: `CYP-Concert-Ticket-${tier}-${ticketId.substring(0, 8)}.pdf`,
                data: pdfBase64,
            });
        }

        // Update inventory: increment sold count
        await supabase
            .from('concert_ticket_inventory')
            .update({
                sold_tickets: tierData.sold_tickets + quantity,
                updated_at: new Date().toISOString(),
            })
            .eq('tier', tier);

        return NextResponse.json({
            success: true,
            message: `Successfully purchased ${quantity} ${tier} ticket(s)!`,
            orderId,
            tickets: tickets.map(t => ({
                id: t.id,
                tier: t.tier,
                status: t.status,
            })),
            pdfTickets: pdfDataUrls,
        });

    } catch (error) {
        console.error('Error processing order:', error);
        return NextResponse.json(
            { error: 'Failed to process order' },
            { status: 500 }
        );
    }
}

interface TicketData {
    ticketId: string;
    orderId: string;
    tier: string;
    buyerName: string;
    buyerEmail: string;
    buyerPhone: string;
    purchaseDate: string;
    qrData: {
        id: string;
        name: string;
        tier: string;
        nonce: string;
        signature: string;
    };
    eventDetails: {
        name: string;
        date: string;
        time: string;
        venue: string;
    };
}

async function generateTicketPDF(data: TicketData): Promise<string> {
    // Create a new PDF document
    const pdfDoc = await PDFDocument.create();
    const page = pdfDoc.addPage([400, 600]);

    // Embed fonts
    const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
    const regularFont = await pdfDoc.embedFont(StandardFonts.Helvetica);

    // Colors
    const primaryColor = rgb(0.91, 0.27, 0.38);
    const textColor = rgb(0.1, 0.1, 0.1);
    const mutedColor = rgb(0.4, 0.4, 0.4);

    const { width, height } = page.getSize();

    // Draw header background
    page.drawRectangle({
        x: 0,
        y: height - 100,
        width: width,
        height: 100,
        color: primaryColor,
    });

    // Header text
    page.drawText('CYP CONCERT 2026', {
        x: 50,
        y: height - 50,
        size: 24,
        font: boldFont,
        color: rgb(1, 1, 1),
    });

    page.drawText('An Evening of Praise & Worship', {
        x: 50,
        y: height - 75,
        size: 12,
        font: regularFont,
        color: rgb(1, 1, 1),
    });

    // Tier badge
    const tierY = height - 140;
    page.drawRectangle({
        x: 130,
        y: tierY - 10,
        width: 140,
        height: 35,
        color: primaryColor,
    });

    page.drawText(`${data.tier} TICKET`, {
        x: 155,
        y: tierY,
        size: 14,
        font: boldFont,
        color: rgb(1, 1, 1),
    });

    // Generate QR Code
    const qrDataString = JSON.stringify(data.qrData);
    const qrCodeDataUrl = await QRCode.toDataURL(qrDataString, {
        width: 150,
        margin: 1,
        color: {
            dark: '#000000',
            light: '#ffffff',
        },
    });

    // Convert data URL to bytes
    const qrCodeBase64 = qrCodeDataUrl.split(',')[1];
    const qrCodeBytes = Buffer.from(qrCodeBase64, 'base64');
    const qrImage = await pdfDoc.embedPng(qrCodeBytes);

    // Draw QR code with white background
    const qrSize = 130;
    const qrX = (width - qrSize) / 2;
    const qrY = height - 310;

    page.drawRectangle({
        x: qrX - 10,
        y: qrY - 10,
        width: qrSize + 20,
        height: qrSize + 20,
        color: rgb(1, 1, 1),
    });

    page.drawImage(qrImage, {
        x: qrX,
        y: qrY,
        width: qrSize,
        height: qrSize,
    });

    // Ticket ID
    const ticketIdText = `Ticket ID: ${data.ticketId.substring(0, 8)}...`;
    page.drawText(ticketIdText, {
        x: 130,
        y: qrY - 25,
        size: 9,
        font: regularFont,
        color: mutedColor,
    });

    // Divider line
    page.drawLine({
        start: { x: 30, y: qrY - 45 },
        end: { x: width - 30, y: qrY - 45 },
        thickness: 1,
        color: rgb(0.85, 0.85, 0.85),
        dashArray: [5, 3],
    });

    // Event details
    const detailsY = qrY - 75;
    const labelX = 50;
    const textX = 100;

    page.drawText('Date:', { x: labelX, y: detailsY, size: 10, font: boldFont, color: mutedColor });
    page.drawText(data.eventDetails.date, { x: textX, y: detailsY, size: 11, font: regularFont, color: textColor });

    page.drawText('Time:', { x: labelX, y: detailsY - 22, size: 10, font: boldFont, color: mutedColor });
    page.drawText(data.eventDetails.time, { x: textX, y: detailsY - 22, size: 11, font: regularFont, color: textColor });

    page.drawText('Venue:', { x: labelX, y: detailsY - 44, size: 10, font: boldFont, color: mutedColor });
    page.drawText(data.eventDetails.venue, { x: textX, y: detailsY - 44, size: 11, font: regularFont, color: textColor });

    // Buyer info box
    const buyerBoxY = detailsY - 100;
    page.drawRectangle({
        x: 30,
        y: buyerBoxY - 60,
        width: width - 60,
        height: 80,
        color: rgb(0.98, 0.95, 0.95),
    });

    page.drawText('Buyer Information', { x: 45, y: buyerBoxY, size: 10, font: boldFont, color: primaryColor });
    page.drawText(`Name: ${data.buyerName}`, { x: 45, y: buyerBoxY - 18, size: 10, font: regularFont, color: textColor });
    page.drawText(`Email: ${data.buyerEmail}`, { x: 45, y: buyerBoxY - 33, size: 10, font: regularFont, color: textColor });
    page.drawText(`Phone: ${data.buyerPhone}`, { x: 45, y: buyerBoxY - 48, size: 10, font: regularFont, color: textColor });

    // Footer
    page.drawText(`Order: ${data.orderId}`, {
        x: 50,
        y: 35,
        size: 8,
        font: regularFont,
        color: mutedColor,
    });

    page.drawText(`Generated: ${data.purchaseDate}`, {
        x: 50,
        y: 20,
        size: 8,
        font: regularFont,
        color: mutedColor,
    });

    // Save PDF and return as base64
    const pdfBytes = await pdfDoc.save();
    return Buffer.from(pdfBytes).toString('base64');
}
