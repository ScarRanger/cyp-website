// Concert Ticketing System Types

export interface ConcertTier {
    id: string;
    tier: string;
    total_tickets: number;
    sold_tickets: number;
    soft_locked: number;
    price: number;
    description: string | null;
    created_at: string;
    updated_at: string;
}

export interface ConcertSoftLock {
    id: string;
    tier: string;
    quantity: number;
    session_id: string;
    client_ip: string | null;
    locked_at: string;
    expires_at: string;
}

export interface ConcertTicket {
    id: string;
    user_id: string | null;
    tier: string;
    status: 'active' | 'used' | 'void';
    metadata: TicketMetadata | null;
    created_at: string;
    scanned_at: string | null;
}

export interface TicketMetadata {
    buyer_name: string;
    buyer_email: string;
    buyer_phone: string;
    order_id: string;
    qr_data: QRPayload;
    purchase_date: string;
}

export interface QRPayload {
    id: string;
    name: string;
    tier: string;
    nonce: string;
    signature: string;
}

export interface TierAvailability {
    tier: string;
    price: number;
    description: string | null;
    total: number;
    available: number;
    sold: number;
}

export interface OrderRequest {
    tier: string;
    quantity: number;
    sessionId: string;
    name: string;
    email: string;
    phone: string;
}

export interface OrderResponse {
    success: boolean;
    orderId?: string;
    tickets?: ConcertTicket[];
    message?: string;
    error?: string;
}
