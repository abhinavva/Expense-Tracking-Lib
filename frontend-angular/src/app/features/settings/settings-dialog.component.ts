import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Component, computed, EventEmitter, OnInit, Output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';

import { FormFieldConfig, SettingsService } from '../../core/services/settings.service';

@Component({
  selector: 'app-settings-dialog',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './settings-dialog.component.html',
  styleUrl: './settings-dialog.component.scss'
})
export class SettingsDialogComponent implements OnInit {
  @Output() closed = new EventEmitter<void>();

  readonly loading = signal(true);
  readonly saving = signal(false);
  readonly error = signal('');
  readonly success = signal('');

  readonly currency = signal('USD');
  readonly currencyMode = signal<'symbol_only' | 'convert'>('symbol_only');
  readonly accountHeads = signal<string[]>([]);
  readonly formFields = signal<FormFieldConfig[]>([]);
  readonly newHeader = signal('');
  readonly newFieldLabel = signal('');
  readonly newFieldType = signal('textbox');
  readonly previewRate = signal<number | null>(null);
  readonly rateLoading = signal(false);

  readonly currencyOptions = ['USD', 'EUR', 'INR', 'GBP', 'JPY'];
  readonly currencyLabels: Record<string, string> = {
    USD: 'USD - United States Dollar',
    EUR: 'EUR - Euro',
    INR: 'INR - Indian Rupee',
    GBP: 'GBP - British Pound Sterling',
    JPY: 'JPY - Japanese Yen'
  };

  readonly fieldTypeOptions = ['textbox', 'dropdown', 'date', 'checkbox'];

  readonly visibleFields = computed(() => this.formFields().filter((f) => f.visible));
  readonly hiddenFields = computed(() => this.formFields().filter((f) => !f.visible));

  constructor(
    private readonly settingsService: SettingsService,
    private readonly http: HttpClient
  ) {}

  ngOnInit(): void {
    this.settingsService.load().subscribe({
      next: (res) => {
        this.loading.set(false);
        if (res.status === 'success') {
          this.currency.set(res.currency);
          this.currencyMode.set(res.currency_mode || 'symbol_only');
          this.accountHeads.set([...res.account_heads]);
          this.formFields.set(res.form_fields.map((f) => ({ ...f })));
          if (res.currency !== 'USD') {
            this.loadPreviewRate(res.currency);
          }
        } else {
          this.error.set(res.message || 'Failed to load settings.');
        }
      },
      error: (err) => {
        this.loading.set(false);
        this.error.set(err.message || 'Failed to load settings.');
      }
    });
  }

  close(): void {
    this.closed.emit();
  }

  onBackdropClick(event: MouseEvent): void {
    if ((event.target as HTMLElement).classList.contains('settings-backdrop')) {
      this.close();
    }
  }

  // Currency
  onCurrencyChange(cur: string): void {
    this.currency.set(cur);
    this.previewRate.set(null);
    if (cur !== 'USD') {
      this.loadPreviewRate(cur);
    }
  }

  loadPreviewRate(target: string): void {
    const key = target.toLowerCase();
    this.rateLoading.set(true);
    this.http
      .get<Record<string, Record<string, number>>>(
        'https://latest.currency-api.pages.dev/v1/currencies/usd.json'
      )
      .subscribe({
        next: (data) => {
          this.rateLoading.set(false);
          if (data?.['usd']?.[key]) {
            this.previewRate.set(data['usd'][key]);
          }
        },
        error: () => {
          this.rateLoading.set(false);
        }
      });
  }

  // Account Heads
  addHeader(): void {
    const name = this.newHeader().trim();
    if (!name) return;
    const heads = [...this.accountHeads()];
    if (heads.includes(name)) {
      this.error.set(`"${name}" already exists.`);
      return;
    }
    heads.push(name);
    this.accountHeads.set(heads);
    this.newHeader.set('');
    this.error.set('');
  }

  removeHeader(index: number): void {
    const heads = [...this.accountHeads()];
    heads.splice(index, 1);
    this.accountHeads.set(heads);
  }

  // Form Fields
  toggleFieldVisibility(index: number): void {
    const fields = this.formFields().map((f) => ({ ...f }));
    fields[index].visible = !fields[index].visible;
    this.formFields.set(fields);
  }

  removeField(index: number): void {
    const fields = [...this.formFields()];
    if (fields[index].system) return;
    fields.splice(index, 1);
    this.formFields.set(fields);
  }

  addField(): void {
    const label = this.newFieldLabel().trim();
    if (!label) return;
    const key = label.toLowerCase().replace(/[^a-z0-9]+/g, '_');
    const fields = [...this.formFields()];
    if (fields.some((f) => f.key === key)) {
      this.error.set(`Field "${label}" already exists.`);
      return;
    }
    fields.push({
      key,
      label,
      type: this.newFieldType(),
      visible: true,
      system: false
    });
    this.formFields.set(fields);
    this.newFieldLabel.set('');
    this.newFieldType.set('textbox');
    this.error.set('');
  }

  // Save
  saveSettings(): void {
    this.saving.set(true);
    this.error.set('');
    this.success.set('');

    this.settingsService
      .save({
        currency: this.currency(),
        currency_mode: this.currencyMode(),
        account_heads: this.accountHeads(),
        form_fields: this.formFields()
      })
      .subscribe({
        next: (res) => {
          this.saving.set(false);
          if (res.status === 'success') {
            this.success.set('Settings saved successfully.');
          } else {
            this.error.set(res.message || 'Failed to save settings.');
          }
        },
        error: (err) => {
          this.saving.set(false);
          this.error.set(err.message || 'Failed to save settings.');
        }
      });
  }
}
