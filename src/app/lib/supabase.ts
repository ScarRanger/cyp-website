import { createClient } from '@supabase/supabase-js';

// Initialize Supabase client for server-side use
export function createServerSupabaseClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

  if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error('Missing Supabase environment variables');
  }

  return createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });
}

// Initialize Supabase client for client-side use
export function createClientSupabaseClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error('Missing Supabase environment variables');
  }

  return createClient(supabaseUrl, supabaseAnonKey);
}

// Types for lottery tables
export interface LotteryTicket {
  ticket_number: number;
  status: 'available' | 'soft-locked' | 'sold';
  session_id: string | null;
  client_ip: string | null;
  locked_at: string | null;
  order_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface LotteryOrder {
  id: string;
  ticket_number: number;
  name: string;
  phone: string;
  email: string;
  parish: string;
  transaction_id: string;
  amount: number;
  status: 'pending' | 'confirmed' | 'declined';
  session_id: string;
  created_at: string;
  confirmed_at: string | null;
  declined_at: string | null;
}
