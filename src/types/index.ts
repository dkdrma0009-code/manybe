export interface User {
  id: string;
  email: string;
  full_name?: string;
  avatar_url?: string;
  created_at: string;
}

export interface Revenue {
  id: string;
  user_id: string;
  amount: number;
  description: string;
  category: string;
  date: string;
  created_at: string;
}

export interface Deal {
  id: string;
  user_id: string;
  title: string;
  brand: string;
  amount: number;
  status: 'pending' | 'in_progress' | 'completed' | 'cancelled';
  start_date?: string;
  end_date?: string;
  created_at: string;
}

export interface DealContact {
  id: string;
  deal_id: string;
  name: string;
  email?: string;
  phone?: string;
  role?: string;
}

export interface Schedule {
  id: string;
  user_id: string;
  title: string;
  description?: string;
  start_time: string;
  end_time?: string;
  type: 'meeting' | 'content' | 'deadline' | 'other';
}

export interface TaxRecord {
  id: string;
  user_id: string;
  year: number;
  quarter?: number;
  income: number;
  deduction: number;
  tax_amount: number;
  status: 'pending' | 'filed';
}

export interface Subscription {
  id: string;
  user_id: string;
  plan: 'free' | 'basic' | 'pro';
  status: 'active' | 'cancelled' | 'expired';
  started_at: string;
  expires_at?: string;
}
