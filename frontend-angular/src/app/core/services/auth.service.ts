import { Injectable, signal } from '@angular/core';
import { map, Observable, of, tap } from 'rxjs';

import { ApiService } from './api.service';
import { User } from '../models/user.model';

interface MeResponse {
  status: 'success' | 'error';
  user?: User;
  message?: string;
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  readonly currentUser = signal<User | null>(null);

  constructor(private readonly api: ApiService) {}

  ensureSession(): Observable<User | null> {
    if (this.currentUser()) {
      return of(this.currentUser());
    }

    return this.api.get<MeResponse>('auth/me.php').pipe(
      map((response) => (response.status === 'success' && response.user ? response.user : null)),
      tap((user) => this.currentUser.set(user))
    );
  }

  login(email: string, password: string): Observable<User | null> {
    const formData = new FormData();
    formData.append('email', email.trim());
    formData.append('password', password);

    return this.api.postForm<MeResponse>('auth/login.php', formData).pipe(
      map((response) => (response.status === 'success' && response.user ? response.user : null)),
      tap((user) => this.currentUser.set(user))
    );
  }

  signup(fullName: string, email: string, password: string): Observable<User | null> {
    const formData = new FormData();
    formData.append('full_name', fullName.trim());
    formData.append('email', email.trim());
    formData.append('password', password);

    return this.api.postForm<MeResponse>('auth/signup.php', formData).pipe(
      map((response) => (response.status === 'success' && response.user ? response.user : null)),
      tap((user) => this.currentUser.set(user))
    );
  }

  logout(): Observable<void> {
    return this.api.postForm<{ status: string }>('auth/logout.php', new FormData()).pipe(
      map(() => undefined),
      tap(() => this.currentUser.set(null))
    );
  }
}
