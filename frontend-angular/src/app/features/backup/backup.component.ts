import { CommonModule } from '@angular/common';
import { Component, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { firstValueFrom } from 'rxjs';

import { BackupService } from '../../core/services/backup.service';

interface OperationLog {
  protocol: string;
  source: string;
  timestamp: string;
  payload: string;
  status: 'VERIFIED' | 'ARCHIVED' | 'FAILED';
}

interface ImportEntry {
  type: 'Income' | 'Expenditure';
  date: string;
  voucher_number: string;
  account_head: string;
  description: string;
  amount: string;
}

@Component({
  selector: 'app-backup',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './backup.component.html',
  styleUrl: './backup.component.scss'
})
export class BackupComponent {
  readonly loading = signal(false);
  readonly error = signal('');
  readonly status = signal('Ready.');

  readonly backupPath = signal('C:/fin_backup');
  readonly selectAll = signal(true);
  readonly fromDate = signal('');
  readonly toDate = signal('');

  readonly selectedFile = signal<File | null>(null);
  readonly detectedColumns = signal<string[]>([]);
  readonly importRows = signal<ImportEntry[]>([]);

  readonly operationLogs = signal<OperationLog[]>([
    {
      protocol: 'Automated Backup',
      source: 'Cloud Repository Alpha',
      timestamp: '24 May 2024, 04:00 AM',
      payload: '842.1 MB',
      status: 'VERIFIED'
    },
    {
      protocol: 'Bulk Import',
      source: 'q1_reconciliation_final.csv',
      timestamp: '22 May 2024, 11:14 AM',
      payload: '2.4 MB',
      status: 'VERIFIED'
    },
    {
      protocol: 'Tally Export',
      source: 'Financial_Year_End_2023',
      timestamp: '19 May 2024, 02:45 PM',
      payload: '15.8 MB',
      status: 'ARCHIVED'
    }
  ]);

  constructor(private readonly backupService: BackupService) {
    this.loadBackupPath();
  }

  async loadBackupPath(): Promise<void> {
    this.loading.set(true);
    this.error.set('');
    try {
      const response = await firstValueFrom(this.backupService.getBackupPathSettings());
      if (response.status !== 'success') {
        this.error.set(response.message || 'Failed to load backup path.');
        return;
      }
      this.backupPath.set(response.backup_root || 'C:/fin_backup');
      this.status.set(response.message || 'Backup path loaded.');
    } catch (error) {
      this.error.set((error as Error).message || 'Failed to load backup path.');
    } finally {
      this.loading.set(false);
    }
  }

  async saveBackupPath(): Promise<void> {
    this.loading.set(true);
    this.error.set('');
    try {
      const response = await firstValueFrom(this.backupService.saveBackupPath(this.backupPath()));
      if (response.status !== 'success') {
        this.error.set(response.message || 'Failed to save backup path.');
        return;
      }
      this.backupPath.set(response.backup_root || this.backupPath());
      this.status.set(`Backup path saved: ${this.backupPath()}`);
      this.pushLog('Path Update', this.backupPath(), '0.2 KB', 'VERIFIED');
    } catch (error) {
      this.error.set((error as Error).message || 'Failed to save backup path.');
    } finally {
      this.loading.set(false);
    }
  }

  async runBackup(deleteAfterBackup = false): Promise<void> {
    this.error.set('');
    if (!this.selectAll() && (!this.fromDate() || !this.toDate())) {
      this.error.set('Please choose both date range values, or enable Select all data.');
      return;
    }

    this.loading.set(true);
    try {
      const response = await firstValueFrom(
        this.backupService.createBackup({
          delete_after_backup: deleteAfterBackup,
          from_date: this.selectAll() ? '' : this.fromDate(),
          to_date: this.selectAll() ? '' : this.toDate(),
          select_all: this.selectAll()
        })
      );

      if (response.status !== 'success') {
        this.error.set(response.message || 'Backup failed.');
        return;
      }

      const payloadSize = `${response.entries_count || 0} entries`;
      this.status.set(`Backup complete: ${response.backup_path || response.backup_folder || 'Success'}`);
      this.pushLog('Automated Backup', response.backup_path || 'Server path', payloadSize, 'VERIFIED');
    } catch (error) {
      this.error.set((error as Error).message || 'Backup failed.');
      this.pushLog('Automated Backup', 'Backup endpoint', '0 KB', 'FAILED');
    } finally {
      this.loading.set(false);
    }
  }

  async exportTally(): Promise<void> {
    this.error.set('');
    if (!this.selectAll() && (!this.fromDate() || !this.toDate())) {
      this.error.set('Please choose both date range values, or enable Select all data.');
      return;
    }

    this.loading.set(true);
    try {
      const blob = await firstValueFrom(
        this.backupService.exportTally({
          from_date: this.selectAll() ? '' : this.fromDate(),
          to_date: this.selectAll() ? '' : this.toDate()
        })
      );
      const fileName = `tally_export_${new Date().toISOString().slice(0, 10)}.xml`;
      this.backupService.saveBlob(blob, fileName);
      this.status.set(`Tally XML downloaded: ${fileName}`);
      this.pushLog('Tally Export', fileName, `${Math.max(1, Math.round(blob.size / 1024))} KB`, 'ARCHIVED');
    } catch (error) {
      this.error.set((error as Error).message || 'Tally export failed.');
      this.pushLog('Tally Export', 'Export endpoint', '0 KB', 'FAILED');
    } finally {
      this.loading.set(false);
    }
  }

  async onFileSelected(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0] ?? null;
    this.selectedFile.set(file);
    this.importRows.set([]);
    this.detectedColumns.set([]);

    if (!file) {
      return;
    }

    try {
      const rows = await this.readRows(file);
      this.importRows.set(rows);

      if (rows.length > 0) {
        this.detectedColumns.set(Object.keys(rows[0]));
      }

      this.status.set(`Loaded ${rows.length} rows from ${file.name}`);
    } catch (error) {
      this.error.set((error as Error).message || 'Could not parse file.');
    }
  }

  async importData(): Promise<void> {
    const rows = this.importRows();
    if (rows.length === 0) {
      this.error.set('No rows loaded for import.');
      return;
    }

    this.loading.set(true);
    this.error.set('');

    try {
      const response = await firstValueFrom(this.backupService.importEntries(rows as unknown as Record<string, unknown>[]));  
      if (response.status !== 'success') {
        this.error.set(response.message || 'Import failed.');
        return;
      }

      const stats = response.stats;
      this.status.set(
        `Import completed. Inserted: ${stats?.inserted ?? 0}, Duplicates: ${stats?.duplicates ?? 0}, Invalid: ${stats?.invalid ?? 0}`
      );
      this.pushLog('Bulk Import', this.selectedFile()?.name || 'Import file', `${rows.length} rows`, 'VERIFIED');
    } catch (error) {
      this.error.set((error as Error).message || 'Import failed.');
      this.pushLog('Bulk Import', this.selectedFile()?.name || 'Import file', '0 KB', 'FAILED');
    } finally {
      this.loading.set(false);
    }
  }

  async downloadBackup(): Promise<void> {
    this.error.set('');
    if (!this.selectAll() && (!this.fromDate() || !this.toDate())) {
      this.error.set('Please choose both date range values, or enable Select all data.');
      return;
    }

    this.loading.set(true);
    try {
      const blob = await firstValueFrom(
        this.backupService.downloadBackup({
          delete_after_backup: false,
          from_date: this.selectAll() ? '' : this.fromDate(),
          to_date: this.selectAll() ? '' : this.toDate()
        })
      );

      const filename = `backup_${new Date().toISOString().slice(0, 10)}.zip`;
      this.backupService.saveBlob(blob, filename);
      this.status.set(`Backup archive downloaded: ${filename}`);
      this.pushLog('Backup Archive', filename, `${Math.max(1, Math.round(blob.size / 1024))} KB`, 'ARCHIVED');
    } catch (error) {
      this.error.set((error as Error).message || 'Download backup failed.');
    } finally {
      this.loading.set(false);
    }
  }

  private pushLog(protocol: string, source: string, payload: string, status: OperationLog['status']): void {
    const timestamp = new Date().toLocaleString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });

    this.operationLogs.set([
      {
        protocol,
        source,
        payload,
        status,
        timestamp
      },
      ...this.operationLogs().slice(0, 11)
    ]);
  }

  private async readRows(file: File): Promise<ImportEntry[]> {
    const lowerName = file.name.toLowerCase();

    if (lowerName.endsWith('.csv')) {
      const text = await file.text();
      return this.parseCsv(text);
    }

    if (lowerName.endsWith('.xlsx') || lowerName.endsWith('.xls')) {
      const xlsx = await import('xlsx');
      const buffer = await file.arrayBuffer();
      const workbook = xlsx.read(buffer, { type: 'array', cellDates: true });
      const firstSheet = workbook.SheetNames[0];
      if (!firstSheet) {
        return [];
      }
      const sheet = workbook.Sheets[firstSheet];
      const rawRows = xlsx.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: '' });
      return rawRows.map((row) => this.mapRow(row)).filter((row) => this.isValidRow(row));
    }

    throw new Error('Unsupported file type. Use CSV/XLSX/XLS.');
  }

  private parseCsv(csvContent: string): ImportEntry[] {
    const lines = csvContent
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean);

    if (lines.length < 2) {
      return [];
    }

    const headers = lines[0].split(',').map((header) => header.trim());
    const rows: ImportEntry[] = [];

    for (let index = 1; index < lines.length; index += 1) {
      const columns = lines[index].split(',').map((column) => column.trim());
      const raw: Record<string, unknown> = {};
      headers.forEach((header, headerIndex) => {
        raw[header] = columns[headerIndex] ?? '';
      });

      const mapped = this.mapRow(raw);
      if (this.isValidRow(mapped)) {
        rows.push(mapped);
      }
    }

    return rows;
  }

  private normalizeHeader(header: string): string {
    return String(header || '')
      .trim()
      .toLowerCase()
      .replace(/[\s\-\/().]+/g, '_')
      .replace(/^_+|_+$/g, '');
  }

  private mapRow(rawRow: Record<string, unknown>): ImportEntry {
    const mapped: Record<string, unknown> = {};
    Object.entries(rawRow).forEach(([key, value]) => {
      mapped[this.normalizeHeader(key)] = value;
    });

    const rawType = String(mapped['type'] || mapped['entry_type'] || '').trim().toLowerCase();
    const type = rawType === 'expenditure' || rawType === 'expense' ? 'Expenditure' : 'Income';

    const rawDate = String(mapped['date'] || mapped['entry_date'] || '').trim();
    const date = this.normalizeDate(rawDate);

    const voucherNumber = String(
      mapped['voucher_number'] ||
      mapped['receipt_voucher_number'] ||
      mapped['receipt_number'] ||
      mapped['voucher_number_no'] ||
      mapped['number'] ||
      ''
    ).trim();

    const accountHead = String(mapped['account_head'] || mapped['account'] || mapped['head'] || '').trim();
    const description = String(mapped['description'] || mapped['remarks'] || mapped['note'] || '').trim();

    const amountRaw = String(mapped['amount'] || mapped['value'] || '').replaceAll(',', '').trim();

    return {
      type,
      date,
      voucher_number: voucherNumber,
      account_head: accountHead,
      description,
      amount: amountRaw
    };
  }

  private normalizeDate(rawDate: string): string {
    if (/^\d{4}-\d{2}-\d{2}$/.test(rawDate)) {
      return rawDate;
    }

    const parsed = new Date(rawDate);
    if (Number.isNaN(parsed.getTime())) {
      return '';
    }

    return parsed.toISOString().slice(0, 10);
  }

  private isValidRow(row: ImportEntry): boolean {
    if (!row.type || !row.date || !row.account_head || !row.amount) {
      return false;
    }
    return !Number.isNaN(Number(row.amount));
  }
}
