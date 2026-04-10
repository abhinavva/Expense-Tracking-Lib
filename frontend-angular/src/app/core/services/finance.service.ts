import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';

import { ApiService } from './api.service';

export interface FinanceInsightsResponse {
  status: 'success' | 'error';
  selected_month: string;
  selected_fy_start: number;
  fy_options: number[];
  monthly_income: Record<string, number>;
  monthly_expense: Record<string, number>;
  fy_income: Record<string, number>;
  fy_expense: Record<string, number>;
  message?: string;
}

@Injectable({ providedIn: 'root' })
export class FinanceService {
  constructor(private readonly api: ApiService) {}

  getInsights(month: string, fyStart?: number): Observable<FinanceInsightsResponse> {
    return this.api.get<FinanceInsightsResponse>('finance_insights.php', {
      month,
      fy_start: fyStart ?? ''
    });
  }
}
