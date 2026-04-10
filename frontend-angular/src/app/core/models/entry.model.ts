export type EntryType = 'Income' | 'Expenditure';

export interface Entry {
  id: number;
  type: EntryType;
  date: string;
  voucher_number: string | null;
  account_head: string;
  description: string | null;
  amount: number | string;
  created_at?: string;
  updated_at?: string;
}

export interface EntrySummary {
  total_entries: number;
  total_income: number;
  total_expenditure: number;
  net_balance: number;
}

export interface EntryTableResponse {
  status: 'success' | 'error';
  items: Entry[];
  total_items: number;
  page: number;
  per_page: number;
  summary: EntrySummary;
  message?: string;
}
