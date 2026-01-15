import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/app/lib/supabase';
import { verifyQRSignature, parseQRString } from '@/app/lib/qr-signature';

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { ticketId } = body;

        if (!ticketId) {
            return NextResponse.json(
                { error: 'Missing ticket ID' },
                { status: 400 }
            );
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
