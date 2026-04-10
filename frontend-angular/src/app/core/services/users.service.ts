import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';

import { ApiService } from './api.service';
import { PagedUsersResponse } from '../models/api.model';

interface UserUpdateResponse {
  status: 'success' | 'error';
  message?: string;
}

export interface UsersFilters {
  page?: number;
  limit?: number;
  search?: string;
  role?: 'all' | 'administrator' | 'staff';
  status?: 'all' | 'active' | 'inactive';
}

export interface CreateUserPayload {
  full_name: string;
  email: string;
  password: string;
  role?: 'administrator' | 'staff';
}

export interface UpdateUserPayload {
  user_id: number;
  full_name: string;
  email: string;
  role: 'administrator' | 'staff';
  is_active: '0' | '1';
  password?: string;
}

interface AvatarResponse {
  status: 'success' | 'error';
  message?: string;
  profile_image?: string | null;
}

@Injectable({ providedIn: 'root' })
export class UsersService {
  constructor(private readonly api: ApiService) {}

  getUsers(filters: UsersFilters): Observable<PagedUsersResponse> {
    return this.api.get<PagedUsersResponse>('auth/list_users.php', {
      mode: 'table',
      page: filters.page ?? 1,
      limit: filters.limit ?? 15,
      search: filters.search ?? '',
      role: filters.role ?? 'all',
      status: filters.status ?? 'all'
    });
  }

  createUser(payload: CreateUserPayload): Observable<UserUpdateResponse> {
    const formData = new FormData();
    formData.append('full_name', payload.full_name.trim());
    formData.append('email', payload.email.trim());
    formData.append('password', payload.password);
    formData.append('role', payload.role ?? 'staff');
    return this.api.postForm<UserUpdateResponse>('auth/signup.php', formData);
  }

  updateUser(payload: UpdateUserPayload): Observable<UserUpdateResponse> {
    const formData = new FormData();
    formData.append('user_id', String(payload.user_id));
    formData.append('full_name', payload.full_name.trim());
    formData.append('email', payload.email.trim());
    formData.append('role', payload.role);
    formData.append('is_active', payload.is_active);
    formData.append('password', payload.password ?? '');
    return this.api.postForm<UserUpdateResponse>('auth/update_user.php', formData);
  }

  uploadAvatar(userId: number, file: File): Observable<AvatarResponse> {
    const formData = new FormData();
    formData.append('user_id', String(userId));
    formData.append('action', 'upload');
    formData.append('profile_image', file);
    return this.api.postForm<AvatarResponse>('auth/upload_avatar.php', formData);
  }

  removeAvatar(userId: number): Observable<AvatarResponse> {
    const formData = new FormData();
    formData.append('user_id', String(userId));
    formData.append('action', 'remove');
    return this.api.postForm<AvatarResponse>('auth/upload_avatar.php', formData);
  }
}
