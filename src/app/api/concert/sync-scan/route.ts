import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/app/lib/supabase';
import { verifyQRSignature, parseQRString } from '@/app/lib/qr-signature';

/**
 * Sync endpoint for offline scans
 * Called when device comes back online to sync local scans
 * Returns conflict status if ticket was already scanned by another device
 */
export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { ticketId, scannedAt, deviceId, qrData } = body;

        if (!ticketId || !scannedAt || !deviceId) {
            return NextResponse.json(
                { error: 'Missing required fields' },
                { status: 400 }
            );
        }

        // Verify signature if qrData provided
        if (qrData) {
            const payload = typeof qrData === 'string' ? parseQRString(qrData) : qrData;
            if (!payload || !verifyQRSignature(payload)) {
                return NextResponse.json(
                    { error: 'Invalid signature' },
                    { status: 401 }
                );
            }
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
                { error: 'Ticket not found' },
                { status: 404 }
            );
        }

        // Check if already scanned
        if (ticket.status === 'used' || ticket.scanned_at) {
            // Ticket was already scanned - check if it's a conflict
            const existingScannedAt = new Date(ticket.scanned_at).getTime();
            const newScannedAt = new Date(scannedAt).getTime();
            const existingDeviceId = ticket.metadata?.scanned_by_device;

            // If scanned by different device, it's a conflict
            if (existingDeviceId && existingDeviceId !== deviceId) {
                return NextResponse.json({
                    success: true,
                    conflict: true,
                    message: 'Ticket was already scanned by another device',
                    originalScan: {
                        scannedAt: ticket.scanned_at,
                        deviceId: existingDeviceId,
                    },
                });
            }

            // Same device re-syncing (not a conflict)
            return NextResponse.json({
                success: true,
                conflict: false,
                message: 'Already synced',
            });
        }

        // Mark as scanned
        const { error: updateError } = await supabase
            .from('tickets')
            .update({
                status: 'used',
                scanned_at: scannedAt,
                metadata: {
                    ...ticket.metadata,
                    scanned_by_device: deviceId,
                },
            })
            .eq('id', ticketId);

        if (updateError) {
            throw updateError;
        }

        return NextResponse.json({
            success: true,
            conflict: false,
            message: 'Scan synced successfully',
        });

    } catch (error) {
        console.error('Error syncing scan:', error);
        return NextResponse.json(
            { error: 'Failed to sync scan' },
            { status: 500 }
        );
    }
}
