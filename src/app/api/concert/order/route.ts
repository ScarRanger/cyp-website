import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/app/lib/supabase';
import { createQRPayload } from '@/app/lib/qr-signature';
import { scheduleTicketEmail, isQStashConfigured, cancelQStashMessage } from '@/app/lib/qstash';
import { sendTicketEmail, type TicketInfo } from '@/app/lib/email-service';
import { deleteReservation } from '@/app/lib/concert-redis';
import { orderRatelimit, getClientIP } from '@/app/lib/concert-ratelimit';
import type { TicketMetadata } from '@/app/types/concert';
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import QRCode from 'qrcode';

export async function POST(request: NextRequest) {
    try {
        const clientIP = getClientIP(request);

        // Rate limit check
        const rateLimitResult = await orderRatelimit.limit(clientIP);
        if (!rateLimitResult.success) {
            return NextResponse.json(
                {
                    error: 'Too many orders. Please wait before trying again.',
                    retryAfter: Math.ceil((rateLimitResult.reset - Date.now()) / 1000),
                },
                { status: 429 }
            );
        }

        const body = await request.json();
        const { checkoutIds, checkoutId, name, email, phone } = body;

        // Support both single checkoutId and array of checkoutIds
        const allCheckoutIds: string[] = checkoutIds || (checkoutId ? [checkoutId] : []);

        // Validate required fields
        if (allCheckoutIds.length === 0 || !name || !email || !phone) {
            return NextResponse.json(
                { error: 'Missing required fields (checkoutId(s), name, email, phone)' },
                { status: 400 }
            );
        }

        const supabase = createServerSupabaseClient();
        const orderId = `ORD-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        const purchaseDate = new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' });

        // Collect all tickets across all tiers for consolidated email
        const allTickets: { id: string; tier: string; status: string }[] = [];
        const ticketInfos: TicketInfo[] = [];
        let totalAmount = 0;
        let totalTicketCount = 0;

        // Process each checkout (each tier)
        for (const cid of allCheckoutIds) {
            // Get the pending order by checkout_id
            const { data: order, error: orderError } = await supabase
                .from('concert_orders')
                .select('*')
                .eq('checkout_id', cid)
                .single();

            if (orderError || !order) {
                console.error(`[Order] Order not found for checkout_id: ${cid}`);
                continue; // Skip if not found (shouldn't happen normally)
            }

            // Check if order is still pending
            if (order.status !== 'pending') {
                console.log(`[Order] Skipping order ${cid} with status: ${order.status}`);
                continue;
            }

            // Check if reservation hasn't expired
            if (order.expires_at && new Date(order.expires_at) < new Date()) {
                console.log(`[Order] Order ${cid} has expired`);
                continue;
            }

            const { tier, quantity } = order;

            // Get tier metadata (price) from Supabase
            const { data: tierData } = await supabase
                .from('concert_ticket_inventory')
                .select('price')
                .eq('tier', tier)
                .single();

            const price = tierData?.price || 0;
            totalAmount += price * quantity;
            totalTicketCount += quantity;

            // Create tickets for this tier
            for (let i = 0; i < quantity; i++) {
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

                // Insert ticket record with direct columns
                const { data: ticket, error: ticketError } = await supabase
                    .from('tickets')
                    .insert({
                        id: ticketId,
                        tier,
                        status: 'active',
                        name,
                        email,
                        phone,
                        payment_amount: price,
                        order_id: orderId,
                        qr_data: qrPayload,
                        metadata,
                    })
                    .select()
                    .single();

                if (ticketError) throw ticketError;

                allTickets.push({ id: ticket.id, tier: ticket.tier, status: ticket.status });

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
                        venue: 'Rumao World School, Giriz, Vasai',
                    },
                };

                // Generate PDF and get base64
                const pdfBase64 = await generateTicketPDF(ticketData);
                const fileName = `CYP-Concert-Ticket-${tier}-${ticketId.substring(0, 8)}.pdf`;

                ticketInfos.push({
                    ticketId,
                    tier,
                    qrPayload,
                    fileName,
                    pdfBase64,
                });
            }

            // Update inventory: atomic increment of sold count in Supabase
            // Use lowercase tier name to match inventory table
            const normalizedTier = tier.toLowerCase();
            const { data: newSoldCount, error: inventoryError } = await supabase
                .rpc('increment_sold_tickets', { tier_name: normalizedTier, count: quantity });

            if (inventoryError) {
                console.error(`[Order] Error updating inventory for ${normalizedTier}:`, inventoryError);
            } else {
                console.log(`[Order] Updated ${normalizedTier} sold_tickets to ${newSoldCount}`);
            }

            // Update order status to PAID
            await supabase
                .from('concert_orders')
                .update({
                    status: 'paid',
                    paid_at: new Date().toISOString(),
                    name,
                    email,
                    phone,
                    payment_amount: price * quantity,
                })
                .eq('checkout_id', cid);

            // Cancel the scheduled QStash rollback to prevent inventory desync
            if (order.qstash_message_id) {
                await cancelQStashMessage(order.qstash_message_id);
                console.log(`[Order] Cancelled rollback job for ${cid}`);
            }

            // Delete reservation from Redis
            await deleteReservation(cid);
        }

        // If no tickets were created, return error
        if (allTickets.length === 0) {
            return NextResponse.json(
                { error: 'No valid orders found. Your reservations may have expired.' },
                { status: 400 }
            );
        }

        // Send ONE consolidated email with ALL tickets
        let emailStatus = 'pending';

        if (isQStashConfigured()) {
            try {
                const result = await scheduleTicketEmail({
                    buyerEmail: email,
                    buyerName: name,
                    purchaseDate,
                    tickets: ticketInfos,
                });
                console.log(`[Order] Email scheduled via QStash, messageId: ${result.messageId}`);
                emailStatus = 'scheduled';
            } catch (qstashError) {
                console.error('[Order] QStash scheduling failed, falling back to direct send:', qstashError);
                await sendTicketEmail(email, name, purchaseDate, ticketInfos);
                emailStatus = 'sent';
            }
        } else {
            await sendTicketEmail(email, name, purchaseDate, ticketInfos);
            emailStatus = 'sent';
        }

        return NextResponse.json({
            success: true,
            message: `Successfully purchased ${totalTicketCount} ticket(s)! Check your email for the tickets.`,
            orderId,
            checkoutIds: allCheckoutIds,
            emailStatus,
            totalAmount,
            tickets: allTickets,
        });

    } catch (error) {
        console.error('[Order] Error processing order:', error);
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
    const pdfDoc = await PDFDocument.create();
    const page = pdfDoc.addPage([400, 600]);

    const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
    const regularFont = await pdfDoc.embedFont(StandardFonts.Helvetica);

    const primaryColor = rgb(0.91, 0.27, 0.38);
    const textColor = rgb(0.1, 0.1, 0.1);
    const mutedColor = rgb(0.4, 0.4, 0.4);

    const { width, height } = page.getSize();

    page.drawRectangle({
        x: 0,
        y: height - 100,
        width: width,
        height: 100,
        color: primaryColor,
    });

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

    const qrDataString = JSON.stringify(data.qrData);
    const qrCodeDataUrl = await QRCode.toDataURL(qrDataString, {
        width: 150,
        margin: 1,
        color: { dark: '#000000', light: '#ffffff' },
    });

    const qrCodeBase64 = qrCodeDataUrl.split(',')[1];
    const qrCodeBytes = Buffer.from(qrCodeBase64, 'base64');
    const qrImage = await pdfDoc.embedPng(qrCodeBytes);

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

    page.drawText(`Ticket ID: ${data.ticketId.substring(0, 8)}...`, {
        x: 130,
        y: qrY - 25,
        size: 9,
        font: regularFont,
        color: mutedColor,
    });

    page.drawLine({
        start: { x: 30, y: qrY - 45 },
        end: { x: width - 30, y: qrY - 45 },
        thickness: 1,
        color: rgb(0.85, 0.85, 0.85),
        dashArray: [5, 3],
    });

    const detailsY = qrY - 75;
    const labelX = 50;
    const textX = 100;

    page.drawText('Date:', { x: labelX, y: detailsY, size: 10, font: boldFont, color: mutedColor });
    page.drawText(data.eventDetails.date, { x: textX, y: detailsY, size: 11, font: regularFont, color: textColor });

    page.drawText('Time:', { x: labelX, y: detailsY - 22, size: 10, font: boldFont, color: mutedColor });
    page.drawText(data.eventDetails.time, { x: textX, y: detailsY - 22, size: 11, font: regularFont, color: textColor });

    page.drawText('Venue:', { x: labelX, y: detailsY - 44, size: 10, font: boldFont, color: mutedColor });
    page.drawText(data.eventDetails.venue, { x: textX, y: detailsY - 44, size: 11, font: regularFont, color: textColor });

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

    const pdfBytes = await pdfDoc.save();
    return Buffer.from(pdfBytes).toString('base64');
}
