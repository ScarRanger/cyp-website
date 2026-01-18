import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/app/lib/supabase';
import { verifyQRSignature, parseQRString } from '@/app/lib/qr-signature';

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { ticketId, qrData } = body;

        // 1. Validate Input
        if (!ticketId) {
            return NextResponse.json(
                { error: 'Missing ticket ID' },
                { status: 400 }
            );
        }

        // 2. STAGE 2: STRICT SECURITY CHECK
        // If qrData is provided (which the updated frontend does), VERIFY THE SIGNATURE
        if (qrData) {
            let payload;
            try {
                payload = typeof qrData === 'string' ? parseQRString(qrData) : qrData;
            } catch (e) {
                return NextResponse.json({ error: 'Invalid QR format' }, { status: 400 });
            }

            if (!payload || !verifyQRSignature(payload)) {
                console.warn(`[Security] Invalid signature for ticket ${ticketId}`);
                return NextResponse.json(
                    { error: 'SECURITY ALERT: Invalid Ticket Signature. This ticket may be fake.' },
                    { status: 401 }
                );
            }

            // Ensure the ID in the signed payload matches the requested ID
            if (payload.id !== ticketId) {
                return NextResponse.json(
                    { error: 'ID mismatch' },
                    { status: 400 }
                );
            }
        } else {
            // Optional: You could reject requests without qrData entirely for maximum security
            // For now, we allow it but log a warning (or you could uncomment the error below)
            console.warn(`[Security] Ticket ${ticketId} scanned without signature verification!`);

            // UNCOMMENT TO ENFORCE SIGNATURES GLOBALLY:
            // return NextResponse.json(
            //     { error: 'Missing security signature. Please update the scanner.' },
            //     { status: 400 }
            // );
        }

        const supabase = createServerSupabaseClient();

        // Get ticket from database
        const { data: ticket, error: ticketError } = await supabase
            .from('tickets')
            .select('*')
            .eq('id', ticketId)
            .single();

        if (ticketError || !ticket) {
            return NextResponse.json(
                { success: false, error: 'Ticket not found' },
                { status: 404 }
            );
        }

        // Check if already scanned
        if (ticket.status === 'used' || ticket.scanned_at) {
            return NextResponse.json({
                success: false,
                error: 'Ticket already scanned!',
                alreadyScanned: true,
                scannedAt: ticket.scanned_at,
            });
        }

        // Mark as scanned
        const { error: updateError } = await supabase
            .from('tickets')
            .update({
                status: 'used',
                scanned_at: new Date().toISOString(),
            })
            .eq('id', ticketId);

        if (updateError) {
            throw updateError;
        }

        return NextResponse.json({
            success: true,
            message: 'Ticket marked as scanned!',
            ticket: {
                id: ticket.id,
                tier: ticket.tier,
                buyerName: ticket.metadata?.buyer_name,
            },
        });

    } catch (error) {
        console.error('Error scanning ticket:', error);
        return NextResponse.json(
            { error: 'Failed to scan ticket' },
            { status: 500 }
        );
    }
}
