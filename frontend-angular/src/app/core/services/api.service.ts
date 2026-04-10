import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse, HttpParams } from '@angular/common/http';
import { catchError, Observable, throwError } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class ApiService {
  private readonly apiBase = '/Expense-Tracking/api';

  constructor(private readonly http: HttpClient) {}

  get<T>(path: string, params?: HttpParams | Record<string, string | number | boolean | null | undefined>): Observable<T> {
    const httpParams = params instanceof HttpParams ? params : this.toHttpParams(params);
    return this.http
      .get<T>(`${this.apiBase}/${path}`, { params: httpParams, withCredentials: true })
      .pipe(catchError((error) => this.handleError(error)));
  }

  postForm<T>(path: string, formData: FormData): Observable<T> {
    return this.http
      .post<T>(`${this.apiBase}/${path}`, formData, { withCredentials: true })
      .pipe(catchError((error) => this.handleError(error)));
  }

  postJson<T>(path: string, body: unknown): Observable<T> {
    return this.http
      .post<T>(`${this.apiBase}/${path}`, body, {
        withCredentials: true,
        headers: { 'Content-Type': 'application/json' }
      })
      .pipe(catchError((error) => this.handleError(error)));
  }

  postBlob(path: string, body: unknown): Observable<Blob> {
    return this.http
      .post(`${this.apiBase}/${path}`, body, {
        withCredentials: true,
        responseType: 'blob'
      })
      .pipe(catchError((error) => this.handleError(error)));
  }

  private toHttpParams(
    params?: Record<string, string | number | boolean | null | undefined>
  ): HttpParams | undefined {
    if (!params) {
      return undefined;
    }

    let httpParams = new HttpParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== null && value !== undefined && value !== '') {
        httpParams = httpParams.set(key, String(value));
      }
    });
    return httpParams;
  }

  private handleError(error: HttpErrorResponse): Observable<never> {
    const message =
      (typeof error.error === 'object' && error.error && 'message' in error.error
        ? String((error.error as { message?: string }).message ?? '')
        : '') ||
      error.message ||
      'Request failed.';

    return throwError(() => new Error(message));
  }
}
