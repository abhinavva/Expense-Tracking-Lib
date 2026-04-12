import { HttpClient } from '@angular/common/http';
import { Injectable, signal, computed } from '@angular/core';
import { Observable, tap, catchError, of } from 'rxjs';

import { ApiService } from './api.service';

export interface FormFieldConfig {
  key: string;
  label: string;
  type: string;
  visible: boolean;
  system: boolean;
}

export interface AppSettingsResponse {
  status: 'success' | 'error';
  currency: string;
  currency_mode: 'symbol_only' | 'convert';
  account_heads: string[];
  form_fields: FormFieldConfig[];
  message?: string;
}

const LOCALE_MAP: Record<string, string> = {
  USD: 'en-US',
  EUR: 'de-DE',
  INR: 'en-IN',
  GBP: 'en-GB',
  JPY: 'ja-JP'
};

@Injectable({ providedIn: 'root' })
export class SettingsService {
  readonly currency = signal('USD');
  readonly currencyMode = signal<'symbol_only' | 'convert'>('symbol_only');
  readonly accountHeads = signal<string[]>([]);
  readonly formFields = signal<FormFieldConfig[]>([]);
  readonly loaded = signal(false);

  /** Exchange rate: 1 USD = ? target currency */
  readonly exchangeRate = signal(1);
  readonly ratesLoading = signal(false);
  readonly baseCurrency = signal('USD');

  private ratesCache: Record<string, number> = {};

  constructor(
    private readonly api: ApiService,
    private readonly http: HttpClient
  ) {}

  load(): Observable<AppSettingsResponse> {
    return this.api.get<AppSettingsResponse>('app_settings.php').pipe(
      tap((res) => {
        if (res.status === 'success') {
          const prev = this.currency();
          this.currency.set(res.currency);
          this.currencyMode.set(res.currency_mode || 'symbol_only');
          this.accountHeads.set(res.account_heads);
          this.formFields.set(res.form_fields);
          this.loaded.set(true);

          if (res.currency_mode === 'convert' && res.currency !== 'USD') {
            this.fetchRate(res.currency);
          } else {
            this.exchangeRate.set(1);
          }
        }
      })
    );
  }

  save(payload: {
    currency?: string;
    currency_mode?: 'symbol_only' | 'convert';
    account_heads?: string[];
    form_fields?: FormFieldConfig[];
  }): Observable<AppSettingsResponse> {
    return this.api.postJson<AppSettingsResponse>('app_settings.php', payload).pipe(
      tap((res) => {
        if (res.status === 'success') {
          this.currency.set(res.currency);
          this.currencyMode.set(res.currency_mode || 'symbol_only');
          this.accountHeads.set(res.account_heads);
          this.formFields.set(res.form_fields);

          if (res.currency_mode === 'convert' && res.currency !== 'USD') {
            this.fetchRate(res.currency);
          } else {
            this.exchangeRate.set(1);
          }
        }
      })
    );
  }

  /** Fetch live exchange rate from free API */
  fetchRate(target: string): void {
    const key = target.toLowerCase();
    if (this.ratesCache[key]) {
      this.exchangeRate.set(this.ratesCache[key]);
      return;
    }

    this.ratesLoading.set(true);
    this.http
      .get<Record<string, Record<string, number>>>(
        `https://latest.currency-api.pages.dev/v1/currencies/usd.json`
      )
      .pipe(
        catchError(() =>
          this.http.get<Record<string, Record<string, number>>>(
            `https://cdn.jsdelivr.net/npm/@fawazahmed0/currency-api@latest/v1/currencies/usd.json`
          )
        ),
        catchError(() => of(null))
      )
      .subscribe((data) => {
        this.ratesLoading.set(false);
        if (data && data['usd'] && data['usd'][key]) {
          const rate = data['usd'][key];
          this.ratesCache[key] = rate;
          this.exchangeRate.set(rate);
        }
      });
  }

  /**
   * Central currency formatter used by all components.
   * - symbol_only mode: displays the value as-is with the target currency symbol
   * - convert mode: multiplies the value by the exchange rate
   */
  formatCurrency(value: number | string): string {
    let amount = Number(value || 0);
    const cur = this.currency();
    const mode = this.currencyMode();

    if (mode === 'convert' && cur !== 'USD') {
      amount = amount * this.exchangeRate();
    }

    const locale = LOCALE_MAP[cur] || 'en-US';
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency: cur,
      minimumFractionDigits: cur === 'JPY' ? 0 : 2,
      maximumFractionDigits: cur === 'JPY' ? 0 : 2
    }).format(amount);
  }
}
