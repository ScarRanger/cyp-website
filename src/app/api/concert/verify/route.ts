import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/app/lib/supabase';
import { verifyQRSignature, parseQRString } from '@/app/lib/qr-signature';

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { qrData } = body;

        if (!qrData) {
            return NextResponse.json(
                { error: 'Missing QR data' },
                { status: 400 }
            );
        }

        // Parse QR data
        let payload;
        if (typeof qrData === 'string') {
            payload = parseQRString(qrData);
        } else {
            payload = qrData;
        }

        if (!payload) {
            return NextResponse.json(
                { valid: false, error: 'Invalid QR code format' },
                { status: 400 }
            );
        }

        // Verify signature
        const isValidSignature = verifyQRSignature(payload);
        if (!isValidSignature) {
            return NextResponse.json(
                { valid: false, error: 'Invalid ticket signature - possible forgery!' },
                { status: 400 }
            );
        }

        const supabase = createServerSupabaseClient();

        // Get ticket from database
        const { data: ticket, error: ticketError } = await supabase
            .from('tickets')
            .select('*')
            .eq('id', payload.id)
            .single();

        if (ticketError || !ticket) {
            return NextResponse.json(
                { valid: false, error: 'Ticket not found in database' },
                { status: 404 }
            );
        }

        // Check ticket status
        if (ticket.status === 'void') {
            return NextResponse.json({
                valid: false,
                error: 'This ticket has been voided',
                ticket: {
                    id: ticket.id,
                    tier: ticket.tier,
                    status: ticket.status,
                },
            });
        }

        if (ticket.status === 'used' || ticket.scanned_at) {
            return NextResponse.json({
                valid: false,
                error: 'This ticket has already been scanned!',
                alreadyScanned: true,
                scannedAt: ticket.scanned_at,
                ticket: {
                    id: ticket.id,
                    tier: ticket.tier,
                    status: ticket.status,
                    buyerName: ticket.metadata?.buyer_name,
                    scannedAt: ticket.scanned_at,
                },
            });
        }

        // Return ticket details for verification (don't mark as scanned yet)
        return NextResponse.json({
            valid: true,
            message: 'Ticket is valid!',
            ticket: {
                id: ticket.id,
                tier: ticket.tier,
                status: ticket.status,
                buyerName: ticket.metadata?.buyer_name,
                buyerEmail: ticket.metadata?.buyer_email,
                buyerPhone: ticket.metadata?.buyer_phone,
                orderId: ticket.metadata?.order_id,
                purchaseDate: ticket.metadata?.purchase_date,
            },
        });

    } catch (error) {
        console.error('Error verifying ticket:', error);
        return NextResponse.json(
            { error: 'Failed to verify ticket' },
            { status: 500 }
        );
    }
}
