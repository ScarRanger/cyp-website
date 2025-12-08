export type LotteryTicket = {
  ticketNumber: number;
  status: 'available' | 'soft-locked' | 'sold';
  sessionId?: string;
  lockedAt?: Date;
  orderId?: string;
};

export type LotteryOrder = {
  id: string;
  ticketNumber: number;
  name: string;
  phone: string;
  email: string;
  parish: string;
  transactionId: string;
  amount: number;
  status: 'pending' | 'confirmed' | 'declined';
  createdAt: Date;
  confirmedAt?: Date;
};
