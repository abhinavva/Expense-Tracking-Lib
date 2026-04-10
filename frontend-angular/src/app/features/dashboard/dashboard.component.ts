import { CommonModule } from '@angular/common';
import { Component, computed, OnInit, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';

import { Entry, EntrySummary, EntryType } from '../../core/models/entry.model';
import { AuthService } from '../../core/services/auth.service';
import { EntriesService } from '../../core/services/entries.service';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.scss'
})
export class DashboardComponent implements OnInit {
  readonly isAdmin = computed(() => this.authService.currentUser()?.role === 'administrator');

  readonly entries = signal<Entry[]>([]);
  readonly loading = signal(false);
  readonly submitting = signal(false);
  readonly exporting = signal(false);
  readonly error = signal('');

  readonly totalItems = signal(0);
  readonly currentPage = signal(1);
  readonly perPage = signal(15);

  readonly summary = signal<EntrySummary>({
    total_entries: 0,
    total_income: 0,
    total_expenditure: 0,
    net_balance: 0
  });

  readonly editEntry = signal<Entry | null>(null);
  readonly showEditDialog = signal(false);

  readonly accountHeads = [
    'Monthly Subscription',
    'Entrance Fees',
    'Security Deposit',
    'Life Membership',
    'Grant for Books',
    'Library Grant',
    'Librarian Allowance',
    'Festival Allowance',
    'Bank Interest',
    'Advance',
    'Newspaper/Periodicals',
    'Electricity Charge',
    'Meeting Fees',
    'Miscellaneous Exp',
    'Miscellaneous income',
    'Refreshment Exp.'
  ];

  readonly quickForm = this.fb.nonNullable.group({
    type: ['Income' as EntryType, Validators.required],
    date: [this.today(), Validators.required],
    voucher_number: [''],
    account_head: ['Meeting Fees', Validators.required],
    amount: [0, [Validators.required, Validators.min(0.01)]],
    description: ['']
  });

  readonly editForm = this.fb.nonNullable.group({
    type: ['Income' as EntryType, Validators.required],
    date: [this.today(), Validators.required],
    voucher_number: [''],
    account_head: ['', Validators.required],
    amount: [0, [Validators.required, Validators.min(0.01)]],
    description: ['']
  });

  constructor(
    private readonly fb: FormBuilder,
    private readonly entriesService: EntriesService,
    private readonly authService: AuthService
  ) {}

  ngOnInit(): void {
    this.loadEntries();
  }

  setQuickType(type: EntryType): void {
    this.quickForm.patchValue({ type });
  }

  loadEntries(page = this.currentPage()): void {
    this.loading.set(true);
    this.error.set('');

    this.entriesService
      .getEntriesTable({
        page,
        limit: this.perPage(),
        type: 'all'
      })
      .subscribe({
        next: (response) => {
          this.loading.set(false);
          if (response.status !== 'success') {
            this.error.set(response.message || 'Failed to load entries.');
            return;
          }

          this.entries.set(response.items ?? []);
          this.summary.set(response.summary ?? this.summary());
          this.totalItems.set(Number(response.total_items || 0));
          this.currentPage.set(Number(response.page || 1));
        },
        error: (err) => {
          this.loading.set(false);
          this.error.set(err.message || 'Failed to load entries.');
        }
      });
  }

  submitQuickEntry(): void {
    if (!this.isAdmin()) {
      this.error.set('Only administrators can add entries.');
      return;
    }

    if (this.quickForm.invalid) {
      this.quickForm.markAllAsTouched();
      return;
    }

    const payload = this.quickForm.getRawValue();
    this.submitting.set(true);
    this.error.set('');

    this.entriesService
      .addEntry({
        type: payload.type,
        date: payload.date,
        voucher_number: payload.voucher_number,
        account_head: payload.account_head,
        amount: payload.amount,
        description: payload.description
      })
      .subscribe({
        next: (response) => {
          this.submitting.set(false);
          if (response.status !== 'success') {
            this.error.set(response.message || 'Failed to add entry.');
            return;
          }

          this.quickForm.patchValue({
            date: this.today(),
            voucher_number: '',
            amount: 0,
            description: ''
          });
          this.loadEntries(1);
        },
        error: (err) => {
          this.submitting.set(false);
          this.error.set(err.message || 'Failed to add entry.');
        }
      });
  }

  openEdit(entry: Entry): void {
    if (!this.isAdmin()) {
      this.error.set('Only administrators can edit entries.');
      return;
    }

    this.editEntry.set(entry);
    this.editForm.patchValue({
      type: entry.type,
      date: entry.date,
      voucher_number: String(entry.voucher_number ?? ''),
      account_head: entry.account_head,
      amount: Number(entry.amount || 0),
      description: String(entry.description ?? '')
    });
    this.showEditDialog.set(true);
  }

  closeEdit(): void {
    this.showEditDialog.set(false);
    this.editEntry.set(null);
  }

  saveEdit(): void {
    if (!this.isAdmin()) {
      this.error.set('Only administrators can update entries.');
      return;
    }

    if (this.editForm.invalid || !this.editEntry()) {
      this.editForm.markAllAsTouched();
      return;
    }

    const target = this.editEntry();
    if (!target) {
      return;
    }

    const payload = this.editForm.getRawValue();
    this.submitting.set(true);

    this.entriesService
      .editEntry({
        id: target.id,
        type: payload.type,
        date: payload.date,
        voucher_number: payload.voucher_number,
        account_head: payload.account_head,
        amount: payload.amount,
        description: payload.description
      })
      .subscribe({
        next: (response) => {
          this.submitting.set(false);
          if (response.status !== 'success') {
            this.error.set(response.message || 'Failed to update entry.');
            return;
          }

          this.closeEdit();
          this.loadEntries(this.currentPage());
        },
        error: (err) => {
          this.submitting.set(false);
          this.error.set(err.message || 'Failed to update entry.');
        }
      });
  }

  deleteEntry(entry: Entry): void {
    if (!this.isAdmin()) {
      this.error.set('Only administrators can delete entries.');
      return;
    }

    if (!window.confirm('Delete this entry permanently?')) {
      return;
    }

    this.entriesService.deleteEntry(entry.id).subscribe({
      next: (response) => {
        if (response.status !== 'success') {
          this.error.set(response.message || 'Failed to delete entry.');
          return;
        }
        this.loadEntries(this.currentPage());
      },
      error: (err) => {
        this.error.set(err.message || 'Failed to delete entry.');
      }
    });
  }

  exportCsv(): void {
    const rows = this.entries();
    if (rows.length === 0) {
      this.error.set('No data to export.');
      return;
    }

    const sortedDates = rows
      .map((row) => row.date)
      .filter((date) => /^\d{4}-\d{2}-\d{2}$/.test(date))
      .sort();

    if (sortedDates.length === 0) {
      this.error.set('No valid dates to export.');
      return;
    }

    const fromDate = sortedDates[0];
    const toDate = sortedDates[sortedDates.length - 1];

    this.exporting.set(true);
    this.entriesService.exportEntries(fromDate, toDate).subscribe({
      next: (blob) => {
        this.exporting.set(false);
        this.downloadBlob(blob, `entries_${fromDate}_to_${toDate}.csv`);
      },
      error: (err) => {
        this.exporting.set(false);
        this.error.set(err.message || 'Failed to export CSV.');
      }
    });
  }

  nextPage(): void {
    if (this.currentPage() < this.totalPages()) {
      this.loadEntries(this.currentPage() + 1);
    }
  }

  prevPage(): void {
    if (this.currentPage() > 1) {
      this.loadEntries(this.currentPage() - 1);
    }
  }

  changePerPage(limit: number): void {
    this.perPage.set(limit);
    this.loadEntries(1);
  }

  totalPages(): number {
    return Math.max(1, Math.ceil(this.totalItems() / this.perPage()));
  }

  formatCurrency(value: number | string): string {
    const amount = Number(value || 0);
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(amount);
  }

  displayVoucher(value: string | null): string {
    const normalized = String(value ?? '').trim();
    return normalized || '-';
  }

  private today(): string {
    return new Date().toISOString().slice(0, 10);
  }

  private downloadBlob(blob: Blob, fileName: string): void {
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = fileName;
    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);
    URL.revokeObjectURL(url);
  }
}
