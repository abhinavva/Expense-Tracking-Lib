import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';

import { EntryTableResponse, EntryType } from '../models/entry.model';
import { ApiService } from './api.service';

interface SimpleResponse {
  status: 'success' | 'error';
  message?: string;
}

export interface EntryFilters {
  page?: number;
  limit?: number;
  search?: string;
  type?: 'all' | 'income' | 'expenditure';
  account_head?: string;
  from_date?: string;
  to_date?: string;
}

export interface EntryPayload {
  id?: number;
  type: EntryType;
  date: string;
  voucher_number?: string;
  account_head: string;
  description?: string;
  amount: number | string;
}

@Injectable({ providedIn: 'root' })
export class EntriesService {
  constructor(private readonly api: ApiService) {}

  getEntriesTable(filters: EntryFilters): Observable<EntryTableResponse> {
    return this.api.get<EntryTableResponse>('fetch_entries.php', {
      mode: 'table',
      page: filters.page ?? 1,
      limit: filters.limit ?? 15,
      search: filters.search ?? '',
      type: filters.type ?? 'all',
      account_head: filters.account_head ?? '',
      from_date: filters.from_date ?? '',
      to_date: filters.to_date ?? ''
    });
  }

  addEntry(payload: EntryPayload): Observable<SimpleResponse> {
    const formData = new FormData();
    formData.append('type', payload.type);
    formData.append('date', payload.date);
    formData.append('voucher_number', (payload.voucher_number ?? '').trim());
    formData.append('account_head', payload.account_head.trim());
    formData.append('description', (payload.description ?? '').trim());
    formData.append('amount', String(payload.amount));
    return this.api.postForm<SimpleResponse>('insert.php', formData);
  }

  editEntry(payload: EntryPayload & { id: number }): Observable<SimpleResponse> {
    const formData = new FormData();
    formData.append('id', String(payload.id));
    formData.append('type', payload.type);
    formData.append('date', payload.date);
    formData.append('voucher_number', (payload.voucher_number ?? '').trim());
    formData.append('account_head', payload.account_head.trim());
    formData.append('description', (payload.description ?? '').trim());
    formData.append('amount', String(payload.amount));
    return this.api.postForm<SimpleResponse>('edit_entry.php', formData);
  }

  deleteEntry(id: number): Observable<SimpleResponse> {
    const formData = new FormData();
    formData.append('id', String(id));
    return this.api.postForm<SimpleResponse>('delete_entry.php', formData);
  }

  exportEntries(fromDate: string, toDate: string): Observable<Blob> {
    const formData = new FormData();
    formData.append('from_date', fromDate);
    formData.append('to_date', toDate);
    return this.api.postBlob('export_entries.php', formData);
  }
}
