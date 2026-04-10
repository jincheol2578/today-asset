export type Role = 'guest' | 'user' | 'admin';
export type UserStatus = 'pending' | 'approved' | 'rejected';

export interface Profile {
  id: string;
  email: string;
  role: Role;
  status: UserStatus;
  created_at: string;
  updated_at: string;
}

export interface Analysis {
  id: string;
  date: string;
  content: string;
  created_at: string;
}

export interface StockResult {
  ticker: string;
  name: string;
  stockData: Record<string, unknown>;
  analysis: string;
  analyzedAt: string;
}

export interface WatchlistItem {
  ticker: string;
  added_at: string;
}

export interface FeaturePermission {
  feature_key: string;
  min_role: Role;
  label_ko: string;
  updated_at: string;
}
