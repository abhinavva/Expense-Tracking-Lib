import { Injectable } from '@angular/core';
import { map, Observable } from 'rxjs';

import { ApiService } from './api.service';

interface BackupPathResponse {
  status: 'success' | 'error';
  backup_root: string;
  accessible?: boolean;
  message?: string;
}

interface BackupCreateResponse {
  status: 'success' | 'error';
  backup_folder?: string;
  backup_path?: string;
  entries_count?: number;
  users_count?: number;
  deleted_entries?: number;
  backup_period_label?: string;
  message?: string;
}

interface ImportResponse {
  status: 'success' | 'error';
  message?: string;
  stats?: {
    received: number;
    inserted: number;
    duplicates: number;
    invalid: number;
    errors: number;
  };
  errors?: Array<{ row: number; message: string }>;
}

@Injectable({ providedIn: 'root' })
export class BackupService {
  constructor(private readonly api: ApiService) {}

  getBackupPathSettings(): Observable<BackupPathResponse> {
    return this.api.get<BackupPathResponse>('backup_settings.php');
  }

  saveBackupPath(backupRoot: string): Observable<BackupPathResponse> {
    return this.api.postJson<BackupPathResponse>('backup_settings.php', {
      backup_root: backupRoot
    });
  }

  createBackup(payload: {
    delete_after_backup: boolean;
    from_date?: string;
    to_date?: string;
    select_all?: boolean;
  }): Observable<BackupCreateResponse> {
    return this.api.postJson<BackupCreateResponse>('create_backup.php', payload);
  }

  downloadBackup(payload: {
    delete_after_backup: boolean;
    from_date?: string;
    to_date?: string;
  }): Observable<Blob> {
    return this.api.postBlob('download_backup.php', payload);
  }

  exportTally(payload: { from_date?: string; to_date?: string }): Observable<Blob> {
    return this.api.postBlob('export_tally.php', payload);
  }

  importEntries(entries: Array<Record<string, unknown>>): Observable<ImportResponse> {
    return this.api.postJson<ImportResponse>('import_entries.php', { entries });
  }

  inferFilenameFromDisposition(contentDisposition: string | null, fallback: string): string {
    if (!contentDisposition) {
      return fallback;
    }

    const match = contentDisposition.match(/filename="?([^";]+)"?/i);
    if (!match || !match[1]) {
      return fallback;
    }
    return match[1].trim();
  }

  saveBlob(blob: Blob, fileName: string): void {
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  readFileAsArrayBuffer(file: File): Observable<ArrayBuffer> {
    return new Observable<ArrayBuffer>((subscriber) => {
      const reader = new FileReader();
      reader.onload = () => {
        subscriber.next(reader.result as ArrayBuffer);
        subscriber.complete();
      };
      reader.onerror = () => subscriber.error(new Error('Could not read file.'));
      reader.readAsArrayBuffer(file);
    });
  }
}
